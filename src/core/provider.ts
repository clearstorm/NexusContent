import type {
  CollectionItem,
  NavigationContent,
  PageContent,
  SettingsContent,
  SingletonContent
} from "./types.ts";

export interface ContentProvider {
  readonly name: string;

  getPage<TData = Record<string, unknown>>(
    key: string
  ): Promise<PageContent<TData> | null>;

  getSingleton<TData = Record<string, unknown>>(
    key: string
  ): Promise<SingletonContent<TData> | null>;

  getNavigation(key: string): Promise<NavigationContent | null>;

  getSettings<TData = Record<string, unknown>>(
    key: string
  ): Promise<SettingsContent<TData> | null>;

  getCollection<TData = Record<string, unknown>>(
    collection: string
  ): Promise<CollectionItem<TData>[]>;

  getItem<TData = Record<string, unknown>>(
    collection: string,
    key: string
  ): Promise<CollectionItem<TData> | null>;
}
