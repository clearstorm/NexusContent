export interface FormatContext {
  filePath?: string;
  provider?: string;
  operation?: string;
}

export interface FormatAdapter<T = unknown> {
  readonly id: string;
  readonly extensions: readonly string[];
  parse(source: string, context?: FormatContext): T;
  serialize(value: T, context?: FormatContext): string;
}
