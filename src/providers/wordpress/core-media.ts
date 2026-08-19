import type { MediaAsset } from "../../core/types.ts";

/**
 * Normalize an ACF image field to a MediaAsset.
 * Handles various ACF image field shapes:
 * - { id, url, alt, width, height, sizes }
 * - { ID, url, alt, widths, heights }
 * - { id: "123", url: "..." }
 */
export function normalizeAcfImageToMediaAsset(
  value: unknown
): MediaAsset | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const obj = value as Record<string, unknown>;

  const url = typeof obj.url === "string"
    ? obj.url
    : typeof obj.sizes === "object" && obj.sizes !== null
      ? findLargestSizeUrl(obj.sizes as Record<string, unknown>)
      : undefined;

  if (!url) return undefined;

  const asset: MediaAsset = { url };

  if (typeof obj.id === "number") {
    asset.id = String(obj.id);
  } else if (typeof obj.ID === "number") {
    asset.id = String(obj.ID);
  } else if (typeof obj.id === "string") {
    asset.id = obj.id;
  }

  if (typeof obj.alt === "string") {
    asset.alt = obj.alt;
  } else if (typeof obj.alt_text === "string") {
    asset.alt = obj.alt_text;
  }

  if (typeof obj.caption === "string") {
    asset.caption = obj.caption;
  } else if (typeof obj.caption === "object" && obj.caption !== null) {
    const captionObj = obj.caption as Record<string, unknown>;
    if (typeof captionObj.raw === "string") {
      asset.caption = captionObj.raw;
    } else if (typeof captionObj.rendered === "string") {
      asset.caption = captionObj.rendered;
    }
  }

  if (typeof obj.width === "number" && Number.isFinite(obj.width)) {
    asset.width = obj.width;
  } else if (typeof obj.widths === "object" && obj.widths !== null) {
    const widths = obj.widths as Record<string, unknown>;
    const fullWidth = widths["full"];
    if (typeof fullWidth === "number" && Number.isFinite(fullWidth)) {
      asset.width = fullWidth;
    }
  }

  if (typeof obj.height === "number" && Number.isFinite(obj.height)) {
    asset.height = obj.height;
  } else if (typeof obj.heights === "object" && obj.heights !== null) {
    const heights = obj.heights as Record<string, unknown>;
    const fullHeight = heights["full"];
    if (typeof fullHeight === "number" && Number.isFinite(fullHeight)) {
      asset.height = fullHeight;
    }
  }

  if (typeof obj.mimeType === "string") {
    asset.mimeType = obj.mimeType;
  } else if (typeof obj.mime_type === "string") {
    asset.mimeType = obj.mime_type;
  }

  // Extract sizes if available
  if (typeof obj.sizes === "object" && obj.sizes !== null) {
    const sizes = obj.sizes as Record<string, unknown>;
    const sizeMap: MediaAsset["sizes"] = {};

    for (const [sizeName, sizeData] of Object.entries(sizes)) {
      if (sizeData && typeof sizeData === "object" && !Array.isArray(sizeData)) {
        const sizeObj = sizeData as Record<string, unknown>;
        if (typeof sizeObj.url === "string") {
          sizeMap[sizeName] = {
            url: sizeObj.url,
            width: typeof sizeObj.width === "number" ? sizeObj.width : undefined,
            height: typeof sizeObj.height === "number" ? sizeObj.height : undefined,
            mimeType: typeof sizeObj.mimeType === "string" ? sizeObj.mimeType : undefined
          };
        }
      }
    }

    if (Object.keys(sizeMap).length > 0) {
      asset.sizes = sizeMap;
    }
  }

  return asset;
}

/**
 * Find the largest size URL from a sizes object.
 */
function findLargestSizeUrl(sizes: Record<string, unknown>): string | undefined {
  const sizeOrder = ["full", "large", "medium_large", "medium", "thumbnail"];

  for (const sizeName of sizeOrder) {
    const sizeData = sizes[sizeName];
    if (sizeData && typeof sizeData === "object" && !Array.isArray(sizeData)) {
      const sizeObj = sizeData as Record<string, unknown>;
      if (typeof sizeObj.url === "string") {
        return sizeObj.url;
      }
    }
  }

  // Fall back to first available size
  for (const sizeData of Object.values(sizes)) {
    if (sizeData && typeof sizeData === "object" && !Array.isArray(sizeData)) {
      const sizeObj = sizeData as Record<string, unknown>;
      if (typeof sizeObj.url === "string") {
        return sizeObj.url;
      }
    }
  }

  return undefined;
}

/**
 * Resolve a WordPress attachment ID to a MediaAsset.
 * This would require an API call in production; here we return a placeholder
 * that indicates the ID needs resolution.
 */
export function createMediaAssetFromId(
  id: string | number,
  options: {
    url?: string;
    alt?: string;
    width?: number;
    height?: number;
    mimeType?: string;
  } = {}
): MediaAsset {
  return {
    id: String(id),
    url: options.url ?? "",
    alt: options.alt,
    width: options.width,
    height: options.height,
    mimeType: options.mimeType
  };
}

/**
 * Normalize a WordPress featured media entry to a MediaAsset.
 */
export function normalizeFeaturedMedia(
  media: Record<string, unknown>
): MediaAsset | undefined {
  if (!media) return undefined;

  const id = typeof media.id === "number" ? media.id : undefined;
  const sourceUrl = typeof media.source_url === "string" ? media.source_url : undefined;

  if (!sourceUrl) return undefined;

  const asset: MediaAsset = {
    id: id !== undefined ? String(id) : undefined,
    url: sourceUrl
  };

  if (typeof media.alt_text === "string") {
    asset.alt = media.alt_text;
  }

  // Extract caption from rendered or raw
  if (typeof media.caption === "object" && media.caption !== null) {
    const captionObj = media.caption as Record<string, unknown>;
    if (typeof captionObj.rendered === "string") {
      asset.caption = captionObj.rendered;
    } else if (typeof captionObj.raw === "string") {
      asset.caption = captionObj.raw;
    }
  }

  // Extract dimensions from media_details
  if (typeof media.media_details === "object" && media.media_details !== null) {
    const details = media.media_details as Record<string, unknown>;
    if (typeof details.width === "number" && Number.isFinite(details.width)) {
      asset.width = details.width;
    }
    if (typeof details.height === "number" && Number.isFinite(details.height)) {
      asset.height = details.height;
    }
    if (typeof details.mime_type === "string") {
      asset.mimeType = details.mime_type;
    }

    // Extract sizes
    if (typeof details.sizes === "object" && details.sizes !== null) {
      const sizes = details.sizes as Record<string, unknown>;
      const sizeMap: MediaAsset["sizes"] = {};

      for (const [sizeName, sizeData] of Object.entries(sizes)) {
        if (sizeData && typeof sizeData === "object" && !Array.isArray(sizeData)) {
          const sizeObj = sizeData as Record<string, unknown>;
          if (typeof sizeObj.source_url === "string") {
            sizeMap[sizeName] = {
              url: sizeObj.source_url,
              width: typeof sizeObj.width === "number" ? sizeObj.width : undefined,
              height: typeof sizeObj.height === "number" ? sizeObj.height : undefined,
              mimeType: typeof sizeObj.mime_type === "string" ? sizeObj.mime_type : undefined
            };
          }
        }
      }

      if (Object.keys(sizeMap).length > 0) {
        asset.sizes = sizeMap;
      }
    }
  }

  return asset;
}
