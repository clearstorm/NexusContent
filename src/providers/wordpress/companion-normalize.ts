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
  return {
    id: page.id,
    key: page.key,
    slug: page.slug,
    title: page.title,
    data: page.rawFields,
    meta: { source: "wordpress", sourceId: page.id }
  };
}

function normalizeSection(section: CompanionPageInput["sections"][number]): ContentSection {
  return {
    id: section.id,
    type: section.type,
    settings: section.settings as ContentSection["settings"],
    data: section.data
  };
}
