export interface SectionFieldDefinition {
  name: string;
  type: string;
  required?: boolean;
  default?: string | number | boolean | null;
}

export interface CustomSection {
  type: string;
  fixed: boolean;
  label: string;
  fields: SectionFieldDefinition[];
}

export interface ProjectContract {
  components: string[];
  sectionTypes: string[];
  componentTypeMap: Record<string, string>;
}

export interface ClassificationResult {
  expected: string[];
  installed: string[];
  missing: string[];
  emittedTypes: string[];
  unusedCustom: string[];
  emitted: CustomSection[];
}

export declare const root: string;
export declare const SECTIONS_PATH: string;
export declare const ALLOWED_FIELD_TYPES: Set<string>;
export declare const RESERVED_PREFIXES: string[];
export declare const FIELD_PATTERN: RegExp;

export declare function phpString(value: unknown): string;
export declare function loadBaseSections(): Map<string, Record<string, unknown>>;
export declare function normalizeCustomSections(
  raw: unknown,
  base: Map<string, Record<string, unknown>>
): Map<string, CustomSection>;
export declare function loadContract(raw: unknown): ProjectContract | null;
export declare function expectedTypes(
  contract: ProjectContract | null,
  custom: Map<string, CustomSection>
): string[];
export declare function classify(input: {
  base: Map<string, Record<string, unknown>>;
  custom: Map<string, CustomSection>;
  contract: ProjectContract | null;
}): ClassificationResult;
export declare function renderPhp(emitted: CustomSection[]): string;
export declare function run(input: {
  customPath: string | undefined;
  contractPath: string | undefined;
  writePath: string | undefined;
}): void;