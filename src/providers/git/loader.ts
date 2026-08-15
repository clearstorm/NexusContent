import { readFile as readFileFromDisk, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { ProviderError } from "../../core/errors.ts";
import { jsonFormatAdapter } from "../../formats/index.ts";

export interface RawFile {
  data: unknown;
  relativePath: string;
  updatedAt?: string;
}

function resolveWithinRoot(contentPath: string, segments: string[]): string {
  const root = path.resolve(contentPath);
  const resolved = path.resolve(root, ...segments);
  const relative = path.relative(root, resolved);

  if (relative === "" || relative.startsWith("..")) {
    throw new ProviderError(
      `Content path "${segments.join("/")}" escapes the configured content root.`,
      {
        provider: "git",
        operation: "load",
        content: segments.join("/"),
        reason: "Content keys must resolve inside the configured content root."
      }
    );
  }

  return resolved;
}

async function readFile(filePath: string, relativePath: string): Promise<RawFile> {
  let contents: string;
  let fileStat;

  try {
    contents = await readFileFromDisk(filePath, "utf8");
  } catch (error) {
    throw new ProviderError(
      `Could not read content file "${relativePath}".`,
      {
        provider: "git",
        operation: "load",
        content: relativePath,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }

  try {
    fileStat = await stat(filePath);
  } catch {
    fileStat = undefined;
  }

  const data = jsonFormatAdapter.parse(contents, {
    filePath: relativePath,
    provider: "git",
    operation: "load"
  });

  return {
    data,
    relativePath,
    updatedAt: fileStat ? fileStat.mtime.toISOString() : undefined
  };
}

export async function loadPageFile(
  contentPath: string,
  key: string
): Promise<RawFile | null> {
  const relativePath = `pages/${key}.json`;
  const filePath = resolveWithinRoot(contentPath, ["pages", `${key}.json`]);

  try {
    await stat(filePath);
  } catch (error) {
    if (isMissingError(error)) {
      return null;
    }
    throw new ProviderError(
      `Could not access content file "${relativePath}".`,
      {
        provider: "git",
        operation: "load",
        content: relativePath,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }

  return readFile(filePath, relativePath);
}

export async function loadCollectionFiles(
  contentPath: string,
  collection: string
): Promise<RawFile[]> {
  const relativeDir = `collections/${collection}`;
  const dirPath = resolveWithinRoot(contentPath, ["collections", collection]);

  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch (error) {
    if (isMissingError(error)) {
      return [];
    }
    throw new ProviderError(
      `Could not access collection directory "${relativeDir}".`,
      {
        provider: "git",
        operation: "loadCollection",
        content: relativeDir,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }

  const jsonFiles = entries
    .filter((entry) => entry.endsWith(".json"))
    .sort();

  const files: RawFile[] = [];
  for (const entry of jsonFiles) {
    const relativePath = `${relativeDir}/${entry}`;
    const filePath = path.join(dirPath, entry);
    files.push(await readFile(filePath, relativePath));
  }

  return files;
}

export async function loadItemFile(
  contentPath: string,
  collection: string,
  key: string
): Promise<RawFile | null> {
  const relativePath = `collections/${collection}/${key}.json`;
  const filePath = resolveWithinRoot(contentPath, ["collections", collection, `${key}.json`]);

  try {
    await stat(filePath);
  } catch (error) {
    if (isMissingError(error)) {
      return null;
    }
    throw new ProviderError(
      `Could not access content file "${relativePath}".`,
      {
        provider: "git",
        operation: "loadItem",
        content: relativePath,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }

  return readFile(filePath, relativePath);
}

function isMissingError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
