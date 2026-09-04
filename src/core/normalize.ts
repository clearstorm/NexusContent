import type {
  CollectionItem,
  NavigationContent,
  PageContent,
  SettingsContent
} from "./types.ts";

export function normalizePage<TData = Record<string, unknown>>(
  page: PageContent<TData>,
  fallbackSource: string
): PageContent<TData> {
  const key = page.key ?? page.id;
  const id = page.id ?? key;

  return {
    ...page,
    id,
    key,
    data: page.data,
    meta: {
      ...(page.meta ?? {}),
      source: page.meta?.source ?? fallbackSource
    }
  };
}

export function normalizeNavigation(
  navigation: NavigationContent,
  fallbackSource: string
): NavigationContent {
  const key = navigation.key ?? navigation.id;
  const id = navigation.id ?? key;

  return {
    ...navigation,
    id,
    key,
    items: navigation.items,
    meta: {
      ...(navigation.meta ?? {}),
      source: navigation.meta?.source ?? fallbackSource
    }
  };
}

export function normalizeSettings<TData = Record<string, unknown>>(
  settings: SettingsContent<TData>,
  fallbackSource: string
): SettingsContent<TData> {
  const key = settings.key ?? settings.id;
  const id = settings.id ?? key;

  return {
    ...settings,
    id,
    key,
    data: settings.data,
    meta: {
      ...(settings.meta ?? {}),
      source: settings.meta?.source ?? fallbackSource
    }
  };
}

export function normalizeCollectionItem<TData = Record<string, unknown>>(
  item: CollectionItem<TData>,
  fallbackSource: string
): CollectionItem<TData> {
  const key = item.key ?? item.id;
  const id = item.id ?? key;

  return {
    ...item,
    id,
    key,
    data: item.data,
    meta: {
      ...(item.meta ?? {}),
      source: item.meta?.source ?? fallbackSource
    }
  };
}
