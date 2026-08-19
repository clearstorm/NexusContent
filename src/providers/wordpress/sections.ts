import type { JsonValue } from "../../core/types.ts";
import type {
  FixedSectionType,
  WordPressFixedSectionConfig
} from "./config.ts";
import { BUILTIN_SECTION_TYPES, FIXED_SECTION_TYPES } from "./config.ts";

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

const FIELD_SCHEMAS: Record<
  (typeof BUILTIN_SECTION_TYPES)[number],
  ReadonlyArray<SectionFieldDefinition>
> = {
  hero: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "eyebrow", type: "string" },
    { name: "heading", type: "string" },
    { name: "body", type: "string" },
    { name: "image", type: "media" },
    { name: "primary_action_label", type: "string" },
    { name: "primary_action_url", type: "string" },
    { name: "secondary_action_label", type: "string" },
    { name: "secondary_action_url", type: "string" },
    { name: "theme", type: "string" }
  ],
  intro: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "eyebrow", type: "string" },
    { name: "heading", type: "string" },
    { name: "body", type: "string" },
    { name: "image", type: "media" },
    { name: "image_position", type: "string" },
    { name: "theme", type: "string" }
  ],
  rich_text: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "heading", type: "string" },
    { name: "body", type: "string" },
    { name: "theme", type: "string" }
  ],
  image_text: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "eyebrow", type: "string" },
    { name: "heading", type: "string" },
    { name: "body", type: "string" },
    { name: "image", type: "media" },
    { name: "image_position", type: "string" },
    { name: "action_label", type: "string" },
    { name: "action_url", type: "string" },
    { name: "theme", type: "string" }
  ],
  features: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "eyebrow", type: "string" },
    { name: "heading", type: "string" },
    { name: "body", type: "string" },
    { name: "items", type: "json" },
    { name: "theme", type: "string" }
  ],
  statistics: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "eyebrow", type: "string" },
    { name: "heading", type: "string" },
    { name: "items", type: "json" },
    { name: "theme", type: "string" }
  ],
  testimonials: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "eyebrow", type: "string" },
    { name: "heading", type: "string" },
    { name: "items", type: "json" },
    { name: "theme", type: "string" }
  ],
  gallery: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "eyebrow", type: "string" },
    { name: "heading", type: "string" },
    { name: "images", type: "json" },
    { name: "theme", type: "string" }
  ],
  cta: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "heading", type: "string" },
    { name: "body", type: "string" },
    { name: "primary_action_label", type: "string" },
    { name: "primary_action_url", type: "string" },
    { name: "secondary_action_label", type: "string" },
    { name: "secondary_action_url", type: "string" },
    { name: "background_image", type: "media" },
    { name: "theme", type: "string" }
  ],
  faq: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "eyebrow", type: "string" },
    { name: "heading", type: "string" },
    { name: "items", type: "json" },
    { name: "theme", type: "string" }
  ],
  logo_grid: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "eyebrow", type: "string" },
    { name: "heading", type: "string" },
    { name: "items", type: "json" },
    { name: "theme", type: "string" }
  ],
  form_embed: [
    { name: "section_id", type: "string" },
    { name: "variant", type: "string" },
    { name: "heading", type: "string" },
    { name: "provider", type: "string" },
    { name: "form_id", type: "string" },
    { name: "embed_code", type: "string" },
    { name: "theme", type: "string" }
  ]
};

const WORDPRESS_SECTION_NAMES: Readonly<
  Record<(typeof BUILTIN_SECTION_TYPES)[number], string>
> = {
  hero: "hero",
  intro: "intro",
  rich_text: "rich-text",
  image_text: "image-text",
  features: "features",
  statistics: "statistics",
  testimonials: "testimonials",
  gallery: "gallery",
  cta: "cta",
  faq: "faq",
  logo_grid: "logo-grid",
  form_embed: "form-embed"
};

export const BUILTIN_SECTIONS: readonly SectionDefinition[] =
  BUILTIN_SECTION_TYPES.map((type) => ({
    type,
    sourceType: `nexuscontent/${WORDPRESS_SECTION_NAMES[type]}`,
    sourceKey: `acf/${WORDPRESS_SECTION_NAMES[type]}`,
    dataSchema: { fields: FIELD_SCHEMAS[type] }
  }));

function isFixedSectionTypeKey(value: string): value is FixedSectionType {
  return (FIXED_SECTION_TYPES as readonly string[]).includes(value);
}

export function buildSectionRegistry(
  options: SectionRegistryOptions = {}
): SectionRegistry {
  const map = new Map<string, SectionRegistryEntry>();

  for (const definition of BUILTIN_SECTIONS) {
    const fixed = isFixedSectionTypeKey(definition.type)
      ? options.fixedSections?.[definition.type] ?? { visible: true }
      : undefined;
    map.set(definition.type, { definition, ...(fixed ? { fixed } : {}) });
  }

  for (const definition of options.customSections ?? []) {
    map.set(definition.type, { definition });
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
  source: string,
  registry: SectionRegistry
): string | undefined {
  for (const [sectionType, entry] of registry) {
    if (
      sectionType === source ||
      entry.definition.sourceType === source ||
      entry.definition.sourceKey === source
    ) {
      return sectionType;
    }
  }
  return undefined;
}
