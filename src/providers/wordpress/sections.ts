import type { JsonValue } from "../../core/types.ts";
import type {
  FixedSectionType,
  WordPressFixedSectionConfig
} from "./config.ts";
import { FIXED_SECTION_TYPES } from "./config.ts";

export interface SectionDataSchema {
  readonly fields: ReadonlyArray<SectionFieldDefinition>;
}

export interface SectionFieldDefinition {
  readonly name: string;
  readonly type: "string" | "number" | "boolean" | "json" | "media";
  readonly required?: boolean;
  readonly default?: JsonValue;
}

export interface SectionDefinition {
  readonly type: string;
  readonly sourceType: string;
  readonly sourceKey?: string;
  readonly dataSchema?: SectionDataSchema;
  readonly normalize?: (raw: unknown) => Record<string, unknown>;
}

export interface SectionRegistryEntry {
  readonly definition: SectionDefinition;
  readonly fixed?: WordPressFixedSectionConfig;
}

export type SectionRegistry = ReadonlyMap<string, SectionRegistryEntry>;

export interface SectionRegistryOptions {
  readonly customSections?: ReadonlyArray<SectionDefinition>;
  readonly fixedSections?: Partial<Record<FixedSectionType, WordPressFixedSectionConfig>>;
}

function createFixedSectionMap(
  overrides?: Partial<Record<FixedSectionType, WordPressFixedSectionConfig>>
): Map<FixedSectionType, WordPressFixedSectionConfig> {
  const map = new Map<FixedSectionType, WordPressFixedSectionConfig>();
  for (const sectionType of FIXED_SECTION_TYPES) {
    map.set(sectionType, { visible: true });
  }
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (isFixedSectionTypeKey(key) && value !== undefined) {
        map.set(key, value);
      }
    }
  }
  return map;
}

function isFixedSectionTypeKey(value: string): value is FixedSectionType {
  return (FIXED_SECTION_TYPES as readonly string[]).includes(value);
}

const BUILTIN_SECTIONS: readonly SectionDefinition[] = [
  {
    type: "content/header",
    sourceType: "content/header",
    sourceKey: "header",
    dataSchema: {
      fields: [
        { name: "logo", type: "media" },
        { name: "menu", type: "json" },
        { name: "ctaText", type: "string" },
        { name: "ctaUrl", type: "string" }
      ]
    }
  },
  {
    type: "content/footer",
    sourceType: "content/footer",
    sourceKey: "footer",
    dataSchema: {
      fields: [
        { name: "copyright", type: "string" },
        { name: "links", type: "json" },
        { name: "socialLinks", type: "json" }
      ]
    }
  },
  {
    type: "content/sidebar",
    sourceType: "content/sidebar",
    sourceKey: "sidebar",
    dataSchema: {
      fields: [
        { name: "widgets", type: "json" },
        { name: "position", type: "string" }
      ]
    }
  },
  {
    type: "content/breadcrumb",
    sourceType: "content/breadcrumb",
    sourceKey: "breadcrumb",
    dataSchema: {
      fields: [
        { name: "items", type: "json" },
        { name: "separator", type: "string" }
      ]
    }
  },
  {
    type: "content/hero",
    sourceType: "content/hero",
    sourceKey: "hero",
    dataSchema: {
      fields: [
        { name: "heading", type: "string", required: true },
        { name: "subheading", type: "string" },
        { name: "backgroundImage", type: "media" },
        { name: "ctaText", type: "string" },
        { name: "ctaUrl", type: "string" }
      ]
    }
  },
  {
    type: "content/cta",
    sourceType: "content/cta",
    sourceKey: "cta",
    dataSchema: {
      fields: [
        { name: "heading", type: "string", required: true },
        { name: "text", type: "string" },
        { name: "ctaText", type: "string" },
        { name: "ctaUrl", type: "string" }
      ]
    }
  },
  {
    type: "content/features",
    sourceType: "content/features",
    sourceKey: "features",
    dataSchema: {
      fields: [
        { name: "heading", type: "string" },
        { name: "items", type: "json", required: true }
      ]
    }
  },
  {
    type: "content/testimonials",
    sourceType: "content/testimonials",
    sourceKey: "testimonials",
    dataSchema: {
      fields: [
        { name: "heading", type: "string" },
        { name: "items", type: "json", required: true }
      ]
    }
  },
  {
    type: "content/pricing",
    sourceType: "content/pricing",
    sourceKey: "pricing",
    dataSchema: {
      fields: [
        { name: "heading", type: "string" },
        { name: "plans", type: "json", required: true }
      ]
    }
  },
  {
    type: "content/faq",
    sourceType: "content/faq",
    sourceKey: "faq",
    dataSchema: {
      fields: [
        { name: "heading", type: "string" },
        { name: "items", type: "json", required: true }
      ]
    }
  },
  {
    type: "content/team",
    sourceType: "content/team",
    sourceKey: "team",
    dataSchema: {
      fields: [
        { name: "heading", type: "string" },
        { name: "members", type: "json", required: true }
      ]
    }
  },
  {
    type: "content/gallery",
    sourceType: "content/gallery",
    sourceKey: "gallery",
    dataSchema: {
      fields: [
        { name: "heading", type: "string" },
        { name: "images", type: "json", required: true }
      ]
    }
  },
  {
    type: "content/newsletter",
    sourceType: "content/newsletter",
    sourceKey: "newsletter",
    dataSchema: {
      fields: [
        { name: "heading", type: "string" },
        { name: "text", type: "string" },
        { name: "formAction", type: "string" }
      ]
    }
  }
];

export function buildSectionRegistry(
  options: SectionRegistryOptions = {}
): SectionRegistry {
  const map = new Map<string, SectionRegistryEntry>();
  const fixedMap = createFixedSectionMap(options.fixedSections);

  for (const definition of BUILTIN_SECTIONS) {
    const sectionType = definition.type;
    const fixed = fixedMap.get(sectionType as FixedSectionType);
    map.set(sectionType, {
      definition,
      fixed: fixed ?? { visible: true }
    });
  }

  if (options.customSections) {
    for (const definition of options.customSections) {
      map.set(definition.type, { definition });
    }
  }

  return map;
}

export function mergeSectionRegistry(
  base: SectionRegistry,
  overrides: SectionRegistry
): SectionRegistry {
  const merged = new Map<string, SectionRegistryEntry>(base);
  for (const [key, value] of overrides) {
    merged.set(key, value);
  }
  return merged;
}

export function lookupSectionSourceAlias(
  acfKey: string,
  registry: SectionRegistry
): string | undefined {
  for (const [sectionType, entry] of registry) {
    if (entry.definition.sourceType === acfKey) {
      return sectionType;
    }
    if (entry.definition.sourceKey === acfKey) {
      return sectionType;
    }
  }
  return undefined;
}
