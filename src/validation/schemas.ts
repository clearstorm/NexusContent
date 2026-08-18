import { z } from "zod";
import type { JsonObject, NavigationItem } from "../core/types.ts";

export const mediaAssetSchema = z.object({
  id: z.string().optional(),
  url: z.string(),
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional()
});

export const seoRobotsSchema = z.object({
  index: z.boolean().optional(),
  follow: z.boolean().optional()
});

export const seoOpenGraphSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  image: mediaAssetSchema.optional(),
  type: z.string().optional()
});

export const seoTwitterSchema = z.object({
  card: z.enum(["summary", "summary_large_image"]).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: mediaAssetSchema.optional()
});

export const seoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  canonicalUrl: z.url().optional(),
  canonical: z.string().optional(),
  robots: seoRobotsSchema.optional(),
  openGraph: seoOpenGraphSchema.optional(),
  twitter: seoTwitterSchema.optional(),
  structuredData: z
    .array(
      z.custom<JsonObject>(isJsonObject, {
        message: "Expected a plain JSON-compatible object"
      })
    )
    .optional()
});

function isJsonObject(value: unknown): value is JsonObject {
  return isJsonValue(value, new Set()) && !Array.isArray(value) && value !== null;
}

function isJsonValue(value: unknown, ancestors: Set<object>): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value !== "object") {
    return false;
  }

  if (ancestors.has(value)) {
    return false;
  }

  if (!Array.isArray(value)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return false;
    }
  }

  ancestors.add(value);
  const valid = Object.values(value).every((item) => isJsonValue(item, ancestors));
  ancestors.delete(value);
  return valid;
}

export const contentMetaSchema = z.object({
  source: z.string(),
  sourceId: z.string().optional(),
  updatedAt: z.string().optional(),
  locale: z.string().optional()
});

export const dataSchema = z.record(z.string(), z.unknown());

export const navigationItemSchema: z.ZodType<NavigationItem> = z.lazy(() =>
  z.object({
    label: z.string(),
    href: z.string(),
    children: z.array(navigationItemSchema).optional()
  })
);

export const navigationSchema = z.object({
  id: z.string(),
  key: z.string(),
  items: z.array(navigationItemSchema),
  meta: contentMetaSchema
});

export const settingsSchema = z.object({
  id: z.string(),
  key: z.string(),
  data: dataSchema,
  meta: contentMetaSchema
});

export const singletonSchema = settingsSchema;

export const pageSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string().optional(),
  title: z.string().optional(),
  seo: seoSchema.optional(),
  data: dataSchema,
  meta: contentMetaSchema
});

export const collectionItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string().optional(),
  title: z.string().optional(),
  data: dataSchema,
  meta: contentMetaSchema
});
