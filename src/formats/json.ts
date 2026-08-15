import { ProviderError } from "../core/errors.ts";
import type { FormatAdapter, FormatContext } from "./types.ts";

function describeFile(context?: FormatContext): string {
  return context?.filePath !== undefined ? context.filePath : "content";
}

export const jsonFormatAdapter: FormatAdapter<unknown> = {
  id: "json",
  extensions: [".json"],

  parse(source, context) {
    try {
      return JSON.parse(source);
    } catch (error) {
      throw new ProviderError(
        `Content file "${describeFile(context)}" contains malformed JSON.`,
        {
          provider: context?.provider,
          operation: context?.operation,
          content: context?.filePath,
          reason: error instanceof Error ? error.message : String(error)
        }
      );
    }
  },

  serialize(value, context) {
    try {
      return `${JSON.stringify(value, null, 2)}\n`;
    } catch (error) {
      throw new ProviderError(
        `Content file "${describeFile(context)}" could not be serialized as JSON.`,
        {
          provider: context?.provider,
          operation: context?.operation,
          content: context?.filePath,
          reason: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }
};
