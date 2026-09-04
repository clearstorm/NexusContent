import { ProviderError } from "../../core/errors.ts";
import type {
  ContentProvider,
  ProviderRetrievalOptions
} from "../../core/provider.ts";
import type {
  ComponentSchema,
  CollectionItem,
  FieldMap,
  NavigationContent,
  PageContent,
  SchemaConfig,
  SettingsContent
} from "../../core/types.ts";
import { WordPressClient } from "./client.ts";
import {
  normalizeWordPressItem,
  normalizeWordPressPage,
  type WordPressContentData,
  type WordPressNormalizeContext
} from "./normalize.ts";
import { WordPressCompanionClient, deriveRestRoot } from "./companion-client.ts";
import {
  COMPANION_WIRE_NAMESPACE,
  type WordPressApiStrategy,
  type WordPressEditorMode,
  type WordPressFixedSectionConfig,
  type WordPressMediaResolution,
  type WordPressUnknownContentPolicy
} from "./config.ts";
import {
  DEFAULT_WORDPRESS_ACF_ENABLED,
  DEFAULT_WORDPRESS_API_STRATEGY,
  DEFAULT_WORDPRESS_EDITOR_MODE,
  DEFAULT_WORDPRESS_MEDIA_RESOLUTION,
  DEFAULT_WORDPRESS_UNKNOWN_CONTENT_POLICY,
  isValidApiStrategy,
  isValidEditorMode,
  isValidMediaResolution,
  isValidUnknownContentPolicy
} from "./config.ts";
import type { WordPressAcfConfig } from "./config.ts";
import {
  buildSectionRegistry,
  type SectionDefinition,
  type SectionRegistry
} from "./sections.ts";
import type {
  WordPressProjectComponentContract,
  WordPressProviderFacingCapabilities,
  WordPressSchemaData,
  WordPressSectionSyncResult
} from "./responses.ts";
import {
  applyInstallOnlyDefinitions,
  reconcileSectionRegistry
} from "./schema-sync.ts";
import {
  validateWordPressComponents,
  type WordPressComponentValidationResult
} from "./schema-validation.ts";

export interface WordPressCollectionConfig {
  endpoint: string;
  /**
   * Optional companion wire route for this collection. `"posts"` maps to the
   * plugin `posts` routes, `"pages"` to the `pages` routes. Custom post types
   * need an explicit mapping; without one the collection resolves through the
   * standard REST endpoint only.
   */
  companionRoute?: "pages" | "posts";
}

export interface WordPressProviderOptions {
  baseUrl: string;
  name?: string;
  headers?: Record<string, string>;
  collections?: Record<string, WordPressCollectionConfig>;
  perPage?: number;
  maxPages?: number;
  timeoutMs?: number;
  editorMode?: WordPressEditorMode;
  defaultEditorMode?: WordPressEditorMode;
  editorModeField?: string;
  apiStrategy?: WordPressApiStrategy;
  unknownContentPolicy?: WordPressUnknownContentPolicy;
  mediaResolution?: WordPressMediaResolution;
  acf?: WordPressAcfConfig;
  fixedSections?: Partial<Record<string, WordPressFixedSectionConfig>>;
  customSections?: ReadonlyArray<SectionDefinition>;
  sectionRegistry?: SectionRegistry;
  sectionBlockNamespaces?: ReadonlyArray<string>;
  includeCoreBlocks?: boolean;
  coreApiNamespace?: string;
  companionApiNamespace?: string;
  strictSectionSync?: boolean;
  componentTypeMap?: Record<string, string>;
  strictFields?: boolean;
}

const DEFAULT_PER_PAGE = 100;
const DEFAULT_MAX_PAGES = 100;
const DEFAULT_TIMEOUT_MS = 10_000;

export class WordPressProvider implements ContentProvider {
  readonly name: string;
  private readonly client: WordPressClient;
  private readonly companion: WordPressCompanionClient | undefined;
  private readonly collections: Map<string, string>;
  private readonly companionRoutes: Map<string, "pages" | "posts">;
  private readonly maxPages: number;
  private readonly perPage: number;
  readonly editorMode: WordPressEditorMode;
  readonly defaultEditorMode: WordPressEditorMode | undefined;
  readonly editorModeField: string | undefined;
  readonly apiStrategy: WordPressApiStrategy;
  readonly unknownContentPolicy: WordPressUnknownContentPolicy;
  readonly mediaResolution: WordPressMediaResolution;
  readonly acfEnabled: boolean;
  readonly sectionRegistry: SectionRegistry | undefined;
  readonly sectionBlockNamespaces: ReadonlyArray<string>;
  readonly includeCoreBlocks: boolean;
  readonly strictSectionSync: boolean;
  readonly componentTypeMap: Record<string, string> | undefined;
  readonly strictFields: boolean;
  private readonly customSections: ReadonlyArray<SectionDefinition>;
  private sectionSync: WordPressSectionSyncResult | undefined;
  private sectionSyncPromise: Promise<WordPressSectionSyncResult | undefined> | undefined;

  constructor(options: WordPressProviderOptions) {
    this.name = options?.name ?? "wordpress";
    const baseUrl = validateBaseUrl(options?.baseUrl, this.name);
    this.perPage = validateIntegerOption(
      options?.perPage ?? DEFAULT_PER_PAGE,
      "perPage",
      this.name,
      100
    );
    this.maxPages = validateIntegerOption(
      options?.maxPages ?? DEFAULT_MAX_PAGES,
      "maxPages",
      this.name
    );
    const timeoutMs = validateIntegerOption(
      options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      "timeoutMs",
      this.name
    );
    this.editorMode = validateEnumOption(
      options?.editorMode ?? DEFAULT_WORDPRESS_EDITOR_MODE,
      "editorMode",
      this.name,
      isValidEditorMode
    );
    this.defaultEditorMode = options?.defaultEditorMode;
    this.editorModeField = options?.editorModeField;
    this.apiStrategy = validateEnumOption(
      options?.apiStrategy ?? DEFAULT_WORDPRESS_API_STRATEGY,
      "apiStrategy",
      this.name,
      isValidApiStrategy
    );
    this.unknownContentPolicy = validateEnumOption(
      options?.unknownContentPolicy ?? DEFAULT_WORDPRESS_UNKNOWN_CONTENT_POLICY,
      "unknownContentPolicy",
      this.name,
      isValidUnknownContentPolicy
    );
    this.mediaResolution = validateEnumOption(
      options?.mediaResolution ?? DEFAULT_WORDPRESS_MEDIA_RESOLUTION,
      "mediaResolution",
      this.name,
      isValidMediaResolution
    );
    this.acfEnabled =
      options?.acf?.enabled ?? DEFAULT_WORDPRESS_ACF_ENABLED;
    this.sectionRegistry = options?.sectionRegistry;
    this.customSections = options?.customSections ?? [];
    this.sectionBlockNamespaces = options?.sectionBlockNamespaces ?? [];
    this.includeCoreBlocks = options?.includeCoreBlocks ?? false;
    this.strictSectionSync = options?.strictSectionSync ?? false;
    this.componentTypeMap = options?.componentTypeMap;
    this.strictFields = options?.strictFields ?? false;

    this.collections = new Map([["posts", "posts"]]);
    this.companionRoutes = new Map([["posts", "posts"]]);
    for (const [collection, config] of Object.entries(options?.collections ?? {})) {
      if (!isRecord(config)) {
        throw configurationError(
          this.name,
          `Collection "${collection}" must define an endpoint.`
        );
      }
      this.collections.set(
        collection,
        validateEndpoint(config.endpoint, this.name, collection)
      );
      if (config.companionRoute !== undefined) {
        if (config.companionRoute !== "pages" && config.companionRoute !== "posts") {
          throw configurationError(
            this.name,
            `Collection "${collection}" has an invalid companionRoute "${String(config.companionRoute)}"; use "pages" or "posts".`
          );
        }
        this.companionRoutes.set(collection, config.companionRoute);
      }
    }

    this.client = new WordPressClient({
      baseUrl,
      headers: { ...(options?.headers ?? {}) },
      providerName: this.name,
      timeoutMs
    });

    if (this.apiStrategy !== "core") {
      const restRoot = deriveRestRoot(baseUrl, this.name);
      this.companion = new WordPressCompanionClient({
        restRoot,
        headers: { ...(options?.headers ?? {}) },
        providerName: this.name,
        timeoutMs
      });
    }
  }

  capabilities(): WordPressProviderFacingCapabilities {
    const synced = this.sectionSync !== undefined;
    return {
      editorMode: this.editorMode,
      gutenberg: this.editorMode === "gutenberg",
      acfFlexible: this.editorMode === "acf_flexible",
      acfFixed: this.editorMode === "acf_fixed",
      acfFields: this.acfEnabled,
      mediaLibrary: this.mediaResolution !== "none",
      customPostTypes: this.collections.size > 1,
      sections: this.sectionRegistry !== undefined,
      sectionSync: !synced
        ? "none"
        : this.sectionSync!.conflicts.length === 0 &&
            this.sectionSync!.registryOnly.length === 0
          ? "synced"
          : "unsynced",
      localeAware: false,
      previewSupport: true,
      webhookSupport: true
    };
  }

  /**
   * Current section-registry reconciliation result, or undefined when the
   * registry has not been reconciled (core strategy, no companion, or no
   * companion retrieval has happened yet).
   */
  schemaStatus(): WordPressSectionSyncResult | undefined {
    return this.sectionSync;
  }

  /**
   * Reconciles the declared section registry against the live companion
   * `/schema` once, caching the result. Safe to call from every companion
   * retrieval path; strict mode throws on conflicts or registry-only types.
   */
  async reconcileSections(
    context: WordPressNormalizeContext
  ): Promise<WordPressSectionSyncResult | undefined> {
    if (this.sectionSyncPromise) return this.sectionSyncPromise;
    if (this.apiStrategy === "core" || !this.companion) {
      this.sectionSyncPromise = Promise.resolve(undefined);
      return this.sectionSyncPromise;
    }

    this.sectionSyncPromise = (async () => {
      const available = await this.companion!.isAvailable();
      if (!available) return undefined;
      let schema: WordPressSchemaData;
      try {
        schema = await this.companion!.getSchema(context);
      } catch {
        // The companion schema is advisory; an unreachable /schema must not
        // break content retrieval. Drift stays unreported ("none") until the
        // schema is reachable again.
        return undefined;
      }
      const registry = this.buildBaseRegistry();
      const result = reconcileSectionRegistry(registry, schema);
      this.sectionSync = result;
      if (
        this.strictSectionSync &&
        (result.conflicts.length > 0 || result.registryOnly.length > 0)
      ) {
        const reasons = [
          ...result.registryOnly.map(
            (type) => `"${type}" is declared but the install does not report it`
          ),
          ...result.conflicts.map(
            (conflict) =>
              `"${conflict.type}" source "${conflict.source}" resolves to "${conflict.installed}" on the install`
          )
        ];
        throw this.error(
          "WordPress section registry is out of sync with the companion install.",
          {
            ...context,
            operation: "reconcileSections"
          },
          `Reason: ${reasons.join("; ")}.`
        );
      }
      return result;
    })();

    return this.sectionSyncPromise;
  }

  /**
   * Validate declared consumer components against the canonical section
   * registry and any reconciled install schema. Unknown component names throw
   * `wordpress/unknown-component`; canonical-field deltas throw when the
   * `strictFields` option is enabled.
   */
  validateComponents(
    components: Readonly<Record<string, ComponentSchema>>
  ): WordPressComponentValidationResult {
    const registry = this.effectiveRegistry();
    const result = validateWordPressComponents(components, {
      registry,
      syncResult: this.sectionSync,
      componentTypeMap: this.componentTypeMap
    });
    if (result.unknownComponents.length > 0) {
      throw this.error(
        "WordPress components cannot be produced by the install.",
        { provider: this.name, operation: "validateComponents", content: "schema" },
        `Unresolvable component names: ${result.unknownComponents.join(", ")}. ` +
          "Declare matching customSections or map them with componentTypeMap."
      );
    }
    if (this.strictFields && result.fieldDeltas.length > 0) {
      const deltas = result.fieldDeltas.map(
        (delta) =>
          `"${delta.component}" differs from "${delta.sectionType}": ` +
          `missing [${delta.missingFields.join(", ")}], extra [${delta.extraFields.join(", ")}]`
      );
      throw this.error(
        "WordPress component fields do not match the canonical section schema.",
        { provider: this.name, operation: "validateComponents", content: "schema" },
        deltas.join("; ")
      );
    }
    return result;
  }

  /**
   * Derive the serializable project component contract from a consumer schema
   * config: declared component names plus the canonical section types they
   * resolve to. This is what a consumer pushes to the companion plugin.
   */
  projectComponentContract(schema: SchemaConfig): WordPressProjectComponentContract {
    const used = new Set<string>();
    for (const model of Object.values(schema.models)) {
      if (model.fields) collectUsedComponents(model.fields, used);
    }
    for (const name of Object.keys(schema.components ?? {})) {
      used.add(name);
    }

    const registry = this.effectiveRegistry();
    const components = [...used].sort();
    const sectionTypes = new Set<string>();
    for (const component of components) {
      const mapped = this.componentTypeMap?.[component] ?? component;
      const entry = registry.get(mapped);
      if (entry !== undefined) sectionTypes.add(entry.definition.type);
    }

    return {
      components,
      sectionTypes: [...sectionTypes].sort()
    };
  }

  /**
   * Resolve the effective editor mode for a given raw WordPress entry.
   * Resolution order: page-level field → defaultEditorMode → editorMode → "gutenberg" (v0.2.0 compat).
   */
  resolveEditorMode(raw: Record<string, unknown>): WordPressEditorMode {
    if (this.editorModeField) {
      const rawMode = raw[this.editorModeField];
      if (typeof rawMode === "string" && isValidEditorMode(rawMode)) {
        return rawMode;
      }
    }
    if (this.defaultEditorMode !== undefined) {
      return this.defaultEditorMode;
    }
    return this.editorMode;
  }

  /**
   * Returns true if the given editor mode allows Gutenberg block parsing.
   */
  shouldParseGutenberg(mode: WordPressEditorMode): boolean {
    return mode === "gutenberg";
  }

  /**
   * Returns true if the given editor mode allows ACF flexible content parsing.
   */
  shouldParseAcfFlexible(mode: WordPressEditorMode): boolean {
    return mode === "acf_flexible";
  }

  /**
   * Returns true if the given editor mode allows ACF fixed field parsing.
   */
  shouldParseAcfFixed(mode: WordPressEditorMode): boolean {
    return mode === "acf_fixed";
  }

  /**
   * Apply the unknown content policy to a section type that is not recognized.
   * Returns the appropriate action: "throw", "skip", or "raw".
   */
  applyUnknownContentPolicy(sectionType: string): "throw" | "skip" | "raw" {
    switch (this.unknownContentPolicy) {
      case "error":
        return "throw";
      case "ignore":
        return "skip";
      case "html":
        return "raw";
    }
  }

  async getPage<TData = WordPressContentData>(
    key: string,
    _options: ProviderRetrievalOptions = {}
  ): Promise<PageContent<TData> | null> {
    const context = this.context("getPage", key);

    if (this.apiStrategy === "companion" || this.apiStrategy === "auto") {
      const available = await this.companion?.isAvailable() ?? false;
      if (available) {
        await this.reconcileSections(context);
        return this.companion!.getPage(key, context) as Promise<PageContent<TData> | null>;
      }
      if (this.apiStrategy === "companion") {
        throw this.error(
          "Companion plugin is not available.",
          context,
          "Strategy is \"companion\" but the plugin was not detected."
        );
      }
    }

    return this.coreGetPage(key, context) as Promise<PageContent<TData> | null>;
  }

  getNavigation(
    _key: string,
    _options: ProviderRetrievalOptions = {}
  ): Promise<NavigationContent | null> {
    return Promise.resolve(null);
  }

  getSettings<TData = Record<string, unknown>>(
    _key: string,
    _options: ProviderRetrievalOptions = {}
  ): Promise<SettingsContent<TData> | null> {
    return Promise.resolve(null);
  }

  async getCollection<TData = WordPressContentData>(
    collection: string,
    _options: ProviderRetrievalOptions = {}
  ): Promise<CollectionItem<TData>[]> {
    const endpoint = this.resolveCollection(collection, "getCollection");
    const context = this.context("getCollection", collection);
    const companionRoute = this.companionRoutes.get(collection);

    if (this.apiStrategy === "companion" || this.apiStrategy === "auto") {
      const available = await this.companion?.isAvailable() ?? false;
      if (available && companionRoute) {
        await this.reconcileSections(context);
        return this.companion!.getPages(collection, companionRoute, this.perPage, context) as Promise<CollectionItem<TData>[]>;
      }
      if (this.apiStrategy === "companion") {
        if (!companionRoute) {
          throw this.error(
            "Companion has no route for this collection.",
            context,
            `Collection "${collection}" resolves to REST endpoint "${endpoint}"; map it explicitly via "companionRoute".`
          );
        }
        throw this.error(
          "Companion plugin is not available.",
          context,
          "Strategy is \"companion\" but the plugin was not detected."
        );
      }
    }

    return this.coreGetCollection(endpoint, context) as Promise<CollectionItem<TData>[]>;
  }

  async getItem<TData = WordPressContentData>(
    collection: string,
    key: string,
    _options: ProviderRetrievalOptions = {}
  ): Promise<CollectionItem<TData> | null> {
    const endpoint = this.resolveCollection(collection, "getItem");
    const context = this.context("getItem", `${collection}/${key}`);
    const companionRoute = this.companionRoutes.get(collection);

    if (this.apiStrategy === "companion" || this.apiStrategy === "auto") {
      const available = await this.companion?.isAvailable() ?? false;
      if (available && companionRoute) {
        await this.reconcileSections(context);
        return this.companion!.getItem(collection, companionRoute, key, context) as Promise<CollectionItem<TData> | null>;
      }
      if (this.apiStrategy === "companion") {
        if (!companionRoute) {
          throw this.error(
            "Companion has no route for this collection.",
            context,
            `Collection "${collection}" resolves to REST endpoint "${endpoint}"; map it explicitly via "companionRoute".`
          );
        }
        throw this.error(
          "Companion plugin is not available.",
          context,
          "Strategy is \"companion\" but the plugin was not detected."
        );
      }
    }

    const response = await this.client.request(
      endpoint,
      { slug: key, per_page: 1, _embed: "wp:featuredmedia" },
      context
    );
    const raw = this.readLookupResult(response.data, context);
    if (raw === null) {
      return null;
    }

    return normalizeWordPressItem(
      raw,
      this.normalizeContext(raw, context)
    ) as unknown as CollectionItem<TData>;
  }

  private async loadCollectionPage(
    endpoint: string,
    page: number,
    context: WordPressNormalizeContext
  ): Promise<{ items: unknown[]; headers: Headers }> {
    const response = await this.client.request(
      endpoint,
      {
        per_page: this.perPage,
        page,
        _embed: "wp:featuredmedia"
      },
      context
    );

    if (!Array.isArray(response.data)) {
      throw this.error(
        "WordPress returned an invalid collection payload.",
        context,
        `Expected an array from endpoint "${endpoint}".`
      );
    }

    return { items: response.data, headers: response.headers };
  }

  private async coreGetPage(
    key: string,
    context: WordPressNormalizeContext
  ): Promise<PageContent | null> {
    const response = await this.client.request(
      "pages",
      { slug: key, per_page: 1, _embed: "wp:featuredmedia" },
      context
    );
    const raw = this.readLookupResult(response.data, context);
    if (raw === null) {
      return null;
    }

    return normalizeWordPressPage(raw, key, this.normalizeContext(raw, context));
  }

  private async coreGetCollection(
    endpoint: string,
    context: WordPressNormalizeContext
  ): Promise<CollectionItem[]> {
    const first = await this.loadCollectionPage(endpoint, 1, context);
    const pagination = this.readPagination(first.headers, endpoint, context);

    if (pagination.totalPages > this.maxPages) {
      throw this.error(
        "WordPress collection exceeds the configured page limit.",
        context,
        `Endpoint "${endpoint}" requires ${pagination.totalPages} pages; maxPages is ${this.maxPages}.`
      );
    }
    this.validatePageSize(first.items.length, 1, pagination, endpoint, context);

    const rawItems = [...first.items];
    for (let page = 2; page <= pagination.totalPages; page += 1) {
      const response = await this.loadCollectionPage(endpoint, page, context);
      const nextPagination = this.readPagination(response.headers, endpoint, context);
      if (
        nextPagination.total !== pagination.total ||
        nextPagination.totalPages !== pagination.totalPages
      ) {
        throw this.error(
          "WordPress returned inconsistent pagination headers.",
          context,
          `Pagination totals changed while requesting endpoint "${endpoint}".`
        );
      }
      this.validatePageSize(
        response.items.length,
        page,
        pagination,
        endpoint,
        context
      );
      rawItems.push(...response.items);
    }

    if (rawItems.length !== pagination.total) {
      throw this.error(
        "WordPress returned an inconsistent collection size.",
        context,
        `Endpoint "${endpoint}" reported ${pagination.total} items but returned ${rawItems.length}.`
      );
    }

    return rawItems.map(
      (raw) =>
        normalizeWordPressItem(
          raw,
          this.normalizeContext(raw, context)
        ) as unknown as CollectionItem
    );
  }

  private readLookupResult(
    data: unknown,
    context: WordPressNormalizeContext
  ): unknown | null {
    if (!Array.isArray(data)) {
      throw this.error(
        "WordPress returned an invalid lookup payload.",
        context,
        "Expected a JSON array for a slug lookup."
      );
    }
    if (data.length === 0) {
      return null;
    }
    if (data.length !== 1) {
      throw this.error(
        "WordPress returned an ambiguous slug lookup.",
        context,
        "Expected at most one item for a slug lookup."
      );
    }
    return data[0];
  }

  private readPagination(
    headers: Headers,
    endpoint: string,
    context: WordPressNormalizeContext
  ): { total: number; totalPages: number } {
    const total = readPaginationHeader(headers, "X-WP-Total");
    const totalPages = readPaginationHeader(headers, "X-WP-TotalPages");
    if (total === null || totalPages === null) {
      throw this.error(
        "WordPress returned invalid pagination headers.",
        context,
        `Endpoint "${endpoint}" must return non-negative integer X-WP-Total and X-WP-TotalPages headers.`
      );
    }

    const expectedPages = total === 0 ? 0 : Math.ceil(total / this.perPage);
    if (totalPages !== expectedPages) {
      throw this.error(
        "WordPress returned inconsistent pagination headers.",
        context,
        `Endpoint "${endpoint}" reported totals that do not match perPage ${this.perPage}.`
      );
    }

    return { total, totalPages };
  }

  private resolveCollection(collection: string, operation: string): string {
    const endpoint = this.collections.get(collection);
    if (endpoint === undefined) {
      throw new ProviderError(
        `Unknown WordPress collection "${collection}".`,
        {
          provider: this.name,
          operation,
          content: collection,
          reason: "Only posts and explicitly configured collections are supported."
        }
      );
    }
    return endpoint;
  }

  private validatePageSize(
    itemCount: number,
    page: number,
    pagination: { total: number; totalPages: number },
    endpoint: string,
    context: WordPressNormalizeContext
  ): void {
    const expected =
      page < pagination.totalPages
        ? this.perPage
        : pagination.total - this.perPage * Math.max(0, pagination.totalPages - 1);
    if (itemCount !== expected) {
      throw this.error(
        "WordPress returned an inconsistent collection page.",
        context,
        `Endpoint "${endpoint}" page ${page} reported ${expected} items but returned ${itemCount}.`
      );
    }
  }

  private context(operation: string, content: string): WordPressNormalizeContext {
    return { provider: this.name, operation, content };
  }

  /**
   * Wrap a retrieval context with the entry's resolved editor mode and the
   * provider options the section extractors need, so core-strategy retrieval
   * emits canonical `data.sections` for pages and collection items.
   */
  private normalizeContext(
    raw: unknown,
    context: WordPressNormalizeContext
  ): WordPressNormalizeContext {
    return {
      ...context,
      editorMode: isRecord(raw) ? this.resolveEditorMode(raw) : this.editorMode,
      includeCoreBlocks: this.includeCoreBlocks,
      unknownContentPolicy: this.unknownContentPolicy
    };
  }

  private buildBaseRegistry(): SectionRegistry {
    return this.sectionRegistry ?? buildSectionRegistry({ customSections: this.customSections });
  }

  private effectiveRegistry(): SectionRegistry {
    const base = this.buildBaseRegistry();
    return this.sectionSync
      ? applyInstallOnlyDefinitions(base, this.sectionSync)
      : base;
  }

  private error(
    message: string,
    context: WordPressNormalizeContext,
    reason: string
  ): ProviderError {
    return new ProviderError(message, { ...context, reason });
  }
}

function validateBaseUrl(value: unknown, provider: string): URL {
  if (typeof value !== "string" || value.length === 0) {
    throw configurationError(provider, "baseUrl is required.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw configurationError(provider, "baseUrl must be a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw configurationError(provider, "baseUrl must use http or https.");
  }
  if (url.username || url.password) {
    throw configurationError(provider, "baseUrl must not contain credentials.");
  }
  if (value.includes("?") || value.includes("#")) {
    throw configurationError(provider, "baseUrl must not contain a query or hash.");
  }

  return url;
}

function validateEndpoint(
  value: unknown,
  provider: string,
  collection: string
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw configurationError(
      provider,
      `Collection "${collection}" requires an endpoint.`
    );
  }

  const segments = value.split("/");
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        !/^[A-Za-z0-9._~-]+$/.test(segment)
    )
  ) {
    throw configurationError(
      provider,
      `Collection "${collection}" has an invalid endpoint path.`
    );
  }

  return value;
}

function validateIntegerOption(
  value: unknown,
  option: string,
  provider: string,
  maximum?: number
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0 ||
    (maximum !== undefined && value > maximum)
  ) {
    const range = maximum === undefined ? "a positive integer" : `an integer from 1 to ${maximum}`;
    throw configurationError(provider, `${option} must be ${range}.`);
  }
  return value;
}

function readPaginationHeader(headers: Headers, name: string): number | null {
  const value = headers.get(name);
  if (value === null || !/^(0|[1-9]\d*)$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function collectUsedComponents(fields: FieldMap, out: Set<string>): void {
  for (const field of Object.values(fields)) {
    switch (field.type) {
      case "component":
        out.add(field.component);
        break;
      case "blocks":
        for (const component of field.allowedComponents ?? []) {
          out.add(component);
        }
        break;
      case "object":
        if (field.fields) collectUsedComponents(field.fields, out);
        break;
    }
  }
}

function validateEnumOption<T extends string>(
  value: T,
  option: string,
  provider: string,
  predicate: (v: string) => v is T
): T {
  if (!predicate(value)) {
    throw configurationError(provider, `${option} has an invalid value.`);
  }
  return value;
}

function configurationError(provider: string, reason: string): ProviderError {
  return new ProviderError("Invalid WordPress provider configuration.", {
    provider,
    operation: "constructor",
    reason
  });
}
