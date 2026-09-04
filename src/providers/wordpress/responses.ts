import type {
  JsonValue,
  MediaAsset,
  PageStatus
} from "../../core/types.ts";
import type { WordPressEditorMode } from "./config.ts";
import { COMPANION_CONTRACT_VERSION } from "./config.ts";

export type WordPressDiagnosticsSeverity = "error" | "warning" | "info";

export interface WordPressDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: WordPressDiagnosticsSeverity;
  readonly path?: string;
}

export interface WordPressCompanionEnvelope<T> {
  readonly contractVersion: typeof COMPANION_CONTRACT_VERSION;
  readonly data: T;
  readonly diagnostics?: ReadonlyArray<WordPressDiagnostic>;
}

export interface WordPressPageSection {
  readonly id: string;
  readonly type: string;
  readonly settings?: Record<string, JsonValue>;
  readonly data: Record<string, JsonValue>;
}

export interface WordPressSeoImage {
  readonly url: string;
  readonly alt?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface WordPressSeoData {
  readonly title?: string;
  readonly description?: string;
  readonly canonicalUrl?: string;
  readonly robots?: {
    readonly index?: boolean;
    readonly follow?: boolean;
    readonly noarchive?: boolean;
    readonly nosnippet?: boolean;
  };
  readonly openGraph?: {
    readonly title?: string;
    readonly description?: string;
    readonly type?: string;
    readonly siteName?: string;
    readonly url?: string;
    readonly locale?: string;
    readonly image?: WordPressSeoImage;
  };
  readonly twitter?: {
    readonly card?: "summary" | "summary_large_image";
    readonly title?: string;
    readonly description?: string;
    readonly url?: string;
    readonly site?: string;
    readonly image?: WordPressSeoImage;
  };
}

export interface WordPressPageData {
  readonly id: string;
  readonly key: string;
  readonly slug?: string;
  readonly title?: string;
  readonly status?: PageStatus;
  readonly excerpt?: string;
  readonly featuredImage?: MediaAsset;
  readonly modifiedAt?: string;
  readonly seo?: WordPressSeoData;
  readonly sections: ReadonlyArray<WordPressPageSection>;
  readonly rawFields: Record<string, JsonValue>;
}

export type WordPressPageResponse = WordPressCompanionEnvelope<WordPressPageData>;

export interface WordPressPagination {
  readonly total: number;
  readonly totalPages: number;
  readonly page: number;
  readonly perPage: number;
}

export interface WordPressPagesData {
  readonly items: ReadonlyArray<WordPressPageData>;
  readonly pagination: WordPressPagination;
}

export type WordPressPagesResponse = WordPressCompanionEnvelope<WordPressPagesData>;

export type WordPressSettingsData = Record<string, JsonValue>;
export type WordPressSettingsResponse = WordPressCompanionEnvelope<WordPressSettingsData>;

export interface WordPressSectionSchemaField {
  readonly name: string;
  readonly type: "string" | "number" | "boolean" | "json" | "media";
  readonly required?: boolean;
  readonly default?: JsonValue;
}

export interface WordPressSectionSchema {
  readonly type: string;
  readonly fields: ReadonlyArray<WordPressSectionSchemaField>;
}

export interface WordPressSchemaData {
  readonly editorModes: ReadonlyArray<WordPressEditorMode>;
  readonly sectionDefinitions: ReadonlyArray<WordPressSectionSchema>;
  readonly sourceMappings: Record<string, string>;
}

export type WordPressSchemaResponse = WordPressCompanionEnvelope<WordPressSchemaData>;

export interface WordPressCapabilities {
  readonly pluginVersion: string;
  readonly wordpressVersion: string;
  readonly gutenberg: boolean;
  readonly acf: boolean;
  readonly acfVersion?: string;
  readonly acfPro: boolean;
  readonly acfBlocks: boolean;
  readonly flexibleContent: boolean;
  readonly editorModes: ReadonlyArray<WordPressEditorMode>;
  readonly sectionTypes: ReadonlyArray<string>;
}

export type WordPressCapabilitiesData = WordPressCapabilities;
export type WordPressCapabilitiesResponse = WordPressCompanionEnvelope<WordPressCapabilitiesData>;

export type WordPressSectionSyncStatus = "synced" | "unsynced" | "none";

export interface WordPressSectionSyncConflict {
  readonly type: string;
  readonly source: string;
  readonly expected: string;
  readonly installed: string;
}

/**
 * Result of reconciling a consumer-declared section registry against the
 * live companion `/schema` response. Used to surface drift loudly.
 */
export interface WordPressSectionSyncResult {
  readonly knownTypes: ReadonlyArray<string>;
  readonly registryOnly: ReadonlyArray<string>;
  readonly installOnly: ReadonlyArray<string>;
  readonly conflicts: ReadonlyArray<WordPressSectionSyncConflict>;
  readonly installDefinitions: ReadonlyArray<WordPressSectionSchema>;
}

export interface WordPressProviderFacingCapabilities {
  readonly editorMode: WordPressEditorMode;
  readonly gutenberg: boolean;
  readonly acfFlexible: boolean;
  readonly acfFixed: boolean;
  readonly acfFields: boolean;
  readonly mediaLibrary: boolean;
  readonly customPostTypes: boolean;
  readonly sections: boolean;
  readonly sectionSync: WordPressSectionSyncStatus;
  readonly localeAware: boolean;
  readonly previewSupport: boolean;
  readonly webhookSupport: boolean;
}

/**
 * Serializable project component contract pushed to the companion plugin.
 * `components` are the consumer's declared component names; `sectionTypes`
 * are the canonical WordPress section types they resolve to.
 */
export interface WordPressProjectComponentContract {
  readonly components: ReadonlyArray<string>;
  readonly sectionTypes: ReadonlyArray<string>;
}

export function buildCompanionContractVersion(): typeof COMPANION_CONTRACT_VERSION {
  return COMPANION_CONTRACT_VERSION;
}

export function isValidCompanionContractVersion(
  value: unknown
): value is typeof COMPANION_CONTRACT_VERSION {
  return value === COMPANION_CONTRACT_VERSION;
}
