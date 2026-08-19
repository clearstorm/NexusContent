import type { CollectionItem, ContentSection, PageContent } from "../../core/types.ts";

interface CompanionPageInput {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  status?: "draft" | "published" | "archived";
  excerpt?: string;
  featuredImage?: { id?: string; url: string; alt?: string; width?: number; height?: number };
  modifiedAt?: string;
  sections: Array<{
    id: string;
    type: string;
    settings?: Record<string, unknown>;
    data: Record<string, unknown>;
  }>;
  rawFields: Record<string, unknown>;
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
    featuredImage: page.featuredImage,
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
