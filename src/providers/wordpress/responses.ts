import type { JsonValue } from "../../core/types.ts";
import { COMPANION_CONTRACT_VERSION } from "./config.ts";

export type WordPressDiagnosticsSeverity = "error" | "warning" | "info";

export interface WordPressDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: WordPressDiagnosticsSeverity;
  readonly path?: string;
}

export interface WordPressPageResponse {
  readonly contractVersion: number;
  readonly contract: "companion-page";
  readonly id: string;
  readonly key: string;
  readonly slug?: string;
  readonly title?: string;
  readonly status?: string;
  readonly excerpt?: string;
  readonly modifiedAt?: string;
  readonly sections: ReadonlyArray<WordPressPageSection>;
  readonly rawFields: Record<string, JsonValue>;
  readonly diagnostics: ReadonlyArray<WordPressDiagnostic>;
}

export interface WordPressPageSection {
  readonly type: string;
  readonly settings?: Record<string, JsonValue>;
  readonly data: Record<string, JsonValue>;
}

export interface WordPressPagesResponse {
  readonly contractVersion: number;
  readonly contract: "companion-pages";
  readonly items: ReadonlyArray<WordPressPageResponse>;
  readonly pagination: WordPressPagination;
  readonly diagnostics: ReadonlyArray<WordPressDiagnostic>;
}

export interface WordPressSectionSchemaField {
  readonly name: string;
  readonly type: string;
  readonly required?: boolean;
  readonly default?: JsonValue;
}

export interface WordPressSectionSchema {
  readonly type: string;
  readonly sourceType: string;
  readonly sourceKey?: string;
  readonly fields: ReadonlyArray<WordPressSectionSchemaField>;
}

export interface WordPressSchemaResponse {
  readonly contractVersion: number;
  readonly contract: "companion-schema";
  readonly sections: ReadonlyArray<WordPressSectionSchema>;
  readonly capabilities: WordPressCapabilities;
  readonly diagnostics: ReadonlyArray<WordPressDiagnostic>;
}

export interface WordPressSectionsResponse {
  readonly contractVersion: number;
  readonly contract: "companion-sections";
  readonly sections: ReadonlyArray<WordPressPageSection>;
  readonly diagnostics: ReadonlyArray<WordPressDiagnostic>;
}

export interface WordPressHealthResponse {
  readonly contractVersion: number;
  readonly contract: "companion-health";
  readonly status: "healthy" | "degraded";
  readonly editorMode: string;
  readonly apiStrategy: string;
  readonly diagnostics: ReadonlyArray<WordPressDiagnostic>;
}

export interface WordPressPagination {
  readonly total: number;
  readonly totalPages: number;
  readonly page: number;
  readonly perPage: number;
}

export interface WordPressCapabilities {
  readonly visualEditor: boolean;
  readonly codeEditor: boolean;
  readonly blocksEditor: boolean;
  readonly acfFields: boolean;
  readonly mediaLibrary: boolean;
  readonly customPostTypes: boolean;
  readonly sections: boolean;
}

export interface WordPressProviderFacingCapabilities {
  readonly visualEditor: boolean;
  readonly codeEditor: boolean;
  readonly blocksEditor: boolean;
  readonly acfFields: boolean;
  readonly mediaLibrary: boolean;
  readonly customPostTypes: boolean;
  readonly sections: boolean;
  readonly localeAware: boolean;
  readonly previewSupport: boolean;
  readonly webhookSupport: boolean;
}

export function buildCompanionContractVersion(): number {
  return COMPANION_CONTRACT_VERSION;
}

export function isValidCompanionContractVersion(
  value: unknown
): value is number {
  return typeof value === "number" && value === COMPANION_CONTRACT_VERSION;
}
