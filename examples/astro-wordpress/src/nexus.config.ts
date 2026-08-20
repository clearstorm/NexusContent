import type { NexusConfig, WordPressProviderOptions } from "@nexuscontent/core";

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

export const wordpressProviderOptions = {
  baseUrl: wordpressApiUrl,
  headers: authHeaders,

  // "auto" tries the companion plugin first, falls back to standard REST.
  apiStrategy: "auto",

  // "gutenberg" parses WordPress block markup into canonical sections.
  // "acf_flexible" extracts from ACF Flexible Content layouts.
  // "acf_fixed" extracts from fixed ACF field groups.
  editorMode: "gutenberg",

  // "error" throws on unknown sections, "ignore" skips, "html" preserves raw.
  unknownContentPolicy: "error",

  // "full" resolves all media, "embedded" uses _embedded only, "none" skips.
  mediaResolution: "full"
} satisfies WordPressProviderOptions;

export const nexusConfig = {
  providers: {
    wordpress: { type: "wordpress", options: wordpressProviderOptions }
  },
  content: {
    home: { provider: "wordpress", key: "home" },
    about: { provider: "wordpress", key: "about" },
    services: { provider: "wordpress", key: "services" },
    contact: { provider: "wordpress", key: "contact" },
    blog: { provider: "wordpress", key: "posts" }
  },
  navigation: {
    primary: { provider: "wordpress", key: "primary" }
  },
  settings: {
    site: { provider: "wordpress", key: "site" }
  }
} satisfies NexusConfig;
