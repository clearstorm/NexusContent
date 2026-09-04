import {
  readFile as readFileFromDisk,
  readdir,
  realpath,
  stat
} from "node:fs/promises";
import path from "node:path";
import type { ProviderRetrievalOptions } from "../../core/provider.ts";
import { MissingLocaleVariantError, ProviderError } from "../../core/errors.ts";
import { jsonFormatAdapter } from "../../formats/index.ts";

export interface RawFile {
  data: unknown;
  relativePath: string;
  updatedAt?: string;
  locale?: string;
}

type LoadOptions = ProviderRetrievalOptions;

const LOCALE_SEGMENT_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

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
  relativePath: string,
  locale?: string
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

  const file: RawFile = {
    data,
    relativePath,
    updatedAt: fileStat ? fileStat.mtime.toISOString() : undefined
  };

  if (locale !== undefined) {
    file.locale = locale;
  }

  return file;
}

function validateLocaleSegments(options: LoadOptions): void {
  const candidates = localeCandidates(options);
  for (const candidate of candidates) {
    if (!LOCALE_SEGMENT_PATTERN.test(candidate)) {
      throw new ProviderError(
        `Invalid locale "${candidate}".`,
        {
          provider: "git",
          operation: "load",
          content: candidate,
          reason: 'Locale tags must use BCP 47 style syntax such as "en" or "en-ZA".'
        }
      );
    }
  }
}

function localeCandidates(options: LoadOptions): string[] {
  const list =
    options.fallbackLocales ??
    (options.locale !== undefined ? [options.locale] : []);
  return [...new Set(list)];
}

function buildMissingVariantError(
  key: string,
  operation: string,
  options: LoadOptions
): MissingLocaleVariantError {
  const requested = options.locale;

  return new MissingLocaleVariantError(
    `Locale variant "${requested ?? "unknown"}" of "${key}" is missing.`,
    {
      provider: "git",
      operation,
      content: key,
      locale: requested,
      chain: options.fallbackLocales,
      reason:
        "No variant exists for the requested locale and fallback is disabled or unavailable."
    }
  );
}

async function fileExistsWithinRoot(
  filePath: string,
  relativePath: string,
  operation: string
): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (isMissingError(error)) {
      return false;
    }
    throw new ProviderError(
      `Could not access content file "${relativePath}".`,
      {
        provider: "git",
        operation,
        content: relativePath,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

async function directoryExistsWithinRoot(
  dirPath: string,
  relativeDir: string,
  operation: string
): Promise<boolean> {
  try {
    await stat(dirPath);
    return true;
  } catch (error) {
    if (isMissingError(error)) {
      return false;
    }
    throw new ProviderError(
      `Could not access collection directory "${relativeDir}".`,
      {
        provider: "git",
        operation,
        content: relativeDir,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

async function readCollectionDirectory(
  contentPath: string,
  dirPath: string,
  relativeDir: string,
  locale?: string
): Promise<RawFile[]> {
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
    files.push(await readFile(contentPath, filePath, relativePath, locale));
  }

  return files;
}

/**
 * Loads a single content file, preferring locale variant directories over
 * the legacy flat location when locale options are provided.
 */
async function loadSingleContentFile(
  contentPath: string,
  directory: string,
  key: string,
  operation: string,
  options: LoadOptions = {}
): Promise<RawFile | null> {
  validateLocaleSegments(options);

  for (const candidate of localeCandidates(options)) {
    const relativePath = `${directory}/${candidate}/${key}.json`;
    const filePath = resolveWithinRoot(contentPath, [directory, candidate, `${key}.json`]);

    if (await fileExistsWithinRoot(filePath, relativePath, operation)) {
      return readFile(contentPath, filePath, relativePath, candidate);
    }
  }

  const flatRelativePath = `${directory}/${key}.json`;
  const flatFilePath = resolveWithinRoot(contentPath, [directory, `${key}.json`]);

  // Strict resolution forbids falling back to the legacy flat file.
  if (await fileExistsWithinRoot(flatFilePath, flatRelativePath, operation)) {
    if (options.strict) {
      throw buildMissingVariantError(key, operation, options);
    }
    return readFile(contentPath, flatFilePath, flatRelativePath);
  }

  if (options.strict) {
    throw buildMissingVariantError(key, operation, options);
  }

  return null;
}

export async function loadPageFile(
  contentPath: string,
  key: string,
  options: LoadOptions = {}
): Promise<RawFile | null> {
  return loadSingleContentFile(contentPath, "pages", key, "load", options);
}

export async function loadNavigationFile(
  contentPath: string,
  key: string,
  options: LoadOptions = {}
): Promise<RawFile | null> {
  return loadSingleContentFile(contentPath, "navigation", key, "loadNavigation", options);
}

export async function loadSettingsFile(
  contentPath: string,
  key: string,
  options: LoadOptions = {}
): Promise<RawFile | null> {
  return loadSingleContentFile(contentPath, "settings", key, "loadSettings", options);
}

export async function loadCollectionFiles(
  contentPath: string,
  collection: string,
  options: LoadOptions = {}
): Promise<RawFile[]> {
  validateLocaleSegments(options);

  for (const candidate of localeCandidates(options)) {
    const relativeDir = `collections/${collection}/${candidate}`;
    const dirPath = resolveWithinRoot(contentPath, ["collections", collection, candidate]);

    if (await directoryExistsWithinRoot(dirPath, relativeDir, "loadCollection")) {
      return readCollectionDirectory(contentPath, dirPath, relativeDir, candidate);
    }
  }

  const flatRelativeDir = `collections/${collection}`;
  const flatDirPath = resolveWithinRoot(contentPath, ["collections", collection]);

  if (await directoryExistsWithinRoot(flatDirPath, flatRelativeDir, "loadCollection")) {
    if (options.strict) {
      throw buildMissingVariantError(collection, "loadCollection", options);
    }
    return readCollectionDirectory(contentPath, flatDirPath, flatRelativeDir);
  }

  if (options.strict) {
    throw buildMissingVariantError(collection, "loadCollection", options);
  }

  return [];
}

export async function loadItemFile(
  contentPath: string,
  collection: string,
  key: string,
  options: LoadOptions = {}
): Promise<RawFile | null> {
  return loadSingleContentFile(
    contentPath,
    `collections/${collection}`,
    key,
    "loadItem",
    options
  );
}

function isMissingError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
