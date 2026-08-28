import type {
  WordPressSchemaData,
  WordPressSectionSyncConflict,
  WordPressSectionSyncResult
} from "./responses.ts";
import type { SectionRegistry } from "./sections.ts";

/**
 * Reconcile a consumer-declared section registry against the live companion
 * `/schema` data. Distinguishes sections the install can produce from ones it
 * never will, so drift is loud instead of silently degrading.
 */
export function reconcileSectionRegistry(
  registry: SectionRegistry,
  schemaData: WordPressSchemaData
): WordPressSectionSyncResult {
  const installTypes = new Set(
    schemaData.sectionDefinitions.map((definition) => definition.type)
  );
  const installDefinitions = [...schemaData.sectionDefinitions];

  const knownTypes: string[] = [];
  const registryOnly: string[] = [];
  const conflicts: WordPressSectionSyncConflict[] = [];

  for (const [sectionType, entry] of registry) {
    if (installTypes.has(sectionType)) {
      knownTypes.push(sectionType);
      continue;
    }

    const source = entry.definition.sourceType;
    const mapping = schemaData.sourceMappings[source];
    if (mapping !== undefined) {
      if (mapping === sectionType) {
        knownTypes.push(sectionType);
      } else {
        conflicts.push({
          type: sectionType,
          source,
          expected: sectionType,
          installed: mapping
        });
      }
      continue;
    }

    const sourceKey = entry.definition.sourceKey;
    if (sourceKey !== undefined) {
      const keyMapping = schemaData.sourceMappings[sourceKey];
      if (keyMapping !== undefined) {
        if (keyMapping === sectionType) {
          knownTypes.push(sectionType);
        } else {
          conflicts.push({
            type: sectionType,
            source: sourceKey,
            expected: sectionType,
            installed: keyMapping
          });
        }
        continue;
      }
    }

    registryOnly.push(sectionType);
  }

  const installOnly = [...installTypes].filter(
    (type) => !registry.has(type)
  );

  return {
    knownTypes: knownTypes.sort(),
    registryOnly: registryOnly.sort(),
    installOnly: [...installOnly].sort(),
    conflicts: conflicts.sort((a, b) => a.type.localeCompare(b.type)),
    installDefinitions
  };
}

/**
 * Merges install-only definitions into a working registry so live plugin
 * sections are resolvable even when the consumer has not declared them.
 */
export function applyInstallOnlyDefinitions(
  registry: SectionRegistry,
  syncResult: WordPressSectionSyncResult
): SectionRegistry {
  const merged = new Map(registry);
  for (const definition of syncResult.installDefinitions) {
    if (!merged.has(definition.type)) {
      merged.set(definition.type, {
        definition: {
          type: definition.type,
          sourceType: definition.type,
          dataSchema: { fields: definition.fields }
        }
      });
    }
  }
  return merged;
}