import type { ContentConfig, NexusConfig } from "./types.ts";
import { ConfigError } from "./errors.ts";

export function resolveContentConfig(
  config: NexusConfig,
  contentName: string
): ContentConfig {
  const entry = config.content[contentName];

  if (!entry) {
    const available = Object.keys(config.content);
    const hint =
      available.length > 0
        ? ` Available content names: ${available.join(", ")}.`
        : "";

    throw new ConfigError(
      `Content "${contentName}" is not configured.${hint}`,
      { content: contentName, operation: "resolve" }
    );
  }

  if (!entry.provider) {
    throw new ConfigError(
      `Content "${contentName}" does not declare a provider.`,
      { content: contentName, operation: "resolve" }
    );
  }

  if (!entry.key) {
    throw new ConfigError(
      `Content "${contentName}" does not declare a provider key.`,
      { content: contentName, operation: "resolve" }
    );
  }

  return entry;
}
