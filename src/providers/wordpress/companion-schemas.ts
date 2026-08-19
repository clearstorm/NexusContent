import { z } from "zod";
import { mediaAssetSchema, pageStatusSchema } from "../../validation/schemas.ts";
import { COMPANION_CONTRACT_VERSION } from "./config.ts";

export const diagnosticSeveritySchema = z.enum(["error", "warning", "info"]);

export const diagnosticSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: diagnosticSeveritySchema,
  path: z.string().optional()
});

const nonNegativeSafeIntegerSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);
const positiveSafeIntegerSchema = nonNegativeSafeIntegerSchema.min(1);

export const paginationSchema = z
  .object({
    total: nonNegativeSafeIntegerSchema,
    totalPages: nonNegativeSafeIntegerSchema,
    page: positiveSafeIntegerSchema,
    perPage: positiveSafeIntegerSchema
  })
  .refine(
    ({ page, totalPages }) => totalPages === 0 ? page === 1 : page <= totalPages,
    { message: "page must be within the available page range", path: ["page"] }
  );

export const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
);

export const sectionSettingsWireSchema = z.record(z.string(), jsonValueSchema);

export const pageSectionWireSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  settings: sectionSettingsWireSchema.optional(),
  data: z.record(z.string(), jsonValueSchema)
});

export const pageDataSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string().optional(),
  title: z.string().optional(),
  status: pageStatusSchema.optional(),
  excerpt: z.string().optional(),
  featuredImage: mediaAssetSchema.optional(),
  modifiedAt: z.string().optional(),
  sections: z.array(pageSectionWireSchema),
  rawFields: z.record(z.string(), jsonValueSchema)
});

export const pagesDataSchema = z.object({
  items: z.array(pageDataSchema),
  pagination: paginationSchema
});

export const sectionSchemaFieldSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "json", "media"]),
  required: z.boolean().optional(),
  default: jsonValueSchema.optional()
});

export const sectionSchemaSchema = z.object({
  type: z.string().min(1),
  fields: z.array(sectionSchemaFieldSchema)
});

export const schemaDataSchema = z.object({
  editorModes: z.array(z.enum(["gutenberg", "acf_flexible", "acf_fixed"])),
  sectionDefinitions: z.array(sectionSchemaSchema),
  sourceMappings: z.record(z.string(), z.string().min(1))
});

export const capabilitiesSchema = z.object({
  pluginVersion: z.string(),
  wordpressVersion: z.string(),
  gutenberg: z.boolean(),
  acf: z.boolean(),
  acfVersion: z.string().optional(),
  acfPro: z.boolean(),
  acfBlocks: z.boolean(),
  flexibleContent: z.boolean(),
  editorModes: z.array(z.enum(["gutenberg", "acf_flexible", "acf_fixed"])),
  sectionTypes: z.array(z.string().min(1))
});

export function companionEnvelopeSchema<T extends z.ZodType>(data: T) {
  return z.object({
    contractVersion: z.literal(COMPANION_CONTRACT_VERSION),
    data,
    diagnostics: z.array(diagnosticSchema).optional()
  });
}

export const companionPageResponseSchema = companionEnvelopeSchema(pageDataSchema);
export const companionPagesResponseSchema = companionEnvelopeSchema(pagesDataSchema);
export const companionSchemaResponseSchema = companionEnvelopeSchema(schemaDataSchema);
export const companionCapabilitiesResponseSchema =
  companionEnvelopeSchema(capabilitiesSchema);
