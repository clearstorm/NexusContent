import type { CollectionItem, PageContent } from "../../core/types.ts";
import type { ContentProvider } from "../../core/provider.ts";
import { ProviderError } from "../../core/errors.ts";
import { loadCollectionFiles, loadItemFile, loadPageFile } from "./loader.ts";
import { normalizeRawItem, normalizeRawPage } from "./normalize.ts";

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
    key: string
  ): Promise<PageContent<TData> | null> {
    const file = await loadPageFile(this.contentPath, key);
    if (file === null) {
      return null;
    }

    const page = normalizeRawPage(file.data, {
      key,
      sourceId: file.relativePath,
      updatedAt: file.updatedAt
    });

    return page as unknown as PageContent<TData>;
  }

  async getCollection<TData = Record<string, unknown>>(
    collection: string
  ): Promise<CollectionItem<TData>[]> {
    const files = await loadCollectionFiles(this.contentPath, collection);

    return files.map(
      (file) =>
        normalizeRawItem(file.data, {
          key: file.relativePath.split("/").at(-1)!.replace(/\.json$/, ""),
          sourceId: file.relativePath,
          updatedAt: file.updatedAt
        }) as unknown as CollectionItem<TData>
    );
  }

  async getItem<TData = Record<string, unknown>>(
    collection: string,
    key: string
  ): Promise<CollectionItem<TData> | null> {
    const file = await loadItemFile(this.contentPath, collection, key);
    if (file === null) {
      return null;
    }

    const item = normalizeRawItem(file.data, {
      key,
      sourceId: file.relativePath,
      updatedAt: file.updatedAt
    });

    return item as unknown as CollectionItem<TData>;
  }
}
