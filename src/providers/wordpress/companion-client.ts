import { ProviderError } from "../../core/errors.ts";
import type { CollectionItem, PageContent } from "../../core/types.ts";
import { WordPressClient } from "./client.ts";
import {
  normalizeCompanionPage,
  normalizeCompanionPageItem
} from "./companion-normalize.ts";
import {
  companionCapabilitiesResponseSchema,
  companionPageResponseSchema,
  companionPagesResponseSchema
} from "./companion-schemas.ts";
import { COMPANION_CONTRACT_VERSION, COMPANION_WIRE_NAMESPACE } from "./config.ts";
import type { WordPressNormalizeContext } from "./normalize.ts";
import { isValidCompanionContractVersion } from "./responses.ts";
import type { WordPressSchemaData } from "./responses.ts";
import { companionSchemaResponseSchema } from "./companion-schemas.ts";

export interface WordPressCompanionClientOptions {
  restRoot: URL;
  headers: Record<string, string>;
  providerName: string;
  timeoutMs: number;
}

export class WordPressCompanionClient {
  private readonly client: WordPressClient;
  private readonly providerName: string;
  private discovery: Promise<boolean> | undefined;
  private negotiatedVersion: typeof COMPANION_CONTRACT_VERSION | undefined;
  private schemaCache: Promise<WordPressSchemaData> | undefined;

  constructor(options: WordPressCompanionClientOptions) {
    const companionBaseUrl = new URL(
      `${COMPANION_WIRE_NAMESPACE}/`,
      options.restRoot
    );
    this.client = new WordPressClient({
      baseUrl: companionBaseUrl,
      headers: options.headers,
      providerName: options.providerName,
      timeoutMs: options.timeoutMs
    });
    this.providerName = options.providerName;
    this.discovery = this.createDiscovery();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.discovery) return false;
    return this.discovery;
  }

  async getPage(
    key: string,
    context: WordPressNormalizeContext
  ): Promise<PageContent | null> {
    let response;
    try {
      response = await this.client.request(
        `pages/slug/${encodeURIComponent(key)}`,
        {},
        context,
        { skipStatus: true }
      );
    } catch (error: unknown) {
      if (isCompanionNotFound(error)) return null;
      throw error;
    }
    const result = companionPageResponseSchema.safeParse(response.data);
    if (!result.success) {
      throw this.error(
        "Companion returned an invalid page response.",
        context,
        `Page "${key}" response did not match the expected contract.`
      );
    }
    return normalizeCompanionPage(result.data.data, key);
  }

  async getPages(
    collection: string,
    route: "pages" | "posts",
    perPage: number,
    context: WordPressNormalizeContext
  ): Promise<CollectionItem[]> {
    const response = await this.client.request(
      route,
      { per_page: perPage },
      context,
      { skipStatus: true }
    );
    const result = companionPagesResponseSchema.safeParse(response.data);
    if (!result.success) {
      throw this.error(
        "Companion returned an invalid pages response.",
        context,
        `Collection "${collection}" response did not match the expected contract.`
      );
    }
    return result.data.data.items.map(normalizeCompanionPageItem);
  }

  async getItem(
    collection: string,
    route: "pages" | "posts",
    key: string,
    context: WordPressNormalizeContext
  ): Promise<CollectionItem | null> {
    let response;
    try {
      response = await this.client.request(
        `${route}/slug/${encodeURIComponent(key)}`,
        {},
        context,
        { skipStatus: true }
      );
    } catch (error: unknown) {
      if (isCompanionNotFound(error)) return null;
      throw error;
    }
    const result = companionPageResponseSchema.safeParse(response.data);
    if (!result.success) {
      throw this.error(
        "Companion returned an invalid page response.",
        context,
        `Item "${collection}/${key}" response did not match the expected contract.`
      );
    }
    return normalizeCompanionPageItem(result.data.data);
  }

  async getSchema(
    context: WordPressNormalizeContext
  ): Promise<WordPressSchemaData> {
    if (this.schemaCache) return this.schemaCache;
    this.schemaCache = this.fetchSchema(context);
    return this.schemaCache;
  }

  getNegotiatedVersion(): typeof COMPANION_CONTRACT_VERSION | undefined {
    return this.negotiatedVersion;
  }

  private async fetchSchema(
    context: WordPressNormalizeContext
  ): Promise<WordPressSchemaData> {
    const response = await this.client.request(
      "schema",
      {},
      context,
      { skipStatus: true }
    );
    const result = companionSchemaResponseSchema.safeParse(response.data);
    if (!result.success) {
      throw this.error(
        "Companion returned an invalid schema response.",
        context,
        "Schema response did not match the expected contract."
      );
    }
    return result.data.data as WordPressSchemaData;
  }

  private createDiscovery(): Promise<boolean> {
    const context = this.context("discoverCompanionCapabilities", "capabilities");
    return this.client
      .request("capabilities", {}, context, { skipStatus: true })
      .then((response) => {
        const envelope = response.data as Record<string, unknown> | undefined;
        if (envelope && typeof envelope === "object" && "contractVersion" in envelope) {
          if (!isValidCompanionContractVersion(envelope.contractVersion)) {
            throw this.error(
              "Companion plugin contract version is not supported.",
              context,
              `Expected contract version ${COMPANION_CONTRACT_VERSION} but received ${String(envelope.contractVersion)}.`
            );
          }
          this.negotiatedVersion = envelope.contractVersion as typeof COMPANION_CONTRACT_VERSION;
        }
        const result = companionCapabilitiesResponseSchema.safeParse(response.data);
        if (!result.success) return false;
        return true;
      })
      .catch((error) => {
        if (isCompanionNotFound(error)) return false;
        throw error;
      });
  }

  private context(operation: string, content: string): WordPressNormalizeContext {
    return { provider: this.providerName, operation, content };
  }

  private error(
    message: string,
    context: WordPressNormalizeContext,
    reason: string
  ): ProviderError {
    return new ProviderError(message, { ...context, reason });
  }
}

function isCompanionNotFound(error: unknown): boolean {
  if (!(error instanceof ProviderError)) return false;
  return /HTTP 404/.test(`${error.message}\n${error.reason ?? ""}`);
}

export function deriveRestRoot(baseUrl: URL, provider: string): URL {
  const wpJson = "/wp-json/";
  const idx = baseUrl.pathname.indexOf(wpJson);
  if (idx === -1) {
    throw new ProviderError("Invalid WordPress provider configuration.", {
      provider,
      operation: "constructor",
      reason: "baseUrl must contain /wp-json/ for companion strategy."
    });
  }
  const root = baseUrl.pathname.substring(0, idx + wpJson.length);
  return new URL(root, `${baseUrl.protocol}//${baseUrl.host}`);
}
