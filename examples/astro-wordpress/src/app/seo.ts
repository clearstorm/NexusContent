import { resolveSeo } from "@nexuscontent/core";
import type {
  MediaAsset,
  ResolveSeoInput,
  SeoData,
  SeoDefaults
} from "@nexuscontent/core";

const siteUrl = "https://nexuscontent.dev";

export function canonicalUrl(pathname: string): string {
  return new URL(pathname, siteUrl).href;
}

// The site identity that feeds SEO defaults (site title, default social
// image) is authored content, read from the settings model rather than
// hardcoded here. The canonical base URL above stays deployment-owned, so this
// file only owns the composition between the two.
export async function resolvePageSeo(
  nexus: {
    getSettings(key: string): Promise<{ data?: Record<string, unknown> } | null>;
  },
  input: ResolveSeoInput
): Promise<SeoData> {
  const settings = await nexus.getSettings("site");
  const data = settings?.data ?? {};
  const defaults: SeoDefaults = {
    siteTitle: typeof data.siteName === "string" ? data.siteName : undefined,
    defaultImage: toMediaAsset(data.defaultImage)
  };
  return resolveSeo(input, defaults);
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
