export { WordPressProvider } from "./provider.ts";
export type {
  WordPressCollectionConfig,
  WordPressProviderOptions
} from "./provider.ts";
export type { WordPressContentData } from "./normalize.ts";

export type {
  WordPressAcfConfig,
  WordPressApiStrategy,
  WordPressEditorMode,
  WordPressFixedSectionConfig,
  WordPressMediaResolution,
  WordPressUnknownContentPolicy
} from "./config.ts";
export {
  BUILTIN_SECTION_TYPES,
  COMPANION_CONTRACT_VERSION,
  COMPANION_WIRE_ENDPOINTS,
  COMPANION_WIRE_NAMESPACE,
  DEFAULT_WORDPRESS_ACF_ENABLED,
  DEFAULT_WORDPRESS_API_STRATEGY,
  DEFAULT_WORDPRESS_EDITOR_MODE,
  DEFAULT_WORDPRESS_MEDIA_RESOLUTION,
  DEFAULT_WORDPRESS_UNKNOWN_CONTENT_POLICY,
  FIXED_SECTION_TYPES,
  RESERVED_COMPANION_PREFIXES,
  isFixedSectionType,
  isValidApiStrategy,
  isValidEditorMode,
  isValidMediaResolution,
  isValidUnknownContentPolicy
} from "./config.ts";
export type { FixedSectionType } from "./config.ts";

export type {
  SectionDataSchema,
  SectionDefinition,
  SectionFieldDefinition,
  SectionRegistry,
  SectionRegistryEntry,
  SectionRegistryOptions
} from "./sections.ts";
export {
  buildSectionRegistry,
  lookupSectionSourceAlias,
  mergeSectionRegistry
} from "./sections.ts";

export type {
  WordPressCapabilities,
  WordPressDiagnostic,
  WordPressDiagnosticsSeverity,
  WordPressHealthResponse,
  WordPressPageResponse,
  WordPressPageSection,
  WordPressPagesResponse,
  WordPressPagination,
  WordPressProviderFacingCapabilities,
  WordPressSchemaResponse,
  WordPressSectionSchema,
  WordPressSectionSchemaField,
  WordPressSectionsResponse
} from "./responses.ts";
export {
  buildCompanionContractVersion,
  isValidCompanionContractVersion
} from "./responses.ts";

export { WORDPRESS_ERROR_CODES, isWordPressErrorCode } from "./errors.ts";
export type { WordPressErrorCode } from "./errors.ts";

export {
  capabilitiesSchema,
  companionHealthResponseSchema,
  companionPageResponseSchema,
  companionPagesResponseSchema,
  companionSchemaResponseSchema,
  companionSectionsResponseSchema,
  diagnosticSchema,
  diagnosticSeveritySchema,
  jsonValueSchema,
  pageSectionWireSchema,
  paginationSchema,
  sectionSchemaSchema,
  sectionSchemaFieldSchema,
  sectionSettingsWireSchema
} from "./companion-schemas.ts";
