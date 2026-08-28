import type { ComponentSchema } from "../../core/types.ts";
import type {
  WordPressSectionSyncResult
} from "./responses.ts";
import type { SectionFieldDefinition, SectionRegistry } from "./sections.ts";

export interface WordPressComponentFieldDelta {
  readonly component: string;
  readonly sectionType: string;
  readonly missingFields: ReadonlyArray<string>;
  readonly extraFields: ReadonlyArray<string>;
}

export interface WordPressComponentValidationResult {
  readonly components: ReadonlyArray<{
    readonly component: string;
    readonly sectionType: string;
    readonly source: "registry" | "install" | "mapped";
  }>;
  /** Components that can never be produced by the install. Hard errors
   * (code `wordpress/unknown-component`). */
  readonly unknownComponents: ReadonlyArray<string>;
  /** Declared-vs-canonical field mismatches (code `wordpress/field-delta`).
   * Warnings unless the caller promotes them. */
  readonly fieldDeltas: ReadonlyArray<WordPressComponentFieldDelta>;
}

export interface WordPressComponentValidationOptions {
  readonly registry: SectionRegistry;
  readonly syncResult?: WordPressSectionSyncResult;
  /** Bridges mismatched consumer component names to canonical section types. */
  readonly componentTypeMap?: Record<string, string>;
}

/** Template-level keys the normalizer promotes to section settings; consumers
 * should not be expected to declare them. */
const INTERNAL_SECTION_FIELDS = new Set(["section_id", "variant", "theme"]);

/**
 * Validates declared consumer components against the canonical section
 * registry and any live install schema. Unknown component names are hard
 * errors; canonical-field deltas are reported for the caller to promote.
 */
export function validateWordPressComponents(
  components: Readonly<Record<string, ComponentSchema>>,
  options: WordPressComponentValidationOptions
): WordPressComponentValidationResult {
  const { registry, syncResult, componentTypeMap } = options;
  const installByType = new Map(
    (syncResult?.installDefinitions ?? []).map((definition) => [
      definition.type,
      definition
    ])
  );

  const resolved: Array<{
    component: string;
    sectionType: string;
    source: "registry" | "install" | "mapped";
  }> = [];
  const unknownComponents: string[] = [];
  const fieldDeltas: WordPressComponentFieldDelta[] = [];

  for (const [component, schema] of Object.entries(components)) {
    const mapped = componentTypeMap?.[component];
    const sectionType = mapped ?? component;
    const registryEntry = registry.get(sectionType);
    const installDefinition = installByType.get(sectionType);
    const canonicalFields = [
      registryEntry?.definition.dataSchema?.fields,
      installDefinition?.fields
    ];

    const missingFields = collectMissingFields(schema, ...canonicalFields);
    const extraFields = collectExtraFields(schema, ...canonicalFields);
    const hasDelta = missingFields.length > 0 || extraFields.length > 0;

    if (registryEntry !== undefined || installDefinition !== undefined) {
      resolved.push({
        component,
        sectionType,
        source: mapped !== undefined
          ? "mapped"
          : registryEntry !== undefined
            ? "registry"
            : "install"
      });
      if (hasDelta) {
        fieldDeltas.push({
          component,
          sectionType,
          missingFields,
          extraFields
        });
      }
      continue;
    }

    // A component whose name matches a registered canonical type explicitly
    // (rather than through a top-level mapping) is still resolvable.
    if (registry.has(component)) {
      resolved.push({ component, sectionType: component, source: "registry" });
      continue;
    }
    unknownComponents.push(component);
  }

  return {
    components: resolved,
    unknownComponents: unknownComponents.sort(),
    fieldDeltas
  };
}

function collectMissingFields(
  component: ComponentSchema,
  ...canonical: Array<ReadonlyArray<SectionFieldDefinition> | undefined>
): string[] {
  const canonicalNames = collectCanonicalNames(canonical);
  const declared = new Set(Object.keys(component.fields));
  return [...canonicalNames]
    .filter((name) => !INTERNAL_SECTION_FIELDS.has(name))
    .filter((name) => !declared.has(name))
    .sort();
}

function collectExtraFields(
  component: ComponentSchema,
  ...canonical: Array<ReadonlyArray<SectionFieldDefinition> | undefined>
): string[] {
  const canonicalNames = collectCanonicalNames(canonical);
  return Object.keys(component.fields)
    .filter((name) => !canonicalNames.has(name))
    .sort();
}

function collectCanonicalNames(
  fields: Array<ReadonlyArray<SectionFieldDefinition> | undefined>
): Set<string> {
  const names = new Set<string>();
  for (const list of fields) {
    for (const field of list ?? []) {
      names.add(field.name);
    }
  }
  return names;
}