import { GitProvider, NexusContent } from "@nexuscontent/core";
import type { RetrievalOptions } from "@nexuscontent/core";
import { gitProviderOptions, nexusConfig } from "./nexus.config";

export const nexus = new NexusContent(nexusConfig);

nexus.register("git", new GitProvider(gitProviderOptions));

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
