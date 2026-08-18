import type { SeoDefaults } from "@nexuscontent/core";

const siteUrl = "https://nexuscontent.dev";

export const siteSeoDefaults: SeoDefaults = {
  siteTitle: "NexusContent Example",
  defaultImage: {
    url: "https://nexuscontent.dev/social-default.jpg",
    alt: "NexusContent"
  }
};

export function canonicalUrl(pathname: string): string {
  return new URL(pathname, siteUrl).href;
}
