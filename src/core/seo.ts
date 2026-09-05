import type {
  MediaAsset,
  SeoData,
  SeoOpenGraph,
  SeoTwitter
} from "./types.ts";
import { ConfigError } from "./errors.ts";

export interface SeoDefaults {
  siteTitle?: string;
  defaultImage?: MediaAsset;
}

export interface ResolveSeoInput {
  seo?: SeoData;
  title?: string;
  excerpt?: string;
  summary?: string;
  featuredImage?: MediaAsset;
}

export function resolveSeo(
  input: ResolveSeoInput,
  defaults: SeoDefaults = {}
): SeoData {
  const seo = input.seo ?? {};
  const title = seo.title ?? input.title ?? defaults.siteTitle;
  const description = seo.description ?? input.excerpt ?? input.summary;
  const canonicalUrl = seo.canonicalUrl ?? seo.canonical;
  const openGraph = resolveOpenGraph(seo.openGraph, {
    title,
    description,
    image: input.featuredImage ?? defaults.defaultImage
  });
  const twitter = resolveTwitter(seo.twitter, {
    title: openGraph?.title ?? title,
    description: openGraph?.description ?? description,
    image: openGraph?.image
  });

  return omitUndefined({
    title,
    description,
    canonicalUrl,
    robots: seo.robots,
    openGraph,
    twitter,
    structuredData: seo.structuredData
  });
}

function resolveOpenGraph(
  openGraph: SeoOpenGraph | undefined,
  fallback: {
    title: string | undefined;
    description: string | undefined;
    image: MediaAsset | undefined;
  }
): SeoOpenGraph | undefined {
  return optionalObject({
    title: openGraph?.title ?? fallback.title,
    description: openGraph?.description ?? fallback.description,
    image: openGraph?.image ?? fallback.image,
    type: openGraph?.type,
    siteName: openGraph?.siteName,
    url: openGraph?.url,
    locale: openGraph?.locale
  });
}

function resolveTwitter(
  twitter: SeoTwitter | undefined,
  fallback: {
    title: string | undefined;
    description: string | undefined;
    image: MediaAsset | undefined;
  }
): SeoTwitter | undefined {
  return optionalObject({
    card: twitter?.card,
    title: twitter?.title ?? fallback.title,
    description: twitter?.description ?? fallback.description,
    image: twitter?.image ?? fallback.image,
    url: twitter?.url,
    site: twitter?.site
  });
}

function optionalObject<T extends object>(value: T): T | undefined {
  const result = omitUndefined(value);
  return Object.keys(result).length > 0 ? result : undefined;
}

function omitUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined)
  ) as T;
}

export interface ResolvePageSeoOptions {
  /** Settings model key holding the site identity. Defaults to `"site"`. */
  settingsKey?: string;
  /** Forwarded to `getSettings` for locale-aware site identity. */
  locale?: string;
  /** Forwarded to `getSettings` (default `true`). */
  fallback?: boolean;
}

/**
 * Derive `resolveSeo` defaults from a settings model's authored site identity.
 *
 * The convention reads the `siteName` string and the `defaultImage` media
 * object; any other fields or a settings model that does not follow the
 * convention yield empty defaults so resolution falls back cleanly.
 */
export function settingsIdentityToDefaults(
  data: Record<string, unknown> | undefined
): SeoDefaults {
  const siteTitle =
    typeof data?.siteName === "string" ? data.siteName : undefined;
  const defaultImage = toMediaAsset(data?.defaultImage);
  return {
    ...(siteTitle !== undefined ? { siteTitle } : {}),
    ...(defaultImage !== undefined ? { defaultImage } : {})
  };
}

function toMediaAsset(value: unknown): MediaAsset | undefined {
  if (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { src?: unknown }).src === "string"
  ) {
    return value as MediaAsset;
  }
  return undefined;
}

/**
 * Join a canonical base URL and a pathname into an absolute canonical URL.
 *
 * Core never infers deployment URLs; the consumer supplies the explicit base.
 * A pathname that is already absolute (or carries a query/fragment) is kept.
 */
export function makeCanonicalUrl(baseUrl: string, pathname: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new ConfigError("A canonical base URL must be an absolute URL.", {
      operation: "makeCanonicalUrl",
      reason: "The supplied base URL could not be parsed as an absolute URL."
    });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ConfigError(
      "A canonical base URL must use the http or https protocol.",
      {
        operation: "makeCanonicalUrl",
        reason: `The supplied protocol "${parsed.protocol}" is not supported.`
      }
    );
  }

  return new URL(pathname, parsed).href;
}

/**
 * Serialize JSON-LD structured data for inlining in a
 * `<script type="application/ld+json">` element.
 *
 * `JSON.stringify` alone is unsafe for inline scripts: a `</script>` sequence
 * or ambiguous line terminators inside authored structured data would break
 * or skew the script tag. This escapes `<`, `>`, `&`, and U+2028/U+2029 while
 * otherwise preserving the JSON exactly.
 */
export function serializeJsonLd(value: Record<string, unknown>): string {
  const escaped: Record<string, string> = {
    "<": "\\u003c",
    ">": "\\u003e",
    "&": "\\u0026",
    "\u2028": "\\u2028",
    "\u2029": "\\u2029"
  };
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (character) => escaped[character] ?? character
  );
}
