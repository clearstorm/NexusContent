import { defineNexusConfig } from "@nexuscontent/core";
import type { WordPressProviderOptions } from "@nexuscontent/core";
import { schema } from "./schema/schema";

const wordpressApiUrl = import.meta.env.WORDPRESS_API_URL as string | undefined;

if (!wordpressApiUrl) {
  throw new Error(
    "WORDPRESS_API_URL is required and must be the full WordPress REST API root, including /wp-json/wp/v2."
  );
}

const username = import.meta.env.WORDPRESS_USERNAME as string | undefined;
const appPassword = import.meta.env.WORDPRESS_APP_PASSWORD as string | undefined;

const authHeaders: Record<string, string> = {};
if (username && appPassword) {
  const credentials = Buffer.from(`${username}:${appPassword}`).toString("base64");
  authHeaders.Authorization = `Basic ${credentials}`;
}

// Provider setup is application-owned and may combine committed defaults with
// environment-specific values. Secrets must remain in environment variables.
export const gitProviderOptions = {
  contentPath:
    (import.meta.env.NEXUS_GIT_CONTENT_PATH as string | undefined) ?? "content"
};

export const wordpressProviderOptions = {
  baseUrl: wordpressApiUrl,
  headers: authHeaders,

  // Phase 3 companion-first retrieval: pages and posts are served through the
  // companion plugin's `nexuscontent/v1` routes, which carry normalized
  // sections, and the provider surfaces them as `data.sections` on items — the
  // same canonical shape the Git blog posts author. The strict "companion"
  // strategy fails loudly when the plugin is absent; use "auto" to fall back
  // to standard REST silently, or "core" to skip companion calls entirely
  // (the released 0.2.0 REST path).
  //
  // `editorMode` decides what shapes sections on the install:
  //   "gutenberg"    — Gutenberg posts become the canonical `data.sections`
  //     array (`{ type, data }`), matching the `sections` field the Git blog
  //     posts author. Gallery blocks become `gallery` sections, so WordPress
  //     and Git galleries render identically through the same grid component.
  //   "acf_flexible" — ACF flexible layouts become `data.sections` instead.
  //   "acf_fixed"    — ACF fixed groups (hero, intro, cta) flatten into named
  //     page fields.
  //
  // One instance is enough for this example because the shipped site reads its
  // pages from Git. Projects that need both at once can register two WordPress
  // instances (acf_fixed for pages, acf_flexible or gutenberg for posts) and
  // point each model's `source.provider` at the matching one.
  apiStrategy: "companion",
  editorMode: "gutenberg"

} satisfies WordPressProviderOptions;

// NexusContent configuration declares provider instances, a media provider,
// and a model schema. Each model maps a logical content name to a provider
// source (Git by default; flip `schema.source.provider` to "wordpress" to
// serve the same model from WordPress) and its field schema.
//
// `media.default` is "remote": absolute http(s) URLs are validated and passed
// through. Both the Git content files and normalized WordPress media use
// absolute URLs, so one media provider serves every image on the site.
export const nexusConfig = defineNexusConfig({
  providers: {
    git: { type: "git", options: gitProviderOptions },
    wordpress: { type: "wordpress", options: wordpressProviderOptions }
  },
  media: {
    default: "remote",
    providers: {
      remote: { type: "remote" }
    }
  },
  schema
});