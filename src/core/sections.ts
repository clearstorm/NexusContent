import type { ContentSection } from "./types.ts";

function buildSectionsMap(
  sections: ContentSection[] | undefined
): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  const seen: Record<string, number> = {};

  for (const section of sections ?? []) {
    const type = typeof section.type === "string" ? section.type : "<unknown>";
    const count = seen[type] ?? 0;
    seen[type] = count + 1;
    map[count === 0 ? type : `${type}_${count + 1}`] = section.data;
  }

  return map;
}

/**
 * Project a provider's ordered section list onto the canonical consumer
 * shape: a named map keyed by section type (`page.sections.hero`) plus the
 * authoritative ordered list (`page.sectionsList`).
 *
 * Repeated types are suffixed (`hero`, `hero_2`, ...) so no content is
 * dropped; the map is built in list order, so its key order matches the
 * CMS order. Returns `{}` when there is nothing to project.
 */
export function projectSections(
  sections: ContentSection[] | undefined
): { sections?: Record<string, unknown>; sectionsList?: ContentSection[] } {
  if (!sections || sections.length === 0) {
    return {};
  }
  return { sections: buildSectionsMap(sections), sectionsList: sections };
}

/**
 * Build the named map for list-shaped section data such as collection
 * items (`item.data.sections`), so consumers can address a section by type
 * the same way they would on a page.
 */
export function namedSections(
  sections: ContentSection[] | undefined
): Record<string, unknown> {
  return buildSectionsMap(sections);
}