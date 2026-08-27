import { ProviderError } from "../../core/errors.ts";
import type { MediaAsset, MediaReference } from "../../core/types.ts";
import type { MediaProvider } from "../../media/index.ts";
import { WordPressClient } from "./client.ts";

export interface WordPressMediaProviderOptions {
  name?: string;
  baseUrl: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * Resolves media references against the WordPress REST media endpoint using
 * the same request configuration as the content provider.
 *
 * `id` references hit GET /wp/v2/media/{id}; a 404 resolves to `null`.
 * `src`-only references pass through as a normalized asset without a network
 * call. The companion plugin is not required.
 */
export class WordPressMediaProvider implements MediaProvider {
  readonly name: string;
  private readonly client: WordPressClient;

  constructor(options: WordPressMediaProviderOptions) {
    this.name = options.name ?? "wordpress";

    let baseUrl: URL;
    try {
      baseUrl = new URL(options.baseUrl);
    } catch {
      throw new ProviderError(
        "WordPressMediaProvider requires a valid baseUrl.",
        {
          provider: this.name,
          operation: "constructor",
          reason: "The baseUrl could not be parsed as an absolute URL."
        }
      );
    }
    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
      throw new ProviderError(
        "WordPressMediaProvider baseUrl must use http or https.",
        {
          provider: this.name,
          operation: "constructor",
          reason: `Received protocol "${baseUrl.protocol}".`
        }
      );
    }

    this.client = new WordPressClient({
      baseUrl,
      headers: options.headers ?? {},
      providerName: this.name,
      timeoutMs: options.timeoutMs ?? 10000
    });
  }

  async resolve(reference: MediaReference): Promise<MediaAsset | null> {
    if (reference.id !== undefined) {
      try {
        const response = await this.client.request(
          `media/${encodeURIComponent(String(reference.id))}`,
          {},
          { operation: "resolve", content: "media" },
          { skipStatus: true }
        );

        if (response.data === null) {
          return null;
        }
        if (
          typeof response.data !== "object" ||
          Array.isArray(response.data)
        ) {
          throw this.error(
            "WordPress media endpoint returned a non-object response."
          );
        }

        return this.normalizeMedia(
          String(reference.id),
          response.data as Record<string, unknown>
        );
      } catch (error) {
        if (isNotFound(error)) {
          return null;
        }
        throw error;
      }
    }

    if (reference.src !== undefined) {
      const asset: MediaAsset = { src: reference.src };
      if (reference.id !== undefined) asset.id = reference.id;
      return asset;
    }

    return null;
  }

  private normalizeMedia(id: string, value: Record<string, unknown>): MediaAsset {
    const asset: MediaAsset = {
      id,
      src: typeof value.source_url === "string" ? value.source_url : ""
    };
    if (typeof value.alt_text === "string") asset.alt = value.alt_text;
    if (typeof value.mime_type === "string") asset.mimeType = value.mime_type;
    if (typeof value.caption === "object" && value.caption !== null) {
      const caption = value.caption as Record<string, unknown>;
      if (typeof caption.rendered === "string") asset.caption = caption.rendered;
    }
    if (typeof value.media_details === "object" && value.media_details !== null) {
      const details = value.media_details as Record<string, unknown>;
      if (typeof details.width === "number") asset.width = details.width;
      if (typeof details.height === "number") asset.height = details.height;
    }
    return asset;
  }

  private error(message: string): ProviderError {
    return new ProviderError(message, {
      provider: this.name,
      operation: "resolve",
      content: "media"
    });
  }
}

function isNotFound(error: unknown): boolean {
  if (!(error instanceof ProviderError)) return false;
  return /HTTP 404/.test(`${error.message}\n${error.reason ?? ""}`);
}