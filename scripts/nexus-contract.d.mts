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

export interface CommandOptions {
  command?: string;
  help?: boolean;
  customPath?: string;
  writePath?: string;
  schemaPath?: string;
  contractPath?: string;
  apiRoot?: string;
  username?: string;
  appPassword?: string;
}

export declare const root: string;
export declare const BUNDLED_SECTIONS_PATH: string;
export declare const ALLOWED_FIELD_TYPES: Set<string>;
export declare const RESERVED_PREFIXES: string[];
export declare const FIELD_PATTERN: RegExp;
export declare const USAGE: string;

export declare function phpString(value: unknown): string;
export declare function schemaRouteUrl(input: string): string;
export declare function projectContractRouteUrl(input: string): string;
export declare function installedSet(definitions: unknown): Set<string>;
export declare function loadBundledSections(): Set<string>;
export declare function fetchInstalledSections(apiRoot: string): Promise<Set<string>>;
export declare function normalizeCustomSections(
  raw: unknown,
  installed: Set<string>
): Map<string, CustomSection>;
export declare function loadContract(raw: unknown): ProjectContract | null;
export declare function expectedTypes(
  contract: ProjectContract | null,
  custom: Map<string, CustomSection>
): string[];
export declare function classify(input: {
  installed: Set<string>;
  custom: Map<string, CustomSection>;
  contract: ProjectContract | null;
}): ClassificationResult;
export declare function deriveContractFromSchema(
  schemaPath: string,
  apiRoot: string | undefined
): Promise<ProjectContract>;
export declare function renderPhp(emitted: CustomSection[]): string;
export declare function generateCommand(options: CommandOptions): Promise<void>;
export declare function pushCommand(options: CommandOptions): Promise<void>;
export declare function parseArgs(argv: string[]): CommandOptions;
export declare function main(argv?: string[]): Promise<void>;