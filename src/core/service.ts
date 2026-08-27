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
import type {
  CollectionModelNames,
  NavigationModelNames,
  ResolvedData,
  SettingsModelNames,
  SingletonModelNames,
  SingletonServiceModelNames
} from "./inference.ts";
import { ProviderRegistry } from "./registry.ts";
import { LocaleResolver } from "./locale.ts";
import { resolveBuiltinMediaProviders } from "./config.ts";
import { ModelRegistry } from "./schema.ts";
import {
  MediaProviderRegistry,
  ResolveMediaService,
  defineLocalMediaProvider,
  defineRemoteMediaProvider
} from "../media/index.ts";
import type { MediaProvider } from "../media/types.ts";
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

export class NexusContent<const TConfig extends NexusConfig = NexusConfig> {
  private readonly config: TConfig;
  private readonly registry: ProviderRegistry;
  private readonly mediaRegistry: MediaProviderRegistry;
  private readonly localesConfigured: boolean;
  private readonly localeResolver: LocaleResolver;
  private readonly models: ModelRegistry;

  /** Framework neutral media resolution entry point. */
  readonly media: ResolveMediaService;

  constructor(
    config: TConfig,
    registry: ProviderRegistry = new ProviderRegistry(),
    mediaRegistry: MediaProviderRegistry = new MediaProviderRegistry()
  ) {
    this.config = config;
    this.registry = registry;
    this.mediaRegistry = mediaRegistry;
    this.localesConfigured = config.locales !== undefined;
    // Config validation fails fast here so misconfigured locales surface at
    // construction time rather than during a build.
    this.localeResolver = new LocaleResolver(config.locales);

    const providerNames = Object.keys(config.providers ?? {});
    const mediaProviderNames = Object.keys(config.media?.providers ?? {});
    this.models = new ModelRegistry(
      config.schema,
      providerNames,
      mediaProviderNames
    );

    const builtinMedia = resolveBuiltinMediaProviders(config.media);
    const defaultMediaProvider =
      builtinMedia.default ?? config.media?.default;

    for (const [name, providerConfig] of Object.entries(
      builtinMedia.providers
    )) {
      const options = providerConfig.options ?? {};
      if (providerConfig.type === "local") {
        this.mediaRegistry.register(
          name,
          defineLocalMediaProvider({
            name,
            root: String(options.root),
            publicPath: String(options.publicPath)
          })
        );
      } else if (providerConfig.type === "remote") {
        this.mediaRegistry.register(
          name,
          defineRemoteMediaProvider({ name })
        );
      }
    }

    this.media = new ResolveMediaService(
      this.mediaRegistry,
      defaultMediaProvider
    );
  }

  register(name: string, provider: ContentProvider): this {
    this.registry.register(name, provider);
    return this;
  }

  registerMedia(name: string, provider: MediaProvider): this {
    this.mediaRegistry.register(name, provider);
    return this;
  }

  async getPage<
    TData extends Record<string, unknown> | undefined = undefined,
    const TName extends SingletonModelNames<TConfig> = SingletonModelNames<TConfig>
  >(
    modelName: TName,
    options: RetrievalOptions = {}
  ): Promise<PageContent<ResolvedData<TConfig, TName, TData>> | null> {
    const model = this.models.assertKind(modelName, "singleton");
    const provider = this.registry.get(model.source.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    if (model.source.mode === "page") {
      let page: PageContent | null;
      try {
        page = await provider.getPage(model.source.key, providerOptions);
      } catch (error) {
        throw this.wrapProviderError(
          error,
          provider.name,
          "getPage",
          modelName
        );
      }

      if (page === null) {
        return null;
      }

      const normalized = normalizePage(page, provider.name);
      validatePageContent(normalized, {
        provider: provider.name,
        content: modelName,
        locale: providerOptions?.locale
      });
      const data = this.models.validateData(modelName, normalized.data, {
        provider: provider.name,
        content: modelName,
        sourceKey: model.source.key,
        locale: providerOptions?.locale,
        operation: "getPage"
      }) as ResolvedData<TConfig, TName, TData>;

      return { ...normalized, data };
    }

    let singleton: SingletonContent | null;
    try {
      singleton = await provider.getSingleton(
        model.source.key,
        providerOptions
      );
    } catch (error) {
      throw this.wrapProviderError(
        error,
        provider.name,
        "getSingleton",
        modelName
      );
    }

    if (singleton === null) {
      return null;
    }

    const normalized = normalizeSingleton(singleton, provider.name);
    validateSingletonContent(normalized, {
      provider: provider.name,
      content: modelName,
      locale: providerOptions?.locale
    });
    const data = this.models.validateData(modelName, normalized.data, {
      provider: provider.name,
      content: modelName,
      sourceKey: model.source.key,
      locale: providerOptions?.locale,
      operation: "getSingleton"
    }) as ResolvedData<TConfig, TName, TData>;

    return {
      id: normalized.id,
      key: normalized.key,
      data,
      meta: normalized.meta
    };
  }

  async getSingleton<
    TData extends Record<string, unknown> | undefined = undefined,
    const TName extends SingletonServiceModelNames<TConfig> = SingletonServiceModelNames<TConfig>
  >(
    modelName: TName,
    options: RetrievalOptions = {}
  ): Promise<SingletonContent<ResolvedData<TConfig, TName, TData>> | null> {
    const model = this.models.assertKind(modelName, "singleton");
    if (model.source.mode === "page") {
      throw new ProviderError(
        `Model "${modelName}" routes through the page content operation. Use getPage instead of getSingleton.`,
        {
          provider: model.source.provider,
          model: modelName,
          operation: "getSingleton",
          reason: `source.mode is "page" for the "${model.source.key}" provider key.`
        }
      );
    }

    const provider = this.registry.get(model.source.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let singleton: SingletonContent | null;
    try {
      singleton = await provider.getSingleton(
        model.source.key,
        providerOptions
      );
    } catch (error) {
      throw this.wrapProviderError(
        error,
        provider.name,
        "getSingleton",
        modelName
      );
    }

    if (singleton === null) {
      return null;
    }

    const normalized = normalizeSingleton(singleton, provider.name);
    validateSingletonContent(normalized, {
      provider: provider.name,
      content: modelName,
      locale: providerOptions?.locale
    });
    const data = this.models.validateData(modelName, normalized.data, {
      provider: provider.name,
      content: modelName,
      sourceKey: model.source.key,
      locale: providerOptions?.locale,
      operation: "getSingleton"
    }) as ResolvedData<TConfig, TName, TData>;

    return { ...normalized, data };
  }

  async getNavigation<
    const TName extends NavigationModelNames<TConfig> = NavigationModelNames<TConfig>
  >(
    modelName: TName,
    options: RetrievalOptions = {}
  ): Promise<NavigationContent | null> {
    const model = this.models.assertKind(modelName, "navigation");
    const provider = this.registry.get(model.source.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let navigation: NavigationContent | null;
    try {
      navigation = await provider.getNavigation(
        model.source.key,
        providerOptions
      );
    } catch (error) {
      throw this.wrapProviderError(
        error,
        provider.name,
        "getNavigation",
        modelName
      );
    }

    if (navigation === null) {
      return null;
    }

    const normalized = normalizeNavigation(navigation, provider.name);
    validateNavigationContent(normalized, {
      provider: provider.name,
      content: modelName,
      locale: providerOptions?.locale
    });

    return normalized;
  }

  async getSettings<
    TData extends Record<string, unknown> | undefined = undefined,
    const TName extends SettingsModelNames<TConfig> = SettingsModelNames<TConfig>
  >(
    modelName: TName,
    options: RetrievalOptions = {}
  ): Promise<SettingsContent<ResolvedData<TConfig, TName, TData>> | null> {
    const model = this.models.assertKind(modelName, "settings");
    const provider = this.registry.get(model.source.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let settings: SettingsContent | null;
    try {
      settings = await provider.getSettings(
        model.source.key,
        providerOptions
      );
    } catch (error) {
      throw this.wrapProviderError(
        error,
        provider.name,
        "getSettings",
        modelName
      );
    }

    if (settings === null) {
      return null;
    }

    const normalized = normalizeSettings(settings, provider.name);
    validateSettingsContent(normalized, {
      provider: provider.name,
      content: modelName,
      locale: providerOptions?.locale
    });
    const data = this.models.validateData(modelName, normalized.data, {
      provider: provider.name,
      content: modelName,
      sourceKey: model.source.key,
      locale: providerOptions?.locale,
      operation: "getSettings"
    }) as ResolvedData<TConfig, TName, TData>;

    return { ...normalized, data };
  }

  async getCollection<
    TData extends Record<string, unknown> | undefined = undefined,
    const TName extends CollectionModelNames<TConfig> = CollectionModelNames<TConfig>
  >(
    modelName: TName,
    options: RetrievalOptions = {}
  ): Promise<CollectionItem<ResolvedData<TConfig, TName, TData>>[]> {
    const model = this.models.assertKind(modelName, "collection");
    const provider = this.registry.get(model.source.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let items: CollectionItem[];
    try {
      items = await provider.getCollection(
        model.source.key,
        providerOptions
      );
    } catch (error) {
      throw this.wrapProviderError(
        error,
        provider.name,
        "getCollection",
        modelName
      );
    }

    return items.map((item): CollectionItem<ResolvedData<TConfig, TName, TData>> => {
      const normalized = normalizeCollectionItem(item, provider.name);
      validateCollectionItem(normalized, {
        provider: provider.name,
        content: modelName,
        locale: providerOptions?.locale
      });
      const data = this.models.validateData(modelName, normalized.data, {
        provider: provider.name,
        content: modelName,
        sourceKey: model.source.key,
        locale: providerOptions?.locale,
        operation: "getCollection"
      }) as ResolvedData<TConfig, TName, TData>;

      return { ...normalized, data };
    });
  }

  async getItem<
    TData extends Record<string, unknown> | undefined = undefined,
    const TName extends CollectionModelNames<TConfig> = CollectionModelNames<TConfig>
  >(
    modelName: TName,
    key: string,
    options: RetrievalOptions = {}
  ): Promise<CollectionItem<ResolvedData<TConfig, TName, TData>> | null> {
    const model = this.models.assertKind(modelName, "collection");
    const provider = this.registry.get(model.source.provider);
    const providerOptions = this.resolveLocaleOptions(options);

    let item: CollectionItem | null;
    try {
      item = await provider.getItem(
        model.source.key,
        key,
        providerOptions
      );
    } catch (error) {
      throw this.wrapProviderError(error, provider.name, "getItem", modelName);
    }

    if (item === null) {
      return null;
    }

    const normalized = normalizeCollectionItem(item, provider.name);
    validateCollectionItem(normalized, {
      provider: provider.name,
      content: modelName,
      locale: providerOptions?.locale
    });
    const data = this.models.validateData(modelName, normalized.data, {
      provider: provider.name,
      content: modelName,
      sourceKey: model.source.key,
      locale: providerOptions?.locale,
      operation: "getItem"
    }) as ResolvedData<TConfig, TName, TData>;

    return { ...normalized, data };
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