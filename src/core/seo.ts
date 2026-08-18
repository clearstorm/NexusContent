import type {
  MediaAsset,
  SeoData,
  SeoOpenGraph,
  SeoTwitter
} from "./types.ts";

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
    type: openGraph?.type
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
    image: twitter?.image ?? fallback.image
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
