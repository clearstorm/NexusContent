import type { CollectionItem, PageContent, NexusConfig } from "./types.ts";
import type { ContentProvider } from "./provider.ts";
import { ProviderRegistry } from "./registry.ts";
import { resolveContentConfig } from "./config.ts";
import { normalizeCollectionItem, normalizePage } from "./normalize.ts";
import { validateCollectionItem, validatePageContent } from "../validation/validate.ts";
import { NexusContentError, ProviderError } from "./errors.ts";

export class NexusContent {
  private readonly config: NexusConfig;
  private readonly registry: ProviderRegistry;

  constructor(
    config: NexusConfig,
    registry: ProviderRegistry = new ProviderRegistry()
  ) {
    this.config = config;
    this.registry = registry;
  }

  register(name: string, provider: ContentProvider): this {
    this.registry.register(name, provider);
    return this;
  }

  async getPage<TData extends Record<string, unknown> = Record<string, unknown>>(
    contentName: string
  ): Promise<PageContent<TData> | null> {
    const entry = resolveContentConfig(this.config, contentName);
    const provider = this.registry.get(entry.provider);

    let page: PageContent<TData> | null;
    try {
      page = await provider.getPage<TData>(entry.key);
    } catch (error) {
      throw this.wrapProviderError(error, entry.provider, "getPage", contentName);
    }

    if (page === null) {
      return null;
    }

    const normalized = normalizePage(page, provider.name);
    validatePageContent(normalized, {
      provider: provider.name,
      content: contentName
    });

    return normalized;
  }

  async getCollection<TData extends Record<string, unknown> = Record<string, unknown>>(
    collectionName: string
  ): Promise<CollectionItem<TData>[]> {
    const entry = resolveContentConfig(this.config, collectionName);
    const provider = this.registry.get(entry.provider);

    let items: CollectionItem<TData>[];
    try {
      items = await provider.getCollection<TData>(entry.key);
    } catch (error) {
      throw this.wrapProviderError(error, entry.provider, "getCollection", collectionName);
    }

    return items.map((item) => {
      const normalized = normalizeCollectionItem(item, provider.name);
      validateCollectionItem(normalized, {
        provider: provider.name,
        content: collectionName
      });
      return normalized;
    });
  }

  async getItem<TData extends Record<string, unknown> = Record<string, unknown>>(
    collectionName: string,
    key: string
  ): Promise<CollectionItem<TData> | null> {
    const entry = resolveContentConfig(this.config, collectionName);
    const provider = this.registry.get(entry.provider);

    let item: CollectionItem<TData> | null;
    try {
      item = await provider.getItem<TData>(entry.key, key);
    } catch (error) {
      throw this.wrapProviderError(error, entry.provider, "getItem", collectionName);
    }

    if (item === null) {
      return null;
    }

    const normalized = normalizeCollectionItem(item, provider.name);
    validateCollectionItem(normalized, {
      provider: provider.name,
      content: collectionName
    });

    return normalized;
  }

  private wrapProviderError(
    error: unknown,
    provider: string,
    operation: string,
    content: string
  ): NexusContentError {
    if (error instanceof NexusContentError) {
      return error;
    }

    const reason = error instanceof Error ? error.message : String(error);

    return new ProviderError(
      `Provider "${provider}" failed during "${operation}".`,
      { provider, operation, content, reason }
    );
  }
}
