import type {
  CollectionItem,
  ContentMeta,
  NavigationContent,
  NavigationItem,
  PageContent,
  SeoData,
  SettingsContent,
  SingletonContent
} from "../../core/types.ts";
import { ProviderError } from "../../core/errors.ts";

export interface NormalizeSource {
  key: string;
  sourceId: string;
  updatedAt?: string;
}

function asObject(value: unknown, sourceId: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProviderError(
      `Content file "${sourceId}" must contain a JSON object.`,
      {
        provider: "git",
        operation: "normalize",
        content: sourceId,
        reason: "Expected a JSON object at the top level."
      }
    );
  }
  return value as Record<string, unknown>;
}

function buildMeta(source: NormalizeSource): ContentMeta {
  return {
    source: "git",
    sourceId: source.sourceId,
    updatedAt: source.updatedAt
  };
}

export function normalizeRawPage(
  raw: unknown,
  source: NormalizeSource
): PageContent {
  const object = asObject(raw, source.sourceId);

  const seo = object.seo as SeoData | undefined;

  const data: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(object)) {
    if (field === "id" || field === "key" || field === "slug" || field === "title" || field === "seo") {
      continue;
    }
    data[field] = value;
  }

  return {
    id: (object.id as string | undefined) ?? source.key,
    key: source.key,
    slug: object.slug as string | undefined,
    title: object.title as string | undefined,
    seo,
    data,
    meta: buildMeta(source)
  };
}

export function normalizeRawSingleton(
  raw: unknown,
  source: NormalizeSource
): SingletonContent {
  const object = asObject(raw, source.sourceId);

  const data: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(object)) {
    if (field === "id" || field === "key") {
      continue;
    }
    data[field] = value;
  }

  return {
    id: (object.id as string | undefined) ?? source.key,
    key: source.key,
    data,
    meta: buildMeta(source)
  };
}

export function normalizeRawNavigation(
  raw: unknown,
  source: NormalizeSource
): NavigationContent {
  const object = asObject(raw, source.sourceId);

  return {
    id: (object.id as string | undefined) ?? source.key,
    key: source.key,
    items: object.items as NavigationItem[],
    meta: buildMeta(source)
  };
}

export function normalizeRawSettings(
  raw: unknown,
  source: NormalizeSource
): SettingsContent {
  const object = asObject(raw, source.sourceId);

  const data: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(object)) {
    if (field === "id" || field === "key") {
      continue;
    }
    data[field] = value;
  }

  return {
    id: (object.id as string | undefined) ?? source.key,
    key: source.key,
    data,
    meta: buildMeta(source)
  };
}

export function normalizeRawItem(
  raw: unknown,
  source: NormalizeSource
): CollectionItem {
  const object = asObject(raw, source.sourceId);

  const data: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(object)) {
    if (field === "id" || field === "key" || field === "slug" || field === "title") {
      continue;
    }
    data[field] = value;
  }

  return {
    id: (object.id as string | undefined) ?? source.key,
    key: source.key,
    slug: object.slug as string | undefined,
    title: object.title as string | undefined,
    data,
    meta: buildMeta(source)
  };
}
