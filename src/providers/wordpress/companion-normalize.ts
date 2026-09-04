import type { CollectionItem, ContentSection, MediaAsset, PageContent } from "../../core/types.ts";

interface CompanionPageInput {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  status?: "draft" | "published" | "archived";
  excerpt?: string;
  featuredImage?: {
    id?: string;
    url: string;
    alt?: string;
    caption?: string;
    mimeType?: string;
    width?: number;
    height?: number;
  };
  modifiedAt?: string;
  sections: Array<{
    id: string;
    type: string;
    settings?: Record<string, unknown>;
    data: Record<string, unknown>;
  }>;
  rawFields: Record<string, unknown>;
}

// The companion wire carries `featuredImage.url`; normalized MediaAsset uses
// `src`. Convert at the boundary so Core and consumers never see the wire key.
function convertFeaturedImage(
  wire: CompanionPageInput["featuredImage"]
): MediaAsset | undefined {
  if (!wire) {
    return undefined;
  }
  const asset: MediaAsset = {
    id: wire.id,
    src: wire.url
  };
  if (wire.alt !== undefined) asset.alt = wire.alt;
  if (wire.caption !== undefined) asset.caption = wire.caption;
  if (wire.mimeType !== undefined) asset.mimeType = wire.mimeType;
  if (wire.width !== undefined) asset.width = wire.width;
  if (wire.height !== undefined) asset.height = wire.height;
  return asset;
}

export function normalizeCompanionPage(
  page: CompanionPageInput,
  key: string
): PageContent {
  return {
    id: page.id,
    key,
    slug: page.slug,
    title: page.title,
    status: page.status,
    excerpt: page.excerpt,
    featuredImage: convertFeaturedImage(page.featuredImage),
    modifiedAt: page.modifiedAt,
    sections: page.sections.map(normalizeSection),
    data: page.rawFields,
    meta: { source: "wordpress", sourceId: page.id }
  };
}

export function normalizeCompanionPageItem(
  page: CompanionPageInput
): CollectionItem {
  const featuredImage = convertFeaturedImage(page.featuredImage);
  return {
    id: page.id,
    key: page.key,
    slug: page.slug,
    title: page.title,
    // Normalized sections surface as `data.sections` — the same canonical
    // shape Git blog posts author — so companion-backed items render through
    // the identical consumer components as Git content. An empty array keeps
    // the consumer's raw-HTML fallback path intact. `excerpt` and
    // `featuredImage` are copied from the wire for card parity with the
    // flattened `data.*` keys consumer cards expect.
    data: {
      ...page.rawFields,
      ...(page.excerpt !== undefined ? { excerpt: page.excerpt } : {}),
      ...(featuredImage !== undefined ? { featuredImage } : {}),
      sections: page.sections.map(normalizeSection)
    },
    meta: { source: "wordpress", sourceId: page.id }
  };
}

function normalizeSection(section: CompanionPageInput["sections"][number]): ContentSection {
  return {
    id: section.id,
    type: section.type,
    settings: section.settings as ContentSection["settings"],
    data: normalizeSectionData(section.data)
  };
}

// The companion wire emits media values as `{ url, id, ... }` inside section
// `data`. Normalize any wire-media object to MediaAsset `src` at this
// boundary so consumer components and `nexus.media.resolve` never see the
// wire key. Plain objects that merely carry a `url` string (links, embeds)
// are left untouched unless they also carry media metadata.
function normalizeSectionData(value: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    output[key] = normalizeSectionValue(child);
  }
  return output;
}

function normalizeSectionValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeSectionValue);
  }
  if (!isRecord(value)) {
    return value;
  }
  return isWireMedia(value) ? toMediaAsset(value) : normalizeSectionData(value);
}

function toMediaAsset(value: Record<string, unknown> & { url: string }): MediaAsset {
  const asset: MediaAsset = { id: wireString(value.id), src: value.url };
  const alt = wireString(value.alt);
  if (alt !== undefined) asset.alt = alt;
  const caption = wireString(value.caption);
  if (caption !== undefined) asset.caption = caption;
  const mimeType = wireString(value.mimeType ?? value.mimetype);
  if (mimeType !== undefined) asset.mimeType = mimeType;
  const width = wireNumber(value.width);
  if (width !== undefined) asset.width = width;
  const height = wireNumber(value.height);
  if (height !== undefined) asset.height = height;
  return asset;
}

function wireString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function wireNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function isWireMedia(value: Record<string, unknown>): value is Record<string, unknown> & {
  url: string;
  id?: string;
} {
  if (typeof value.url !== "string") {
    return false;
  }
  return (
    value.id !== undefined ||
    value.mimeType !== undefined ||
    value.mimetype !== undefined ||
    value.width !== undefined ||
    value.height !== undefined ||
    Array.isArray(value.sizes)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
