import type { CollectionItem, PageContent } from "./types.ts";

export function normalizePage<TData = Record<string, unknown>>(
  page: PageContent<TData>,
  fallbackSource: string
): PageContent<TData> {
  const data =
    page.data && typeof page.data === "object" ? page.data : ({} as TData);

  const key = page.key ?? page.id;
  const id = page.id ?? key;

  return {
    ...page,
    id,
    key,
    data,
    meta: {
      ...(page.meta ?? {}),
      source: page.meta?.source ?? fallbackSource
    }
  };
}

export function normalizeCollectionItem<TData = Record<string, unknown>>(
  item: CollectionItem<TData>,
  fallbackSource: string
): CollectionItem<TData> {
  const data =
    item.data && typeof item.data === "object" ? item.data : ({} as TData);

  const key = item.key ?? item.id;
  const id = item.id ?? key;

  return {
    ...item,
    id,
    key,
    data,
    meta: {
      ...(item.meta ?? {}),
      source: item.meta?.source ?? fallbackSource
    }
  };
}
