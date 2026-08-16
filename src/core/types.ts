export type ContentSource = string;

export interface SeoData {
  title?: string;
  description?: string;
  canonical?: string;
}

export interface MediaAsset {
  id?: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
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

export interface PageContent<TData = Record<string, unknown>> {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  seo?: SeoData;
  data: TData;
  meta: ContentMeta;
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

export interface CollectionItem<TData = Record<string, unknown>> {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  data: TData;
  meta: ContentMeta;
}

export interface ProviderConfig {
  type: string;
  options?: Record<string, unknown>;
}

export interface ContentConfig {
  provider: string;
  key: string;
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
  default: string;
  supported: string[];
  fallback?: Record<string, string | null>;
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

export interface NexusConfig {
  providers?: Record<string, ProviderConfig>;
  content: Record<string, ContentConfig>;
  navigation?: Record<string, ContentConfig>;
  settings?: Record<string, ContentConfig>;
  locales?: LocaleConfig;
}
