import {
  readFile as readFileFromDisk,
  readdir,
  realpath,
  stat
} from "node:fs/promises";
import path from "node:path";
import { ProviderError } from "../../core/errors.ts";
import { jsonFormatAdapter } from "../../formats/index.ts";

export interface RawFile {
  data: unknown;
  relativePath: string;
  updatedAt?: string;
}

function buildPathEscapeError(relativePath: string): ProviderError {
  return new ProviderError(
    `Content path "${relativePath}" escapes the configured content root.`,
    {
      provider: "git",
      operation: "load",
      content: relativePath,
      reason: "Content keys must resolve inside the configured content root."
    }
  );
}

function isWithinRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolveWithinRoot(contentPath: string, segments: string[]): string {
  const root = path.resolve(contentPath);
  const resolved = path.resolve(root, ...segments);

  if (!isWithinRoot(root, resolved)) {
    throw buildPathEscapeError(segments.join("/"));
  }

  return resolved;
}

async function verifyRealPathWithinRoot(
  contentPath: string,
  targetPath: string,
  relativePath: string
): Promise<void> {
  let realRoot: string;
  let realTarget: string;

  try {
    [realRoot, realTarget] = await Promise.all([
      realpath(path.resolve(contentPath)),
      realpath(targetPath)
    ]);
  } catch (error) {
    throw new ProviderError(
      `Could not resolve content path "${relativePath}".`,
      {
        provider: "git",
        operation: "load",
        content: relativePath,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }

  if (!isWithinRoot(realRoot, realTarget)) {
    throw buildPathEscapeError(relativePath);
  }
}

async function readFile(
  contentPath: string,
  filePath: string,
  relativePath: string
): Promise<RawFile> {
  await verifyRealPathWithinRoot(contentPath, filePath, relativePath);
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

  return readFile(contentPath, filePath, relativePath);
}

export async function loadSingletonFile(
  contentPath: string,
  key: string
): Promise<RawFile | null> {
  const relativePath = `singletons/${key}.json`;
  const filePath = resolveWithinRoot(contentPath, ["singletons", `${key}.json`]);

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
        operation: "loadSingleton",
        content: relativePath,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }

  return readFile(contentPath, filePath, relativePath);
}

export async function loadNavigationFile(
  contentPath: string,
  key: string
): Promise<RawFile | null> {
  const relativePath = `navigation/${key}.json`;
  const filePath = resolveWithinRoot(contentPath, ["navigation", `${key}.json`]);

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
        operation: "loadNavigation",
        content: relativePath,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }

  return readFile(contentPath, filePath, relativePath);
}

export async function loadSettingsFile(
  contentPath: string,
  key: string
): Promise<RawFile | null> {
  const relativePath = `settings/${key}.json`;
  const filePath = resolveWithinRoot(contentPath, ["settings", `${key}.json`]);

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
        operation: "loadSettings",
        content: relativePath,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }

  return readFile(contentPath, filePath, relativePath);
}

export async function loadCollectionFiles(
  contentPath: string,
  collection: string
): Promise<RawFile[]> {
  const relativeDir = `collections/${collection}`;
  const dirPath = resolveWithinRoot(contentPath, ["collections", collection]);

  try {
    await stat(dirPath);
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

  await verifyRealPathWithinRoot(contentPath, dirPath, relativeDir);

  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch (error) {
    throw new ProviderError(
      `Could not read collection directory "${relativeDir}".`,
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
    files.push(await readFile(contentPath, filePath, relativePath));
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

  return readFile(contentPath, filePath, relativePath);
}

function isMissingError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
