import type { LocaleConfig } from "./types.ts";
import { ConfigError, UnsupportedLocaleError } from "./errors.ts";

export interface LocaleResolution {
  requested: string;
  chain: readonly string[];
  strict: boolean;
}

const LOCALE_TAG_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

function validateLocaleTag(locale: string, content: string): void {
  if (!LOCALE_TAG_PATTERN.test(locale)) {
    throw new ConfigError(
      `Invalid locale tag "${locale}".`,
      {
        operation: "localeConfig",
        content,
        reason: 'Locale tags must use BCP 47 style syntax such as "en" or "en-ZA".'
      }
    );
  }
}

/**
 * Central owner of locale resolution semantics.
 *
 * The resolver is the only component that decides how a requested locale
 * maps to an ordered fallback chain. Loaders, format adapters, and
 * validators must not implement locale logic.
 */
export class LocaleResolver {
  readonly defaultLocale: string;
  readonly supportedLocales: readonly string[];
  private readonly fallbackMap: ReadonlyMap<string, string | null>;

  constructor(config?: LocaleConfig) {
    const resolved: LocaleConfig = config ?? { default: "en", supported: ["en"] };
    validateConfig(resolved);
    this.defaultLocale = resolved.default;
    this.supportedLocales = Object.freeze([...resolved.supported]);
    this.fallbackMap = new Map(Object.entries(resolved.fallback ?? {}));
  }

  has(locale: string): boolean {
    return this.supportedLocales.includes(locale);
  }

  resolve(requested?: string, fallbackEnabled = true): LocaleResolution {
    const target = requested ?? this.defaultLocale;

    if (!this.has(target)) {
      throw new UnsupportedLocaleError(
        `Locale "${target}" is not supported.`,
        {
          operation: "resolve",
          locale: target,
          supportedLocales: [...this.supportedLocales],
          reason: "Requested locales must be listed in the configured supported locales."
        }
      );
    }

    const chain = this.buildChain(target, fallbackEnabled);

    return {
      requested: target,
      chain,
      strict: !fallbackEnabled
    };
  }

  private buildChain(target: string, fallbackEnabled: boolean): string[] {
    const chain = [target];

    if (!fallbackEnabled) {
      return chain;
    }

    const visited = new Set<string>([target]);
    let current = target;

    while (true) {
      let candidate = this.fallbackMap.get(current);

      if (candidate === undefined) {
        if (current === this.defaultLocale) {
          break;
        }
        candidate = this.defaultLocale;
      }

      if (candidate === null) {
        break;
      }

      if (visited.has(candidate)) {
        // Config validation prevents cycles; this guards against a defect
        // being introduced later without changing semantics.
        break;
      }

      visited.add(candidate);
      chain.push(candidate);
      current = candidate;
    }

    return chain;
  }
}

function validateConfig(config: LocaleConfig): void {
  const content = "locales";

  validateLocaleTag(config.default, content);

  if (
    !Array.isArray(config.supported) ||
    config.supported.length === 0
  ) {
    throw new ConfigError(
      "Locales configuration requires a non-empty supported list.",
      { operation: "localeConfig", content }
    );
  }

  const supported = new Set<string>();
  for (const locale of config.supported) {
    if (typeof locale !== "string") {
      throw new ConfigError(
        "Locales configuration requires supported locales to be strings.",
        { operation: "localeConfig", content }
      );
    }
    validateLocaleTag(locale, content);
    if (supported.has(locale)) {
      throw new ConfigError(
        `Supported locale "${locale}" is declared more than once.`,
        { operation: "localeConfig", content, locale }
      );
    }
    supported.add(locale);
  }

  if (!supported.has(config.default)) {
    throw new ConfigError(
      `Default locale "${config.default}" must be listed in supported locales.`,
      {
        operation: "localeConfig",
        content,
        locale: config.default,
        supportedLocales: [...supported]
      }
    );
  }

  const fallback = config.fallback ?? {};
  for (const [source, target] of Object.entries(fallback)) {
    validateLocaleTag(source, content);
    if (!supported.has(source)) {
      throw new ConfigError(
        `Fallback source locale "${source}" is not supported.`,
        { operation: "localeConfig", content, locale: source, supportedLocales: [...supported] }
      );
    }
    if (target === null) {
      continue;
    }
    validateLocaleTag(target, content);
    if (!supported.has(target)) {
      throw new ConfigError(
        `Fallback target locale "${target}" is not supported.`,
        {
          operation: "localeConfig",
          content,
          locale: target,
          supportedLocales: [...supported]
        }
      );
    }
  }

  validateNoCircularChains(supported, fallback, config.default);
}

function validateNoCircularChains(
  supported: Set<string>,
  fallback: Record<string, string | null>,
  defaultLocale: string
): void {
  for (const start of supported) {
    const visited = new Set<string>();
    let current = start;

    while (true) {
      if (visited.has(current)) {
        throw new ConfigError(
          `Locales fallback configuration contains a cycle at "${current}".`,
          { operation: "localeConfig", locale: current, chain: [...visited, current] }
        );
      }

      visited.add(current);

      const candidate = fallback[current];
      if (candidate === undefined) {
        if (current === defaultLocale) {
          break;
        }
        current = defaultLocale;
      } else if (candidate === null) {
        break;
      } else {
        current = candidate;
      }
    }
  }
}
