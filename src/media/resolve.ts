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