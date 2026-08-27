import { defineNexusConfig } from "@nexuscontent/core";
import type { WordPressProviderOptions } from "@nexuscontent/core";
import { models } from "./schema/schema";

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

  // "core" uses standard WordPress REST published-page and post retrieval
  // only. It never calls the companion plugin, so no editor mode, section,
  // or companion options are configured in this plugin-neutral consumer.
  apiStrategy: "core"
} satisfies WordPressProviderOptions;

// NexusContent configuration declares provider instances and a model schema.
// The schema in ./schema/schema declares the WordPress ACF blocks each page
// expects, provider-kind, and post source keys. Navigation and settings are
// app-owned constants in the layout, so no models are declared for them.
export const nexusConfig = defineNexusConfig({
  providers: {
    wordpress: { type: "wordpress", options: wordpressProviderOptions }
  },
  schema: { models }
});