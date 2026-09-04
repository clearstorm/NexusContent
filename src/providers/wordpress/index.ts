export { WordPressProvider } from "./provider.ts";
export type {
  WordPressCollectionConfig,
  WordPressProviderOptions
} from "./provider.ts";
export { WordPressMediaProvider } from "./media.ts";
export type { WordPressMediaProviderOptions } from "./media.ts";
export type { WordPressContentData } from "./normalize.ts";
export {
  normalizeCompanionPage,
  normalizeCompanionPageItem
} from "./companion-normalize.ts";
export { WordPressCompanionClient, deriveRestRoot } from "./companion-client.ts";

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
export type { BuiltinSectionType, FixedSectionType } from "./config.ts";

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
  WordPressCapabilitiesData,
  WordPressCapabilitiesResponse,
  WordPressCompanionEnvelope,
  WordPressDiagnostic,
  WordPressDiagnosticsSeverity,
  WordPressPageData,
  WordPressPageResponse,
  WordPressPageSection,
  WordPressPagesData,
  WordPressPagesResponse,
  WordPressPagination,
  WordPressProjectComponentContract,
  WordPressProviderFacingCapabilities,
  WordPressSchemaData,
  WordPressSchemaResponse,
  WordPressSeoData,
  WordPressSeoImage,
  WordPressSectionSchema,
  WordPressSectionSchemaField,
  WordPressSectionSyncConflict,
  WordPressSectionSyncResult,
  WordPressSectionSyncStatus,
  WordPressSettingsData,
  WordPressSettingsResponse
} from "./responses.ts";
export {
  buildCompanionContractVersion,
  isValidCompanionContractVersion
} from "./responses.ts";

export {
  applyInstallOnlyDefinitions,
  reconcileSectionRegistry
} from "./schema-sync.ts";

export {
  validateWordPressComponents,
  type WordPressComponentFieldDelta,
  type WordPressComponentValidationOptions,
  type WordPressComponentValidationResult
} from "./schema-validation.ts";

export { WORDPRESS_ERROR_CODES, isWordPressErrorCode } from "./errors.ts";
export type { WordPressErrorCode } from "./errors.ts";

export {
  capabilitiesSchema,
  companionCapabilitiesResponseSchema,
  companionEnvelopeSchema,
  companionPageResponseSchema,
  companionPagesResponseSchema,
  companionSchemaResponseSchema,
  companionSettingsResponseSchema,
  diagnosticSchema,
  diagnosticSeveritySchema,
  jsonValueSchema,
  pageDataSchema,
  pageSectionWireSchema,
  pagesDataSchema,
  paginationSchema,
  schemaDataSchema,
  sectionSchemaSchema,
  sectionSchemaFieldSchema,
  sectionSettingsWireSchema
} from "./companion-schemas.ts";

export {
  parseGutenbergBlocks,
  parseGutenbergToSections
} from "./core-gutenberg.ts";

export {
  extractAcfFields,
  extractAcfFixedFields,
  extractAcfBlocks
} from "./core-acf-blocks.ts";

export {
  normalizeAcfImageToMediaAsset,
  normalizeFeaturedMedia,
  createMediaAssetFromId
} from "./core-media.ts";

export {
  generateDeterministicSectionId,
  resolveSectionIds,
  ensureUniqueSectionIds
} from "./core-section-ids.ts";
