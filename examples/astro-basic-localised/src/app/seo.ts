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

// Site identity (site title, default social image) is locale-aware authored
// content read from the settings model; the canonical base URL above stays
// deployment-owned.
export async function resolvePageSeo(
  nexus: {
    getSettings(
      key: string,
      options?: { locale?: string }
    ): Promise<{ data?: Record<string, unknown> } | null>;
  },
  input: ResolveSeoInput,
  options?: { locale?: string }
): Promise<SeoData> {
  const settings = await nexus.getSettings("site", options);
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
