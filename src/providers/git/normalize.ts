import type {
  CollectionItem,
  ContentMeta,
  ContentSection,
  NavigationContent,
  NavigationItem,
  PageContent,
  SeoData,
  SettingsContent
} from "../../core/types.ts";
import { ProviderError } from "../../core/errors.ts";

export interface NormalizeSource {
  key: string;
  sourceId: string;
  updatedAt?: string;
  locale?: string;
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
  const meta: ContentMeta = {
    source: "git",
    sourceId: source.sourceId,
    updatedAt: source.updatedAt
  };

  if (source.locale !== undefined) {
    meta.locale = source.locale;
  }

  return meta;
}

function normalizeGitValue(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map((item) => normalizeGitValue(item));
  }
  if (val !== null && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const res: Record<string, unknown> = {};
    const componentType =
      (obj._type as string | undefined) ??
      (obj.component as string | undefined) ??
      (obj.type as string | undefined);

    if (componentType) {
      res._type = componentType;
    }

    for (const [k, v] of Object.entries(obj)) {
      res[k] = normalizeGitValue(v);
    }
    return res;
  }
  return val;
}

export function normalizeRawPage(
  raw: unknown,
  source: NormalizeSource
): PageContent {
  const object = asObject(raw, source.sourceId);

  const seo = object.seo as SeoData | undefined;
  const sections = normalizeRawSections(object.sections, source.sourceId);

  const data: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(object)) {
    if (field === "id" || field === "key" || field === "slug" || field === "title" || field === "seo" || field === "sections") {
      continue;
    }
    data[field] = normalizeGitValue(value);
  }

  return {
    id: (object.id as string | undefined) ?? source.key,
    key: source.key,
    slug: object.slug as string | undefined,
    title: object.title as string | undefined,
    seo,
    sectionsList: sections,
    data,
    meta: buildMeta(source)
  };
}

// A page's `sections` may be authored either as a named map
// (`{ "hero": {...}, "cta": {...} }`, ordered by JSON key) or as an ordered
// `[{ type, data }]` list. Both normalize to the provider's ordered
// `sectionsList`; Core projects that onto the consumer `page.sections` map.
// Legacy named-field files omit `sections` entirely and pass through as data.
function normalizeRawSections(
  raw: unknown,
  sourceId: string
): ContentSection[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (raw === null || typeof raw !== "object") {
    throw new ProviderError(
      `Content file "${sourceId}" has a "sections" field that is neither an object nor an array.`,
      {
        provider: "git",
        operation: "normalize",
        content: sourceId,
        reason: 'Expected "sections" to be a named map or a [{ type, data }] list.'
      }
    );
  }

  if (Array.isArray(raw)) {
    return raw.map((entry) => {
      const box = asObject(entry, sourceId);
      if (typeof box.type !== "string" || box.type.length === 0) {
        throw new ProviderError(
          `Content file "${sourceId}" has a section without a string "type".`,
          {
            provider: "git",
            operation: "normalize",
            content: sourceId,
            reason: 'Sections authored as a list need an explicit "type".'
          }
        );
      }
      return {
        type: box.type,
        data: normalizeRawSectionData(box.data, sourceId, box.type)
      };
    });
  }

  return Object.entries(raw as Record<string, unknown>).map(
    ([type, data]) => ({ type, data: normalizeRawSectionData(data, sourceId, type) })
  );
}

function normalizeRawSectionData(
  value: unknown,
  sourceId: string,
  sectionType: string
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProviderError(
      `Content file "${sourceId}" has a "${sectionType}" section whose data is not an object.`,
      {
        provider: "git",
        operation: "normalize",
        content: sourceId,
        reason: 'Section data must be a JSON object.'
      }
    );
  }
  return normalizeGitValue(value) as Record<string, unknown>;
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
