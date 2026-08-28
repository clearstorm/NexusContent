import { defineNexusConfig } from "@nexuscontent/core";
import { schema } from "./schema/schema";

// Provider setup is application-owned and may combine committed defaults with
// environment-specific values. Secrets must remain in environment variables.
export const gitProviderOptions = {
  contentPath:
    (import.meta.env.NEXUS_GIT_CONTENT_PATH as string | undefined) ?? "content",
  mediaRoot: "public/media",
  mediaPublicPath: "/media"
};

// NexusContent configuration declares provider instances, media providers,
// and a model schema. Each model maps a logical content name to a provider
// source and its field schema. Content mapping does not create frontend routes.
//
// `media.default` is "local": home.heroImage resolves public/media references
// to /media web URLs. The "remote" provider validates absolute http(s) URLs
// and is used by the about page field override.
export const nexusConfig = defineNexusConfig({
  providers: {
    git: { type: "git", options: gitProviderOptions }
  },
  media: {
    default: "local",
    providers: {
      local: {
        type: "local",
        options: {
          root: gitProviderOptions.mediaRoot,
          publicPath: gitProviderOptions.mediaPublicPath
        }
      },
      remote: {
        type: "remote"
      }
    }
  },
  schema
});
