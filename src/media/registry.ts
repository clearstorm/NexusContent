import type { MediaProvider } from "./types.ts";
import { RegistryError } from "../core/errors.ts";

export class MediaProviderRegistry {
  private readonly providers = new Map<string, MediaProvider>();

  register(name: string, provider: MediaProvider): void {
    if (this.providers.has(name)) {
      throw new RegistryError(
        `Media provider "${name}" is already registered.`,
        { provider: name, operation: "register" }
      );
    }

    if (provider.name !== name) {
      throw new RegistryError(
        `Media provider name mismatch. Registered as "${name}" but provider declares "${provider.name}".`,
        { provider: name, operation: "register" }
      );
    }

    this.providers.set(name, provider);
  }

  get(name: string): MediaProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new RegistryError(
        `Media provider "${name}" is not registered.`,
        { provider: name, operation: "resolve" }
      );
    }
    return provider;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  names(): string[] {
    return [...this.providers.keys()];
  }
}