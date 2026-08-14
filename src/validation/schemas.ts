import { z } from "zod";

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
