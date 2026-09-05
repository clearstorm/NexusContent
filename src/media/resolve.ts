import { ConfigError } from "../core/errors.ts";
import type { MediaAsset, MediaReference } from "../core/types.ts";
import type { MediaProviderRegistry } from "./registry.ts";

export interface ResolveMediaOptions {
  /**
   * Field-level media provider override. Takes precedence over the project
   * default but yields to an explicit `reference.provider`.
   */
  defaultProvider?: string;
}

/**
 * Small content-facing media resolution service.
 *
 * Provider selection order: `reference.provider`, then the field override in
 * `options.defaultProvider`, then the project default media provider.
 */
export class ResolveMediaService {
  private readonly registry: MediaProviderRegistry;
  private readonly defaultProvider?: string;

  constructor(registry: MediaProviderRegistry, defaultProvider?: string) {
    this.registry = registry;
    this.defaultProvider = defaultProvider;
  }

  async resolve(
    reference: MediaReference,
    options: ResolveMediaOptions = {}
  ): Promise<MediaAsset | null> {
    validateReference(reference);

    const providerName =
      reference.provider ?? options.defaultProvider ?? this.defaultProvider;

    if (!providerName) {
      throw new ConfigError(
        "No media provider is configured.",
        {
          operation: "resolveMedia",
          reason:
            "Declare a default media provider or pass a provider on the media reference."
        }
      );
    }

    const provider = this.registry.get(providerName);
    return provider.resolve(reference);
  }

  /**
   * Recursively resolve every media reference inside a section's data.
   *
   * Objects carrying a `src` string are treated as media references (the
   * canonical section media fields `image`, `background_image`, `images`, and
   * item-level `thumbnail`/`avatar`/`image` all author `src` plus an optional
   * `alt`), resolved to a normalized `MediaAsset`; when the provider yields
   * no asset, the reference keeps its authored `{ src, alt }`. All other
   * values pass through unchanged, so pages can hand whole `page.sections`
   * maps (or collection item data) to this helper before rendering.
   *
   * Id-only references (no `src`) are not generically detectable and are
   * left untouched; already-resolved `MediaAsset` values re-resolve
   * idempotently under the remote/default providers. Provider errors
   * propagate. `options.defaultProvider` is forwarded to every resolution as
   * a field-level override.
   */
  async resolveFields<T>(
    value: T,
    options?: ResolveMediaOptions
  ): Promise<T> {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      const out: unknown[] = [];
      for (const item of value) {
        out.push(await this.resolveFields(item, options));
      }
      return out as T;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.src === "string") {
      const asset = await this.resolve(record as unknown as MediaReference, options);
      if (asset) {
        return {
          src: asset.src,
          alt: asset.alt ?? (record.alt as string | undefined)
        } as T;
      }
      return {
        src: record.src,
        alt: record.alt as string | undefined
      } as T;
    }

    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(record)) {
      out[key] = await this.resolveFields(nested, options);
    }
    return out as T;
  }
}

export function validateReference(reference: MediaReference): void {
  if (reference === null || typeof reference !== "object") {
    throw new ConfigError(
      "Media references must be objects.",
      { operation: "resolveMedia", reason: "Expected a media reference or media asset." }
    );
  }

  if (reference.id === undefined && reference.src === undefined) {
    throw new ConfigError(
      "Media references require an id or a src.",
      {
        operation: "resolveMedia",
        reason: "At least one of id or src must be present."
      }
    );
  }
}