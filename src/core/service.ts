import type {
  CollectionItem,
  NavigationContent,
  NexusConfig,
  PageContent,
  RetrievalOptions,
  SettingsContent,
  SingletonContent
} from "./types.ts";
import type { ContentProvider, ProviderRetrievalOptions } from "./provider.ts";
import { ProviderRegistry } from "./registry.ts";
import { LocaleResolver } from "./locale.ts";
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
import { LocaleError, NexusContentError, ProviderError } from "./errors.ts";

export class NexusContent {
  private readonly config: NexusConfig;
  private readonly registry: ProviderRegistry;
  private readonly localesConfigured: boolean;
  private readonly localeResolver: LocaleResolver;

  constructor(
    config: NexusConfig,
    registry: ProviderRegistry = new ProviderRegistry()
  ) {
    this.config = config;
    this.registry = registry;
    this.localesConfigured = config.locales !== undefined;
    // Config validation fails fast here so misconfigured locales surface at
    // construction time rather than during a build.
    this.localeResolver = new LocaleResolver(config.locales);
  }

  register(name: string, provider: ContentProvider): this {
    this.registry.register(name, provider);
    return this;
  }

  async getPage<TData extends Record<string, unknown> = Record<string, unknown>>(
    contentName: string,
    options: RetrievalOptions = {}
  ): Promise<PageContent<TData> | null> {
    const entry = resolveContentConfig(this.config, contentName);
    const provider = this.registry.get(entry.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let page: PageContent<TData> | null;
    try {
      page = await provider.getPage<TData>(entry.key, providerOptions);
    } catch (error) {
      throw this.wrapProviderError(error, entry.provider, "getPage", contentName);
    }

    if (page === null) {
      return null;
    }

    const normalized = normalizePage(page, provider.name);
    validatePageContent(normalized, {
      provider: provider.name,
      content: contentName,
      locale: providerOptions?.locale
    });

    return normalized;
  }

  async getSingleton<TData extends Record<string, unknown> = Record<string, unknown>>(
    contentName: string,
    options: RetrievalOptions = {}
  ): Promise<SingletonContent<TData> | null> {
    const entry = resolveContentConfig(this.config, contentName);
    const provider = this.registry.get(entry.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let singleton: SingletonContent<TData> | null;
    try {
      singleton = await provider.getSingleton<TData>(entry.key, providerOptions);
    } catch (error) {
      throw this.wrapProviderError(error, entry.provider, "getSingleton", contentName);
    }

    if (singleton === null) {
      return null;
    }

    const normalized = normalizeSingleton(singleton, provider.name);
    validateSingletonContent(normalized, {
      provider: provider.name,
      content: contentName,
      locale: providerOptions?.locale
    });

    return normalized;
  }

  async getNavigation(
    navigationName: string,
    options: RetrievalOptions = {}
  ): Promise<NavigationContent | null> {
    const entry = resolveNavigationConfig(this.config, navigationName);
    const provider = this.registry.get(entry.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let navigation: NavigationContent | null;
    try {
      navigation = await provider.getNavigation(entry.key, providerOptions);
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
      content: navigationName,
      locale: providerOptions?.locale
    });

    return normalized;
  }

  async getSettings<
    TData extends Record<string, unknown> = Record<string, unknown>
  >(settingsName: string, options: RetrievalOptions = {}): Promise<SettingsContent<TData> | null> {
    const entry = resolveSettingsConfig(this.config, settingsName);
    const provider = this.registry.get(entry.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let settings: SettingsContent<TData> | null;
    try {
      settings = await provider.getSettings<TData>(entry.key, providerOptions);
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
      content: settingsName,
      locale: providerOptions?.locale
    });

    return normalized;
  }

  async getCollection<TData extends Record<string, unknown> = Record<string, unknown>>(
    collectionName: string,
    options: RetrievalOptions = {}
  ): Promise<CollectionItem<TData>[]> {
    const entry = resolveContentConfig(this.config, collectionName);
    const provider = this.registry.get(entry.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let items: CollectionItem<TData>[];
    try {
      items = await provider.getCollection<TData>(entry.key, providerOptions);
    } catch (error) {
      throw this.wrapProviderError(error, entry.provider, "getCollection", collectionName);
    }

    return items.map((item) => {
      const normalized = normalizeCollectionItem(item, provider.name);
      validateCollectionItem(normalized, {
        provider: provider.name,
        content: collectionName,
        locale: providerOptions?.locale
      });
      return normalized;
    });
  }

  async getItem<TData extends Record<string, unknown> = Record<string, unknown>>(
    collectionName: string,
    key: string,
    options: RetrievalOptions = {}
  ): Promise<CollectionItem<TData> | null> {
    const entry = resolveContentConfig(this.config, collectionName);
    const provider = this.registry.get(entry.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let item: CollectionItem<TData> | null;
    try {
      item = await provider.getItem<TData>(entry.key, key, providerOptions);
    } catch (error) {
      throw this.wrapProviderError(error, entry.provider, "getItem", collectionName);
    }

    if (item === null) {
      return null;
    }

    const normalized = normalizeCollectionItem(item, provider.name);
    validateCollectionItem(normalized, {
      provider: provider.name,
      content: collectionName,
      locale: providerOptions?.locale
    });

    return normalized;
  }

  /**
   * Translates consumer retrieval options into provider options.
   *
   * When no locales are configured, no provider options are produced so the
   * legacy flat retrieval path remains byte-identical. Requesting a locale
   * without configuration is rejected because silently ignoring it would be
   * surprising.
   */
  private resolveLocaleOptions(
    options: RetrievalOptions
  ): ProviderRetrievalOptions | undefined {
    const { locale, fallback } = options;

    if (!this.localesConfigured) {
      if (locale !== undefined) {
        throw new LocaleError(
          "A locale was requested but no locales are configured.",
          {
            operation: "resolve",
            locale,
            reason:
              "Add a locales section to the NexusContent configuration before requesting a locale."
          }
        );
      }
      return undefined;
    }

    const resolution = this.localeResolver.resolve(locale, fallback ?? true);

    return {
      locale: resolution.requested,
      fallbackLocales: [...resolution.chain],
      strict: resolution.strict
    };
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
