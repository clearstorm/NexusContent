import { ProviderError } from "../../core/errors.ts";
import type {
  CollectionItem,
  ContentSection,
  MediaAsset,
  PageContent
} from "../../core/types.ts";
import { extractAcfFields } from "./core-acf-blocks.ts";
import { parseGutenbergToSections } from "./core-gutenberg.ts";
import { normalizeAcfImageToMediaAsset } from "./core-media.ts";
import type { WordPressEditorMode, WordPressUnknownContentPolicy } from "./config.ts";

export interface WordPressContentData {
  content: string;
  excerpt?: string;
  publishedAt?: string;
  modifiedAt?: string;
  url?: string;
  authorId?: number;
  featuredMediaId?: number;
  categories?: number[];
  tags?: number[];
  featuredImage?: MediaAsset;
  /**
   * Optional ACF fields are flattened onto the top level of `data`. Reserved
   * normalized keys always win over identically named ACF fields.
   */
  [key: string]: unknown;
}

export interface WordPressNormalizeContext {
  provider: string;
  operation: string;
  content: string;
  /**
   * Resolved editor mode for the entry being normalized. When present, the
   * canonical section extractor for that mode runs and the result is attached
   * as `data.sections`. Fixed-field mode is skipped: those ACF groups are
   * already flattened as named fields on `data`.
   */
  editorMode?: WordPressEditorMode;
  includeCoreBlocks?: boolean;
  unknownContentPolicy?: WordPressUnknownContentPolicy;
}

interface WordPressEntry {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  publishedAt?: string;
  modifiedAt?: string;
  url?: string;
  authorId?: number;
  featuredMediaId?: number;
  categories?: number[];
  tags?: number[];
  fields?: Record<string, unknown>;
  featuredImage?: MediaAsset;
}

export function normalizeWordPressPage(
  raw: unknown,
  key: string,
  context: WordPressNormalizeContext
): PageContent<WordPressContentData> {
  const entry = parseEntry(raw, context);

  return {
    id: String(entry.id),
    key,
    slug: entry.slug,
    title: entry.title,
    data: buildData(entry, context),
    meta: {
      source: "wordpress",
      sourceId: String(entry.id),
      updatedAt: entry.modifiedAt
    }
  };
}

export function normalizeWordPressItem(
  raw: unknown,
  context: WordPressNormalizeContext
): CollectionItem<WordPressContentData> {
  const entry = parseEntry(raw, context);

  return {
    id: String(entry.id),
    key: entry.slug,
    slug: entry.slug,
    title: entry.title,
    data: buildData(entry, context),
    meta: {
      source: "wordpress",
      sourceId: String(entry.id),
      updatedAt: entry.modifiedAt
    }
  };
}

function parseEntry(
  raw: unknown,
  context: WordPressNormalizeContext
): WordPressEntry {
  const object = requireObject(raw, "entry", context);
  const id = object.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 0) {
    throw invalidEntry("Expected a non-negative integer id.", context);
  }

  if (typeof object.slug !== "string") {
    throw invalidEntry("Expected slug to be a string.", context);
  }
  if (object.status !== "publish") {
    throw invalidEntry('Expected status to be "publish".', context);
  }

  const title = requireRenderedString(object.title, "title", context);
  const content = requireRenderedString(object.content, "content", context);
  const excerpt = optionalPlainRenderedString(object.excerpt, "excerpt", context);
  const publishedAt = readDate(object.date_gmt, object.date);
  const modifiedAt = readDate(object.modified_gmt, object.modified);

  return {
    id,
    slug: object.slug,
    title,
    content,
    excerpt,
    publishedAt,
    modifiedAt,
    url: optionalString(object.link),
    authorId: optionalInteger(object.author),
    featuredMediaId: optionalInteger(object.featured_media),
    categories: optionalIntegerArray(object.categories),
    tags: optionalIntegerArray(object.tags),
    fields: isPlainObject(object.acf) ? object.acf : undefined,
    featuredImage: readFeaturedImage(object._embedded)
  };
}

function normalizeWpData(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map((item) => normalizeWpData(item));
  }
  if (val !== null && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const res: Record<string, unknown> = {};
    const componentType =
      (obj._type as string | undefined) ??
      (obj.acf_fc_layout as string | undefined) ??
      (obj.component as string | undefined) ??
      (obj.type as string | undefined);

    if (componentType) {
      res._type = componentType;
    }

    for (const [k, v] of Object.entries(obj)) {
      res[k] = normalizeWpData(v);
    }
    return res;
  }
  return val;
}

function buildData(
  entry: WordPressEntry,
  context: WordPressNormalizeContext
): WordPressContentData {
  // ACF fields are flattened so project schemas can declare them directly.
  // Reserved normalized values are assigned last so they always win over a
  // field name collision with an ACF key.
  const normalizedFields = normalizeMediaFields(
    normalizeWpData(entry.fields ?? {})
  ) as Record<string, unknown>;
  const data: WordPressContentData = {
    ...normalizedFields,
    content: entry.content
  };

  delete data.excerpt;
  delete data.publishedAt;
  delete data.modifiedAt;
  delete data.url;
  delete data.authorId;
  delete data.featuredMediaId;
  delete data.categories;
  delete data.tags;
  delete data.featuredImage;

  if (entry.excerpt !== undefined) data.excerpt = entry.excerpt;
  if (entry.publishedAt !== undefined) data.publishedAt = entry.publishedAt;
  if (entry.modifiedAt !== undefined) data.modifiedAt = entry.modifiedAt;
  if (entry.url !== undefined) data.url = entry.url;
  if (entry.authorId !== undefined) data.authorId = entry.authorId;
  if (entry.featuredMediaId !== undefined) {
    data.featuredMediaId = entry.featuredMediaId;
  }
  if (entry.categories !== undefined) data.categories = entry.categories;
  if (entry.tags !== undefined) data.tags = entry.tags;
  if (entry.featuredImage !== undefined) {
    data.featuredImage = entry.featuredImage;
  }

  const sections = extractSections(entry, context);
  if (sections.length > 0) {
    data.sections = sections;
  }

  return data;
}

function extractSections(
  entry: WordPressEntry,
  context: WordPressNormalizeContext
): ContentSection[] {
  switch (context.editorMode) {
    case "gutenberg":
      return parseGutenbergToSections(entry.content, {
        includeCoreBlocks: context.includeCoreBlocks ?? false,
        onUnknown:
          context.unknownContentPolicy === "error"
            ? () => "throw"
            : context.unknownContentPolicy === "html"
              ? () => "raw"
              : undefined
      });
    case "acf_flexible":
      return extractAcfFields(entry.fields ?? {});
    default:
      return [];
  }
}

/**
 * Recursively normalize ACF image objects (`url` plus `id`/`ID`/`sizes`/
 * `width`/`height`) inside flattened ACF fields so named-field content (fixed
 * section groups, nested groups, repeatable entries) carries MediaAsset values
 * instead of the raw `url`-shaped WordPress structure.
 */
function normalizeMediaFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeMediaFields(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }

  const asset = normalizeAcfImageToMediaAsset(value);
  if (asset !== undefined) {
    return asset;
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    out[key] = normalizeMediaFields(nested);
  }
  return out;
}

function requireRenderedString(
  value: unknown,
  field: string,
  context: WordPressNormalizeContext
): string {
  const object = requireObject(value, field, context);
  if (typeof object.rendered !== "string") {
    throw invalidEntry(`Expected ${field}.rendered to be a string.`, context);
  }
  return object.rendered;
}

function optionalRenderedString(
  value: unknown,
  field: string,
  context: WordPressNormalizeContext
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const object = requireObject(value, field, context);
  if (object.rendered === undefined) {
    return undefined;
  }
  if (typeof object.rendered !== "string") {
    throw invalidEntry(`Expected ${field}.rendered to be a string.`, context);
  }
  return object.rendered;
}

function optionalPlainRenderedString(
  value: unknown,
  field: string,
  context: WordPressNormalizeContext
): string | undefined {
  const rendered = optionalRenderedString(value, field, context);
  if (rendered === undefined) {
    return undefined;
  }
  // WordPress wraps excerpt.rendered in <p> via wpautop and may include inline
  // markup. Consumers render excerpts as plain text (cards, meta descriptions),
  // so strip tags and collapse whitespace. Entities are left untouched to match
  // the companion plugin's wp_kses_post output.
  return rendered.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function requireObject(
  value: unknown,
  field: string,
  context: WordPressNormalizeContext
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw invalidEntry(`Expected ${field} to be an object.`, context);
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readDate(primary: unknown, fallback: unknown): string | undefined {
  const utcValue = nonEmptyString(primary);
  if (utcValue !== undefined) {
    return /(?:Z|[+-]\d{2}:\d{2})$/i.test(utcValue)
      ? utcValue
      : `${utcValue}Z`;
  }

  // Local WordPress timestamps do not include enough information to infer UTC.
  return nonEmptyString(fallback);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function optionalIntegerArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => optionalInteger(item) !== undefined)) {
    return undefined;
  }
  return value as number[];
}

function readFeaturedImage(value: unknown): MediaAsset | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const mediaList = value["wp:featuredmedia"];
  if (!Array.isArray(mediaList) || !isPlainObject(mediaList[0])) {
    return undefined;
  }

  const media = mediaList[0];
  const id = optionalInteger(media.id);
  if (id === undefined || typeof media.source_url !== "string") {
    return undefined;
  }

  const details = isPlainObject(media.media_details)
    ? media.media_details
    : undefined;
  const image: MediaAsset = {
    id: String(id),
    src: media.source_url
  };

  if (typeof media.alt_text === "string") {
    image.alt = media.alt_text;
  }
  if (typeof details?.width === "number" && Number.isFinite(details.width)) {
    image.width = details.width;
  }
  if (typeof details?.height === "number" && Number.isFinite(details.height)) {
    image.height = details.height;
  }

  return image;
}

function invalidEntry(
  reason: string,
  context: WordPressNormalizeContext
): ProviderError {
  return new ProviderError("WordPress returned an invalid content item.", {
    provider: context.provider,
    operation: context.operation,
    content: context.content,
    reason
  });
}
