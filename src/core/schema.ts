import { z } from "zod";
import type {
  FieldSchema,
  ModelKind,
  ModelSchema,
  SchemaConfig
} from "./types.ts";
import { ConfigError, SchemaError } from "./errors.ts";

function compileField(field: FieldSchema): z.ZodType {
  const base = compileBaseField(field);

  if (field.list) {
    return field.required === true
      ? z.array(base)
      : z.array(base).optional();
  }

  return field.required === true ? base : base.optional();
}

function compileBaseField(field: FieldSchema): z.ZodType {
  switch (field.type) {
    case "string": {
      if (field.options) {
        return z.enum(field.options as [string, ...string[]]);
      }
      return z.string();
    }

    case "number":
      return z.number();

    case "boolean":
      return z.boolean();

    case "datetime":
      return z.string().refine(isIsoDate, "Invalid ISO datetime");

    case "richText":
      return z.string();

    case "object":
      return field.fields
        ? z.object(mapFields(field.fields)).passthrough()
        : z.record(z.string(), z.unknown());

    case "reference":
      return z
        .object({
          model: z.string(),
          key: z.string()
        })
        .passthrough();

    case "media":
      return z
        .object({
          provider: z.string().optional(),
          id: z.string().optional(),
          src: z.string().optional()
        })
        .passthrough()
        .refine(
          (value) => value.id !== undefined || value.src !== undefined,
          "Media fields require an id or a src"
        )
        .transform((value) =>
          field.media && value.provider === undefined
            ? { ...value, provider: field.media }
            : value
        );
  }
}

function mapFields(
  fields: Record<string, FieldSchema>
): Record<string, z.ZodType> {
  const mapped: Record<string, z.ZodType> = {};
  for (const [name, field] of Object.entries(fields)) {
    mapped[name] = compileField(field);
  }
  return mapped;
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

interface CompiledModel {
  schema: ModelSchema;
  validator?: z.ZodType;
}

/**
 * Validates model field data against compiled Zod schemas. No content
 * retrieval or provider access happens here.
 */
export class ModelRegistry {
  private readonly models = new Map<string, CompiledModel>();

  constructor(
    config: SchemaConfig,
    providerNames: string[],
    mediaProviderNames: string[]
  ) {
    for (const [name, model] of Object.entries(config.models)) {
      this.models.set(name, { schema: model });
    }

    validateModelRelations(
      config.models,
      providerNames,
      mediaProviderNames
    );

    for (const [name, model] of Object.entries(config.models)) {
      const compiled: CompiledModel = { schema: model };
      if (model.fields) {
        compiled.validator = z.object(mapFields(model.fields)).passthrough();
      }
      this.models.set(name, compiled);
    }
  }

  get(name: string): ModelSchema {
    const compiled = this.models.get(name);
    if (!compiled) {
      throw new ConfigError(
        `Model "${name}" is not declared in schema.models.`,
        {
          model: name,
          operation: "resolve",
          reason: `Declared models: ${[...this.models.keys()].join(", ") || "none"}.`
        }
      );
    }
    return compiled.schema;
  }

  has(name: string): boolean {
    return this.models.has(name);
  }

  assertKind(name: string, kind: ModelKind): ModelSchema {
    const model = this.get(name);
    if (model.kind !== kind) {
      throw new ConfigError(
        `Model "${name}" has kind "${model.kind}" but the "${kind}" operation was requested.`,
        {
          model: name,
          operation: "resolve",
          reason: `Model kinds cannot be mixed; use a ${kind} model or the matching operation.`
        }
      );
    }
    return model;
  }

  validateData(
    modelName: string,
    data: unknown,
    details: {
      content?: string;
      provider?: string;
      sourceKey?: string;
      locale?: string;
      operation?: string;
    }
  ): unknown {
    const compiled = this.models.get(modelName);
    const validator = compiled?.validator;
    if (!validator) {
      return data;
    }

    const result = validator.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join(".") || "<root>",
        message: issue.message
      }));

      throw new SchemaError(
        `Content for model "${modelName}" does not match its declared schema.`,
        {
          model: modelName,
          provider: details.provider ?? compiled.schema.source.provider,
          operation: details.operation,
          content: details.content ?? compiled.schema.source.key,
          locale: details.locale,
          reason: issues
            .slice(0, 5)
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; ")
        },
        issues
      );
    }

    return result.data;
  }
}

function validateFields(
  modelName: string,
  fields: Record<string, FieldSchema>,
  models: Record<string, ModelSchema>,
  mediaProviderNames: string[]
): void {
  for (const [fieldName, field] of Object.entries(fields)) {
    if (field.type === "object" && field.fields) {
      validateFields(modelName, field.fields, models, mediaProviderNames);
    }

    if (field.type === "reference") {
      const target = models[field.collection];
      if (!target) {
        throw new ConfigError(
          `Model "${modelName}" field "${fieldName}" references collection "${field.collection}" which does not exist.`,
          {
            model: modelName,
            operation: "config",
            reason: `Declared models: ${Object.keys(models).join(", ") || "none"}.`
          }
        );
      }
      if (target.kind !== "collection") {
        throw new ConfigError(
          `Model "${modelName}" field "${fieldName}" references "${field.collection}" but that model kind is "${target.kind}", not "collection".`,
          {
            model: modelName,
            operation: "config",
            reason: "Reference fields must target collection models."
          }
        );
      }
    }

    if (field.type === "media" && field.media) {
      if (!mediaProviderNames.includes(field.media)) {
        throw new ConfigError(
          `Model "${modelName}" field "${fieldName}" declares media provider "${field.media}" which is not declared.`,
          {
            model: modelName,
            operation: "config",
            reason: `Declared media providers: ${mediaProviderNames.join(", ") || "none"}.`
          }
        );
      }
    }
  }
}

export function validateModelRelations(
  models: Record<string, ModelSchema>,
  providerNames: string[],
  mediaProviderNames: string[] = []
): void {
  const modelNames = Object.keys(models);
  for (const [name, model] of Object.entries(models)) {
    if (!providerNames.includes(model.source.provider)) {
      throw new ConfigError(
        `Model "${name}" references provider "${model.source.provider}" which is not declared.`,
        {
          model: name,
          operation: "config",
          reason: `Declared providers: ${providerNames.join(", ") || "none"}.`
        }
      );
    }
    if (model.source.mode && model.kind !== "singleton") {
      throw new ConfigError(
        `Model "${name}" declares source.mode but kind is "${model.kind}".`,
        {
          model: name,
          operation: "config",
          reason: "source.mode is valid only for singleton models."
        }
      );
    }
    if (model.fields) {
      validateFields(name, model.fields, models, mediaProviderNames);
    }
  }
}