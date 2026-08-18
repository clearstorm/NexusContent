import { NexusContent, WordPressProvider } from "@nexuscontent/core";
import type { RetrievalOptions, WordPressContentData } from "@nexuscontent/core";
import { nexusConfig, wordpressProviderOptions } from "./nexus.config";

const nexus = new NexusContent(nexusConfig);

nexus.register("wordpress", new WordPressProvider(wordpressProviderOptions));

export type WordPressExampleContent = WordPressContentData & Record<string, unknown>;

// The base provider ignores locale options; forwarding them still proves the
// consumer and Core locale boundary without claiming WPML/Polylang support.
export function getPageContent<TData extends Record<string, unknown>>(
  name: string,
  options: RetrievalOptions
) {
  return nexus.getPage<TData>(name, options);
}

export function getCollectionContent<TData extends Record<string, unknown>>(
  name: string,
  options: RetrievalOptions
) {
  return nexus.getCollection<TData>(name, options);
}

export function getItemContent<TData extends Record<string, unknown>>(
  collection: string,
  key: string,
  options: RetrievalOptions
) {
  return nexus.getItem<TData>(collection, key, options);
}

export function getNavigationContent(
  name: string,
  options: RetrievalOptions
) {
  return nexus.getNavigation(name, options);
}

export function getSettingsContent(
  name: string,
  options: RetrievalOptions
) {
  return nexus.getSettings(name, options);
}
