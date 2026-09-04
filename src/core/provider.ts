import type {
  CollectionItem,
  NavigationContent,
  PageContent,
  SettingsContent
} from "./types.ts";

/**
 * Optional retrieval context forwarded to providers by the content service
 * when locale configuration is active.
 *
 * `locale` is the requested variant. `fallbackLocales` is the ordered
 * fallback chain (requested variant first) produced by the service's locale
 * resolver. `strict` disables legacy flat fallback: providers that support
 * locale variants must throw `MissingLocaleVariantError` when the requested
 * variant is absent. Providers that do not support locale variants may
 * ignore these options.
 */
export interface ProviderRetrievalOptions {
  locale?: string;
  fallbackLocales?: string[];
  strict?: boolean;
}

export interface ContentProvider {
  readonly name: string;

  getPage<TData = Record<string, unknown>>(
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<PageContent<TData> | null>;

  getNavigation(
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<NavigationContent | null>;

  getSettings<TData = Record<string, unknown>>(
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<SettingsContent<TData> | null>;

  getCollection<TData = Record<string, unknown>>(
    collection: string,
    options?: ProviderRetrievalOptions
  ): Promise<CollectionItem<TData>[]>;

  getItem<TData = Record<string, unknown>>(
    collection: string,
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<CollectionItem<TData> | null>;
}
