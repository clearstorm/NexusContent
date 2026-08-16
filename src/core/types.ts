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

export interface NexusConfig {
  providers?: Record<string, ProviderConfig>;
  content: Record<string, ContentConfig>;
  navigation?: Record<string, ContentConfig>;
  settings?: Record<string, ContentConfig>;
}
