import path from "node:path";
import { ProviderError } from "../../core/errors.ts";
import type { MediaAsset, MediaReference } from "../../core/types.ts";
import type { MediaProvider } from "../types.ts";

export interface LocalMediaProviderOptions {
  root: string;
  publicPath: string;
  name?: string;
}

function normalizePublicPath(value: string): string {
  if (!value.startsWith("/")) {
    throw new ProviderError("Local media publicPath must start with a slash.", {
      provider: "local",
      operation: "constructor",
      reason: `Received "${value}".`
    });
  }
  if (value.length > 1 && value.endsWith("/")) {
    return value.slice(0, -1);
  }
  return value;
}

/**
 * Built-in local media provider.
 *
 * Resolves root-relative `src` references to `publicPath` web URLs. No
 * uploads or transforms; references are contained within the configured root
 * with traversal protection.
 */
export function defineLocalMediaProvider(
  options: LocalMediaProviderOptions
): MediaProvider {
  if (!options.root || !options.publicPath) {
    throw new ProviderError(
      "LocalMediaProvider requires root and publicPath.",
      {
        provider: "local",
        operation: "constructor",
        reason: "No root or publicPath was provided."
      }
    );
  }

  const root = path.resolve(options.root);
  const publicPath = normalizePublicPath(options.publicPath);
  const name = options.name ?? "local";

  return {
    name,

    async resolve(reference: MediaReference): Promise<MediaAsset | null> {
      if (!reference.src) {
        return null;
      }

      const resolved = path.resolve(root, reference.src);
      const relative = path.relative(root, resolved);

      if (
        relative === "" ||
        relative.startsWith("..") ||
        path.isAbsolute(relative)
      ) {
        throw new ProviderError(
          `Media path "${reference.src}" escapes the configured media root.`,
          {
            provider: name,
            operation: "resolve",
            reason: "Media references must resolve inside the configured media root."
          }
        );
      }

      const webPath = `${publicPath}/${relative}`;
      return {
        id: reference.id ?? reference.src,
        src: webPath,
        provider: name,
        sourceId: relative
      };
    }
  };
}