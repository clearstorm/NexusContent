import type { ContentConfig, NexusConfig } from "./types.ts";
import { ConfigError } from "./errors.ts";

function resolveConfigSection(
  section: Record<string, ContentConfig> | undefined,
  contentName: string,
  category: string,
  operation: string
): ContentConfig {
  const entry = section?.[contentName];

  if (!entry) {
    const available = Object.keys(section ?? {});
    const hint =
      available.length > 0
        ? ` Available ${category.toLowerCase()} names: ${available.join(", ")}.`
        : "";

    throw new ConfigError(
      `${category} "${contentName}" is not configured.${hint}`,
      { content: contentName, operation }
    );
  }

  if (!entry.provider) {
    throw new ConfigError(
      `${category} "${contentName}" does not declare a provider.`,
      { content: contentName, operation }
    );
  }

  if (!entry.key) {
    throw new ConfigError(
      `${category} "${contentName}" does not declare a provider key.`,
      { content: contentName, operation }
    );
  }

  return entry;
}

export function resolveContentConfig(
  config: NexusConfig,
  contentName: string
): ContentConfig {
  return resolveConfigSection(config.content, contentName, "Content", "resolve");
}

export function resolveNavigationConfig(
  config: NexusConfig,
  navigationName: string
): ContentConfig {
  return resolveConfigSection(
    config.navigation,
    navigationName,
    "Navigation",
    "resolveNavigation"
  );
}

export function resolveSettingsConfig(
  config: NexusConfig,
  settingsName: string
): ContentConfig {
  return resolveConfigSection(
    config.settings,
    settingsName,
    "Settings",
    "resolveSettings"
  );
}
