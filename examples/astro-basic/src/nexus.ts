import { GitProvider, NexusContent } from "@nexuscontent/core";

const contentPath =
  (import.meta.env.NEXUS_GIT_CONTENT_PATH as string | undefined) ?? "content";

export const nexus = new NexusContent({
  providers: {
    git: { type: "git", options: { contentPath } }
  },
  content: {
    home: { provider: "git", key: "home" },
    about: { provider: "git", key: "about" },
    blog: { provider: "git", key: "posts" }
  },
  navigation: {
    primary: { provider: "git", key: "primary" }
  }
});

nexus.register("git", new GitProvider({ contentPath }));

export async function getPageContent(name: string) {
  return nexus.getPage(name);
}

export async function getNavigationContent(name: string) {
  return nexus.getNavigation(name);
}

export async function getCollectionContent(name: string) {
  return nexus.getCollection(name);
}

export async function getItemContent(collection: string, key: string) {
  return nexus.getItem(collection, key);
}
