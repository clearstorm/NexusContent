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

export interface WordPressPageData {
  readonly id: string;
  readonly key: string;
  readonly slug?: string;
  readonly title?: string;
  readonly status?: PageStatus;
  readonly excerpt?: string;
  readonly featuredImage?: MediaAsset;
  readonly modifiedAt?: string;
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

export interface WordPressProviderFacingCapabilities {
  readonly editorMode: WordPressEditorMode;
  readonly gutenberg: boolean;
  readonly acfFlexible: boolean;
  readonly acfFixed: boolean;
  readonly acfFields: boolean;
  readonly mediaLibrary: boolean;
  readonly customPostTypes: boolean;
  readonly sections: boolean;
  readonly localeAware: boolean;
  readonly previewSupport: boolean;
  readonly webhookSupport: boolean;
}

export function buildCompanionContractVersion(): typeof COMPANION_CONTRACT_VERSION {
  return COMPANION_CONTRACT_VERSION;
}

export function isValidCompanionContractVersion(
  value: unknown
): value is typeof COMPANION_CONTRACT_VERSION {
  return value === COMPANION_CONTRACT_VERSION;
}
