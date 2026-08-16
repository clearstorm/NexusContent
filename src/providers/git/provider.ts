import type {
  CollectionItem,
  NavigationContent,
  PageContent,
  SettingsContent,
  SingletonContent
} from "../../core/types.ts";
import type {
  ContentProvider,
  ProviderRetrievalOptions
} from "../../core/provider.ts";
import { ProviderError } from "../../core/errors.ts";
import {
  loadCollectionFiles,
  loadItemFile,
  loadNavigationFile,
  loadPageFile,
  loadSettingsFile,
  loadSingletonFile
} from "./loader.ts";
import {
  normalizeRawItem,
  normalizeRawNavigation,
  normalizeRawPage,
  normalizeRawSettings,
  normalizeRawSingleton
} from "./normalize.ts";

export interface GitProviderOptions {
  contentPath: string;
  name?: string;
}

export class GitProvider implements ContentProvider {
  readonly name: string;
  private readonly contentPath: string;

  constructor(options: GitProviderOptions) {
    if (!options.contentPath) {
      throw new ProviderError(
        "GitProvider requires a contentPath.",
        {
          provider: "git",
          operation: "constructor",
          reason: "No contentPath was provided."
        }
      );
    }

    this.contentPath = options.contentPath;
    this.name = options.name ?? "git";
  }

  async getPage<TData = Record<string, unknown>>(
    key: string,
    options: ProviderRetrievalOptions = {}
  ): Promise<PageContent<TData> | null> {
    const file = await loadPageFile(this.contentPath, key, options);
    if (file === null) {
      return null;
    }

    const page = normalizeRawPage(file.data, {
      key,
      sourceId: file.relativePath,
      updatedAt: file.updatedAt,
      locale: file.locale
    });

    return page as unknown as PageContent<TData>;
  }

  async getSingleton<TData = Record<string, unknown>>(
    key: string,
    options: ProviderRetrievalOptions = {}
  ): Promise<SingletonContent<TData> | null> {
    const file = await loadSingletonFile(this.contentPath, key, options);
    if (file === null) {
      return null;
    }

    const singleton = normalizeRawSingleton(file.data, {
      key,
      sourceId: file.relativePath,
      updatedAt: file.updatedAt,
      locale: file.locale
    });

    return singleton as unknown as SingletonContent<TData>;
  }

  async getNavigation(
    key: string,
    options: ProviderRetrievalOptions = {}
  ): Promise<NavigationContent | null> {
    const file = await loadNavigationFile(this.contentPath, key, options);
    if (file === null) {
      return null;
    }

    return normalizeRawNavigation(file.data, {
      key,
      sourceId: file.relativePath,
      updatedAt: file.updatedAt,
      locale: file.locale
    });
  }

  async getSettings<TData = Record<string, unknown>>(
    key: string,
    options: ProviderRetrievalOptions = {}
  ): Promise<SettingsContent<TData> | null> {
    const file = await loadSettingsFile(this.contentPath, key, options);
    if (file === null) {
      return null;
    }

    const settings = normalizeRawSettings(file.data, {
      key,
      sourceId: file.relativePath,
      updatedAt: file.updatedAt,
      locale: file.locale
    });

    return settings as unknown as SettingsContent<TData>;
  }

  async getCollection<TData = Record<string, unknown>>(
    collection: string,
    options: ProviderRetrievalOptions = {}
  ): Promise<CollectionItem<TData>[]> {
    const files = await loadCollectionFiles(this.contentPath, collection, options);

    return files.map(
      (file) =>
        normalizeRawItem(file.data, {
          key: file.relativePath.split("/").at(-1)!.replace(/\.json$/, ""),
          sourceId: file.relativePath,
          updatedAt: file.updatedAt,
          locale: file.locale
        }) as unknown as CollectionItem<TData>
    );
  }

  async getItem<TData = Record<string, unknown>>(
    collection: string,
    key: string,
    options: ProviderRetrievalOptions = {}
  ): Promise<CollectionItem<TData> | null> {
    const file = await loadItemFile(this.contentPath, collection, key, options);
    if (file === null) {
      return null;
    }

    const item = normalizeRawItem(file.data, {
      key,
      sourceId: file.relativePath,
      updatedAt: file.updatedAt,
      locale: file.locale
    });

    return item as unknown as CollectionItem<TData>;
  }
}
