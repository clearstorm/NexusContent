import type { ContentProvider } from "./provider.ts";
import { RegistryError } from "./errors.ts";

export class ProviderRegistry {
  private readonly providers = new Map<string, ContentProvider>();

  register(name: string, provider: ContentProvider): void {
    if (this.providers.has(name)) {
      throw new RegistryError(
        `Provider "${name}" is already registered.`,
        { provider: name, operation: "register" }
      );
    }

    if (provider.name !== name) {
      throw new RegistryError(
        `Provider name mismatch. Registered as "${name}" but provider declares "${provider.name}".`,
        { provider: name, operation: "register" }
      );
    }

    this.providers.set(name, provider);
  }

  get(name: string): ContentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new RegistryError(
        `Provider "${name}" is not registered.`,
        { provider: name, operation: "resolve" }
      );
    }
    return provider;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): ContentProvider[] {
    return [...this.providers.values()];
  }

  names(): string[] {
    return [...this.providers.keys()];
  }
}
