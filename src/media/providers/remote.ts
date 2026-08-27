import { ProviderError } from "../../core/errors.ts";
import type { MediaAsset, MediaReference } from "../../core/types.ts";
import type { MediaProvider } from "../types.ts";

export interface RemoteMediaProviderOptions {
  name?: string;
}

/**
 * Built-in remote media provider.
 *
 * Validates absolute http(s) `src` references and passes the URL through
 * unchanged. It never fetches content (no SSRF surface); CDN upgrading and
 * fetching belong to the consuming application.
 */
export function defineRemoteMediaProvider(
  options: RemoteMediaProviderOptions = {}
): MediaProvider {
  const name = options.name ?? "remote";

  return {
    name,

    async resolve(reference: MediaReference): Promise<MediaAsset | null> {
      if (!reference.src) {
        return null;
      }

      const parsed = validateRemoteUrl(reference.src);
      return {
        id: reference.id ?? parsed.href,
        src: parsed.href,
        provider: name,
        sourceId: parsed.href
      };
    }
  };
}

export function validateRemoteUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ProviderError(
      `Remote media src "${value}" is not a valid URL.`,
      { provider: "remote", operation: "resolve", reason: "Expected an absolute URL." }
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ProviderError(
      `Remote media src "${value}" must use http or https.`,
      {
        provider: "remote",
        operation: "resolve",
        reason: `Received protocol "${parsed.protocol}".`
      }
    );
  }

  return parsed;
}