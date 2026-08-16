import { GitProvider, NexusContent } from "@nexuscontent/core";
import type { RetrievalOptions } from "@nexuscontent/core";
import { defaultLocale, supportedLocales } from "./app/locale";

const contentPath =
  (import.meta.env.NEXUS_GIT_CONTENT_PATH as string | undefined) ?? "content";

export const nexus = new NexusContent({
  providers: {
    git: { type: "git", options: { contentPath } }
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
});

nexus.register("git", new GitProvider({ contentPath }));

export async function getPageContent(
  name: string,
  options?: RetrievalOptions
) {
  return nexus.getPage(name, options);
}

export async function getNavigationContent(
  name: string,
  options?: RetrievalOptions
) {
  return nexus.getNavigation(name, options);
}

export async function getSettingsContent(
  name: string,
  options?: RetrievalOptions
) {
  return nexus.getSettings(name, options);
}

export async function getCollectionContent(
  name: string,
  options?: RetrievalOptions
) {
  return nexus.getCollection(name, options);
}

export async function getItemContent(
  collection: string,
  key: string,
  options?: RetrievalOptions
) {
  return nexus.getItem(collection, key, options);
}
