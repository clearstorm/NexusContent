import { defineNexusConfig } from "@nexuscontent/core";
import { defaultLocale, supportedLocales } from "./app/locale";
import { models } from "./schema/schema";

// Provider setup is application-owned and may combine committed defaults with
// environment-specific values. Secrets must remain in environment variables.
export const gitProviderOptions = {
  contentPath:
    (import.meta.env.NEXUS_GIT_CONTENT_PATH as string | undefined) ?? "content"
};

// NexusContent configuration declares provider instances, locale rules, and a
// model schema. Locale variants are resolved per request with fallback chains.
export const nexusConfig = defineNexusConfig({
  providers: {
    git: { type: "git", options: gitProviderOptions }
  },
  locales: {
    default: defaultLocale,
    supported: [...supportedLocales]
  },
  schema: { models }
});
