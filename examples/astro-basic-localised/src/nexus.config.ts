import type { NexusConfig } from "@nexuscontent/core";
import { defaultLocale, supportedLocales } from "./app/locale";

// Provider setup is application-owned and may combine committed defaults with
// environment-specific values. Secrets must remain in environment variables.
export const gitProviderOptions = {
  contentPath:
    (import.meta.env.NEXUS_GIT_CONTENT_PATH as string | undefined) ?? "content"
};

// NexusContent configuration declares provider instances, logical content
// mappings, locale rules, and dedicated navigation and settings sections.
export const nexusConfig = {
  providers: {
    git: { type: "git", options: gitProviderOptions }
  },
  locales: {
    default: defaultLocale,
    supported: [...supportedLocales]
  },
  content: {
    home: { provider: "git", key: "home" },
    about: { provider: "git", key: "about" },
    services: { provider: "git", key: "services" },
    contact: { provider: "git", key: "contact" },
    blog: { provider: "git", key: "posts" }
  },
  navigation: {
    primary: { provider: "git", key: "primary" }
  },
  settings: {
    site: { provider: "git", key: "site" }
  }
} satisfies NexusConfig;
