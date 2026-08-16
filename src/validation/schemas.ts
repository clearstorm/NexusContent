import { z } from "zod";
import type { NavigationItem } from "../core/types.ts";

export const seoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  canonical: z.string().optional()
});

export const contentMetaSchema = z.object({
  source: z.string(),
  sourceId: z.string().optional(),
  updatedAt: z.string().optional()
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
