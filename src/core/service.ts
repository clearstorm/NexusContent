import type {
  CollectionItem,
  NavigationContent,
  NexusConfig,
  PageContent,
  SettingsContent,
  SingletonContent
} from "./types.ts";
import type { ContentProvider } from "./provider.ts";
import { ProviderRegistry } from "./registry.ts";
import {
  resolveContentConfig,
  resolveNavigationConfig,
  resolveSettingsConfig
} from "./config.ts";
import {
  normalizeCollectionItem,
  normalizeNavigation,
  normalizePage,
  normalizeSettings,
  normalizeSingleton
} from "./normalize.ts";
import {
  validateCollectionItem,
  validateNavigationContent,
  validatePageContent,
  validateSettingsContent,
  validateSingletonContent
} from "../validation/validate.ts";
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

  async getSingleton<TData extends Record<string, unknown> = Record<string, unknown>>(
    contentName: string
  ): Promise<SingletonContent<TData> | null> {
    const entry = resolveContentConfig(this.config, contentName);
    const provider = this.registry.get(entry.provider);

    let singleton: SingletonContent<TData> | null;
    try {
      singleton = await provider.getSingleton<TData>(entry.key);
    } catch (error) {
      throw this.wrapProviderError(error, entry.provider, "getSingleton", contentName);
    }

    if (singleton === null) {
      return null;
    }

    const normalized = normalizeSingleton(singleton, provider.name);
    validateSingletonContent(normalized, {
      provider: provider.name,
      content: contentName
    });

    return normalized;
  }

  async getNavigation(navigationName: string): Promise<NavigationContent | null> {
    const entry = resolveNavigationConfig(this.config, navigationName);
    const provider = this.registry.get(entry.provider);

    let navigation: NavigationContent | null;
    try {
      navigation = await provider.getNavigation(entry.key);
    } catch (error) {
      throw this.wrapProviderError(
        error,
        entry.provider,
        "getNavigation",
        navigationName
      );
    }

    if (navigation === null) {
      return null;
    }

    const normalized = normalizeNavigation(navigation, provider.name);
    validateNavigationContent(normalized, {
      provider: provider.name,
      content: navigationName
    });

    return normalized;
  }

  async getSettings<
    TData extends Record<string, unknown> = Record<string, unknown>
  >(settingsName: string): Promise<SettingsContent<TData> | null> {
    const entry = resolveSettingsConfig(this.config, settingsName);
    const provider = this.registry.get(entry.provider);

    let settings: SettingsContent<TData> | null;
    try {
      settings = await provider.getSettings<TData>(entry.key);
    } catch (error) {
      throw this.wrapProviderError(
        error,
        entry.provider,
        "getSettings",
        settingsName
      );
    }

    if (settings === null) {
      return null;
    }

    const normalized = normalizeSettings(settings, provider.name);
    validateSettingsContent(normalized, {
      provider: provider.name,
      content: settingsName
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
