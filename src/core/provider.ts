import type { CollectionItem, PageContent } from "./types.ts";

export interface ContentProvider {
  readonly name: string;

  getPage<TData = Record<string, unknown>>(
    key: string
  ): Promise<PageContent<TData> | null>;

  getCollection<TData = Record<string, unknown>>(
    collection: string
  ): Promise<CollectionItem<TData>[]>;

  getItem<TData = Record<string, unknown>>(
    collection: string,
    key: string
  ): Promise<CollectionItem<TData> | null>;
}
