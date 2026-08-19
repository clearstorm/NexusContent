import type { ContentSection } from "../../core/types.ts";

/**
 * Generate a deterministic section ID from type and position.
 * Used when sections lack explicit IDs.
 */
export function generateDeterministicSectionId(
  type: string,
  position: number
): string {
  return `${type}-${position}`;
}

/**
 * Resolve section IDs for a page's sections.
 * Priority order:
 * 1. Explicit ID from the section
 * 2. Anchor (if section has an anchor attribute)
 * 3. Persisted ID (from database or storage)
 * 4. Deterministic from page + type + position
 */
export function resolveSectionIds(
  sections: ContentSection[],
  pageKey: string
): ContentSection[] {
  return sections.map((section, index) => {
    // Priority 1: Explicit ID
    if (section.id && section.id.length > 0) {
      return section;
    }

    // Priority 2: Anchor (if present in data)
    const anchor = section.data?.anchor;
    if (typeof anchor === "string" && anchor.length > 0) {
      return { ...section, id: anchor };
    }

    // Priority 3: Persisted ID (from section_id field)
    const sectionId = section.data?.section_id;
    if (typeof sectionId === "string" && sectionId.length > 0) {
      return { ...section, id: sectionId };
    }

    // Priority 4: Deterministic from page + type + position
    const deterministicId = generateDeterministicId(pageKey, section.type, index);
    return { ...section, id: deterministicId };
  });
}

/**
 * Generate a deterministic ID from page key, section type, and position.
 * Uses a simple hash to create a stable, unique ID.
 */
function generateDeterministicId(
  pageKey: string,
  sectionType: string,
  position: number
): string {
  // Simple hash: combine page key, section type, and position
  const hash = simpleHash(`${pageKey}:${sectionType}:${position}`);
  return `section-${sectionType}-${hash.toString(36)}`;
}

/**
 * Simple hash function for generating deterministic IDs.
 * Not cryptographically secure, but deterministic and fast.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

/**
 * Ensure all sections have unique IDs.
 * If duplicates exist, append a suffix to make them unique.
 */
export function ensureUniqueSectionIds(sections: ContentSection[]): ContentSection[] {
  const seen = new Map<string, number>();
  return sections.map((section) => {
    if (!section.id) return section;

    const count = seen.get(section.id) ?? 0;
    if (count === 0) {
      seen.set(section.id, 1);
      return section;
    }

    const uniqueId = `${section.id}-${count}`;
    seen.set(section.id, count + 1);
    return { ...section, id: uniqueId };
  });
}
