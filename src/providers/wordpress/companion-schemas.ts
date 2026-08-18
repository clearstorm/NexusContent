import { z } from "zod";
import { COMPANION_CONTRACT_VERSION } from "./config.ts";

export const diagnosticSeveritySchema = z.enum(["error", "warning", "info"]);

export const diagnosticSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: diagnosticSeveritySchema,
  path: z.string().optional()
});

export const paginationSchema = z.object({
  total: z.number(),
  totalPages: z.number(),
  page: z.number(),
  perPage: z.number()
});

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
  type: z.string(),
  settings: sectionSettingsWireSchema.optional(),
  data: z.record(z.string(), jsonValueSchema)
});

export const capabilitiesSchema = z.object({
  visualEditor: z.boolean(),
  codeEditor: z.boolean(),
  blocksEditor: z.boolean(),
  acfFields: z.boolean(),
  mediaLibrary: z.boolean(),
  customPostTypes: z.boolean(),
  sections: z.boolean()
});

export const companionPageResponseSchema = z.object({
  contractVersion: z.literal(COMPANION_CONTRACT_VERSION),
  contract: z.literal("companion-page"),
  id: z.string(),
  key: z.string(),
  slug: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  excerpt: z.string().optional(),
  modifiedAt: z.string().optional(),
  sections: z.array(pageSectionWireSchema),
  rawFields: z.record(z.string(), jsonValueSchema),
  diagnostics: z.array(diagnosticSchema)
});

export const companionPagesResponseSchema = z.object({
  contractVersion: z.literal(COMPANION_CONTRACT_VERSION),
  contract: z.literal("companion-pages"),
  items: z.array(companionPageResponseSchema),
  pagination: paginationSchema,
  diagnostics: z.array(diagnosticSchema)
});

export const sectionSchemaFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  default: jsonValueSchema.optional()
});

export const sectionSchemaSchema = z.object({
  type: z.string(),
  sourceType: z.string(),
  sourceKey: z.string().optional(),
  fields: z.array(sectionSchemaFieldSchema)
});

export const companionSchemaResponseSchema = z.object({
  contractVersion: z.literal(COMPANION_CONTRACT_VERSION),
  contract: z.literal("companion-schema"),
  sections: z.array(sectionSchemaSchema),
  capabilities: capabilitiesSchema,
  diagnostics: z.array(diagnosticSchema)
});

export const companionSectionsResponseSchema = z.object({
  contractVersion: z.literal(COMPANION_CONTRACT_VERSION),
  contract: z.literal("companion-sections"),
  sections: z.array(pageSectionWireSchema),
  diagnostics: z.array(diagnosticSchema)
});

export const companionHealthResponseSchema = z.object({
  contractVersion: z.literal(COMPANION_CONTRACT_VERSION),
  contract: z.literal("companion-health"),
  status: z.enum(["healthy", "degraded"]),
  editorMode: z.string(),
  apiStrategy: z.string(),
  diagnostics: z.array(diagnosticSchema)
});
