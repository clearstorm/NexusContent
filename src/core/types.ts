export type ContentSource = string;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export interface MediaSize {
  url: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

/**
 * A normalized media asset. `src` is the resolved display URL.
 *
 * Media providers that resolve media references always set `provider` and
 * `sourceId`. Content-embedded media produced by content providers may omit
 * them until a media provider resolves the reference.
 */
export interface MediaAsset {
  id?: string;
  src: string;
  alt?: string;
  caption?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizes?: Record<string, MediaSize>;
  provider?: string;
  sourceId?: string;
}

/**
 * Provider neutral media reference. At least one of `id` or `src` is
 * required; `provider` overrides the project default media provider.
 */
export interface MediaReference {
  provider?: string;
  id?: string;
  src?: string;
}

export interface SeoRobots {
  index?: boolean;
  follow?: boolean;
}

export interface SeoOpenGraph {
  title?: string;
  description?: string;
  image?: MediaAsset;
  type?: string;
}

export interface SeoTwitter {
  card?: "summary" | "summary_large_image";
  title?: string;
  description?: string;
  image?: MediaAsset;
}

export interface SeoData {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  /** @deprecated Use `canonicalUrl` instead. */
  canonical?: string;
  robots?: SeoRobots;
  openGraph?: SeoOpenGraph;
  twitter?: SeoTwitter;
  structuredData?: JsonObject[];
}

export interface ContentMeta {
  source: ContentSource;
  sourceId?: string;
  updatedAt?: string;
  /**
   * The locale whose variant actually resolved when locale-aware retrieval
   * is configured. Absent for projects without locale configuration.
   */
  locale?: string;
}

export interface SingletonContent<TData = Record<string, unknown>> {
  id: string;
  key: string;
  data: TData;
  meta: ContentMeta;
}

export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
}

export interface NavigationContent {
  id: string;
  key: string;
  items: NavigationItem[];
  meta: ContentMeta;
}

export interface SettingsContent<TData = Record<string, unknown>> {
  id: string;
  key: string;
  data: TData;
  meta: ContentMeta;
}

export type PageStatus = "draft" | "published" | "archived";

export interface SectionSettings {
  readonly visible?: boolean;
  readonly background?: string;
  readonly containerClass?: string;
  readonly [key: string]: JsonValue | undefined;
}

export interface ContentSection<TData = Record<string, unknown>> {
  readonly id?: string;
  readonly type: string;
  readonly settings?: SectionSettings;
  readonly data: TData;
}

export interface PageContent<TData = Record<string, unknown>> {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  status?: PageStatus;
  excerpt?: string;
  featuredImage?: MediaAsset;
  modifiedAt?: string;
  sections?: ContentSection[];
  seo?: SeoData;
  data: TData;
  meta: ContentMeta;
}

export interface CollectionItem<TData = Record<string, unknown>> {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  data: TData;
  meta: ContentMeta;
}

export interface ProviderConfig {
  readonly type: string;
  readonly options?: Record<string, unknown>;
}

/**
 * A media provider declaration. Core auto-builds the framework-neutral
 * built-ins (`local` and `remote`) from these entries. Other types (for
 * example `wordpress`) must be registered by the consumer through
 * `registerMedia`.
 */
export interface MediaProviderConfig {
  readonly type: string;
  readonly options?: Record<string, unknown>;
}

export interface MediaConfig {
  readonly default?: string;
  readonly providers: Readonly<Record<string, MediaProviderConfig>>;
}

/**
 * Localisation configuration for the content service.
 *
 * `default` must be listed in `supported`. `fallback` maps a source locale to
 * either another supported locale or `null` (meaning no fallback). When a
 * locale has no explicit fallback entry, resolution falls back to the
 * configured default locale. Fallback chains must not be circular.
 */
export interface LocaleConfig {
  readonly default: string;
  readonly supported: readonly string[];
  readonly fallback?: Readonly<Record<string, string | null>>;
}

/**
 * Options accepted by every retrieval method on `NexusContent`.
 *
 * `locale` selects the requested variant and defaults to the configured
 * default locale. `fallback` (default `true`) enables fallback-chain
 * resolution; setting it to `false` enables strict resolution, which requires
 * the requested variant to exist and throws a `MissingLocaleVariantError`
 * when it does not.
 */
export interface RetrievalOptions {
  locale?: string;
  fallback?: boolean;
}

/**
 * Translation state vocabulary. This type is the 0.1.3 foundation for a
 * future translation workflow; it is not wired into content retrieval yet.
 */
export type TranslationState =
  | "missing"
  | "draft"
  | "translated"
  | "reviewed"
  | "published"
  | "outdated";

/**
 * Documented extension point for per-locale variant metadata. It exists so a
 * future translation workflow has a stable shape to report against; no
 * retrieval path produces it in 0.1.3.
 */
export interface LocaleVariantInfo {
  locale: string;
  state: TranslationState;
  updatedAt?: string;
  sourceId?: string;
}

export type ModelKind = "singleton" | "collection" | "navigation" | "settings";

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "datetime"
  | "object"
  | "reference"
  | "media"
  | "richText";

export interface BaseFieldSchema {
  readonly required?: boolean;
  readonly list?: boolean;
}

export interface StringFieldSchema extends BaseFieldSchema {
  readonly type: "string";
  readonly options?: readonly string[];
}

export interface NumberFieldSchema extends BaseFieldSchema {
  readonly type: "number";
}

export interface BooleanFieldSchema extends BaseFieldSchema {
  readonly type: "boolean";
}

export interface DatetimeFieldSchema extends BaseFieldSchema {
  readonly type: "datetime";
}

export interface ObjectFieldSchema extends BaseFieldSchema {
  readonly type: "object";
  readonly fields?: FieldMap;
}

export interface ReferenceFieldSchema extends BaseFieldSchema {
  readonly type: "reference";
  readonly collection: string;
}

export interface MediaFieldSchema extends BaseFieldSchema {
  readonly type: "media";
  readonly media?: string;
}

export interface RichTextFieldSchema extends BaseFieldSchema {
  readonly type: "richText";
}

export type FieldSchema =
  | StringFieldSchema
  | NumberFieldSchema
  | BooleanFieldSchema
  | DatetimeFieldSchema
  | ObjectFieldSchema
  | ReferenceFieldSchema
  | MediaFieldSchema
  | RichTextFieldSchema;

/**
 * A declarative field map. Concrete literal configs assigned through
 * `satisfies FieldMap` keep literal field shapes for type inference.
 */
export type FieldMap = Readonly<Record<string, FieldSchema>>;

/**
 * A provider neutral reference to a collection item. `key` must match the
 * `key` of an item in the referenced collection model.
 */
export interface ContentReference {
  model: string;
  key: string;
}

/**
 * Declares where a model's content is retrieved. `mode` is valid only for
 * `singleton` models: `"page"` routes to the provider's `getPage` operation
 * (Git `pages/<key>.json`, WordPress pages), `"singleton"` (the default)
 * routes to `getSingleton` (Git `singletons/<key>.json`).
 */
export interface ModelSource {
  readonly provider: string;
  readonly key: string;
  readonly mode?: "page" | "singleton";
}

export interface ModelSchema {
  readonly kind: ModelKind;
  readonly source: ModelSource;
  readonly fields?: FieldMap;
}

export interface SchemaConfig {
  readonly models: Readonly<Record<string, ModelSchema>>;
}

export interface NexusConfig {
  readonly providers?: Readonly<Record<string, ProviderConfig>>;
  readonly media?: MediaConfig;
  readonly schema: SchemaConfig;
  readonly locales?: LocaleConfig;
}
