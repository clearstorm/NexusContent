import { NexusContent, WordPressProvider } from "@nexuscontent/core";
import type { ContentSection, MediaAsset, PageStatus, RetrievalOptions, WordPressContentData } from "@nexuscontent/core";
import { nexusConfig, wordpressProviderOptions } from "./nexus.config";

const nexus = new NexusContent(nexusConfig);

nexus.register("wordpress", new WordPressProvider(wordpressProviderOptions));

/**
 * Content shape that works for both standard REST and companion plugin modes.
 *
 * Standard REST: data.fields contains ACF fields, data.content is rendered HTML.
 * Companion: sections[] contains structured ContentSection array, data contains
 * raw fields from the plugin.
 */
export type WordPressExampleContent = WordPressContentData & {
  sections?: ContentSection[];
  status?: PageStatus;
  excerpt?: string;
  featuredImage?: MediaAsset;
  modifiedAt?: string;
};

export function getPageContent<TData extends Record<string, unknown>>(
  name: string,
  options?: RetrievalOptions
) {
  return nexus.getPage<TData>(name, options);
}

export function getCollectionContent<TData extends Record<string, unknown>>(
  name: string,
  options?: RetrievalOptions
) {
  return nexus.getCollection<TData>(name, options);
}

export function getItemContent<TData extends Record<string, unknown>>(
  collection: string,
  key: string,
  options?: RetrievalOptions
) {
  return nexus.getItem<TData>(collection, key, options);
}

export function getNavigationContent(
  name: string,
  options?: RetrievalOptions
) {
  return nexus.getNavigation(name, options);
}

export function getSettingsContent(
  name: string,
  options?: RetrievalOptions
) {
  return nexus.getSettings(name, options);
}
