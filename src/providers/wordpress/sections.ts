import type { JsonValue } from "../../core/types.ts";
import type {
  FixedSectionType,
  WordPressFixedSectionConfig
} from "./config.ts";
import { BUILTIN_SECTION_TYPES, FIXED_SECTION_TYPES } from "./config.ts";
import {
  BUILTIN_SECTION_FIELDS,
  WORDPRESS_SECTION_NAMES,
  type GeneratedSectionFieldDefinition
} from "./sections.generated.ts";

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

type BuiltinFieldSchema = ReadonlyArray<GeneratedSectionFieldDefinition>;

// The generated file only permits JSON-compatible defaults, so its field
// definitions are structurally compatible with SectionFieldDefinition.
const FIELD_SCHEMAS: Record<
  (typeof BUILTIN_SECTION_TYPES)[number],
  ReadonlyArray<SectionFieldDefinition>
> = BUILTIN_SECTION_FIELDS as Record<
  (typeof BUILTIN_SECTION_TYPES)[number],
  BuiltinFieldSchema
>;

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
