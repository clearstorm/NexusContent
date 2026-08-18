import type { SeoDefaults } from "@nexuscontent/core";

const siteUrl = "https://nexuscontent.dev";

export function canonicalUrl(pathname: string): string {
  return new URL(pathname, siteUrl).href;
}

export function siteSeoDefaults(): SeoDefaults {
  return {
    siteTitle: "NexusContent Example",
    defaultImage: {
      url: "https://nexuscontent.dev/social-default.jpg",
      alt: "NexusContent"
    }
  };
}
