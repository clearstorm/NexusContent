import { z } from "zod";
import type {
  FieldSchema,
  MediaConfig,
  ModelSchema,
  NexusConfig,
  ProviderConfig
} from "./types.ts";
import { ConfigError } from "./errors.ts";

const fieldSchema: z.ZodType<FieldSchema> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("string"),
    required: z.boolean().optional(),
    list: z.boolean().optional(),
    options: z.array(z.string()).optional()
  }),
  z.object({
    type: z.literal("number"),
    required: z.boolean().optional(),
    list: z.boolean().optional()
  }),
  z.object({
    type: z.literal("boolean"),
    required: z.boolean().optional(),
    list: z.boolean().optional()
  }),
  z.object({
    type: z.literal("datetime"),
    required: z.boolean().optional(),
    list: z.boolean().optional()
  }),
  z.object({
    type: z.literal("object"),
    required: z.boolean().optional(),
    list: z.boolean().optional(),
    fields: z.record(z.string(), z.lazy(() => fieldSchema)).optional()
  }),
  z.object({
    type: z.literal("reference"),
    required: z.boolean().optional(),
    list: z.boolean().optional(),
    collection: z.string().min(1)
  }),
  z.object({
    type: z.literal("media"),
    required: z.boolean().optional(),
    list: z.boolean().optional(),
    media: z.string().min(1).optional()
  }),
  z.object({
    type: z.literal("richText"),
    required: z.boolean().optional(),
    list: z.boolean().optional()
  })
]);

const modelSchema: z.ZodType<ModelSchema> = z.object({
  kind: z.enum([
    "singleton",
    "collection",
    "navigation",
    "settings"
  ]),
  source: z.object({
    provider: z.string().min(1),
    key: z.string().min(1),
    mode: z.enum(["page", "singleton"]).optional()
  }),
  fields: z
    .record(z.string(), z.lazy(() => fieldSchema))
    .optional()
});

const nexusConfigShape = z.object({
  providers: z
    .record(
      z.string(),
      z.object({
        type: z.string().min(1),
        options: z.record(z.string(), z.unknown()).optional()
      })
    )
    .optional(),
  media: z
    .object({
      default: z.string().min(1).optional(),
      providers: z.record(
        z.string(),
        z.object({
          type: z.string().min(1),
          options: z.record(z.string(), z.unknown()).optional()
        })
      )
    })
    .optional(),
  schema: z.object({
    models: z.record(z.string(), z.lazy(() => modelSchema))
  }),
  locales: z
    .object({
      default: z.string().min(1),
      supported: z.array(z.string().min(1)).optional()
    })
    .optional()
});

function requireDefault(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export interface ResolvedBuiltinMediaConfig {
  providers: Record<string, ProviderConfig>;
  default?: string;
}

export function resolveBuiltinMediaProviders(
  media: MediaConfig | undefined
): ResolvedBuiltinMediaConfig {
  const builtins: Record<string, ProviderConfig> = {};
  let defaultProvider = media?.default;

  for (const [name, config] of Object.entries(media?.providers ?? {})) {
    if (config.type === "local" || config.type === "remote") {
      const options = config.options ?? {};

      if (config.type === "local") {
        if (typeof options.root !== "string") {
          throw new ConfigError(
            `A "local" media provider requires a string "root" option.`,
            { provider: name, operation: "config", reason: "Missing root option." }
          );
        }
        if (typeof options.publicPath !== "string") {
          throw new ConfigError(
            `A "local" media provider requires a string "publicPath" option.`,
            { provider: name, operation: "config", reason: "Missing publicPath option." }
          );
        }
      }

      builtins[name] = {
        type: config.type,
        options: {
          ...options,
          name: requireDefault(options.name, name)
        }
      };
    }
  }

  if (defaultProvider && !(defaultProvider in (media?.providers ?? {}))) {
    throw new ConfigError(
      `Default media provider "${defaultProvider}" is not declared.`,
      {
        operation: "config",
        reason: "The default media provider must exist in media.providers."
      }
    );
  }

  return { providers: builtins, default: defaultProvider };
}

/**
 * Thin, pure configuration entry point.
 *
 * Validates the declared config shape and its relational rules (model kinds,
 * provider references, reference targets, media defaults) and returns the
 * config unchanged. `const` inference preserves literal model shapes so
 * retrieval methods can derive typed model names and `data` at compile time.
 * It never instantiates providers or touches remote systems.
 */
export function defineNexusConfig<const TConfig extends NexusConfig>(
  config: TConfig
): TConfig {
  validateNexusConfig(config);
  return config;
}

export function validateNexusConfig(config: NexusConfig): void {
  const parsed = nexusConfigShape.safeParse(config);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ConfigError(
      `Invalid NexusContent configuration.`,
      {
        operation: "defineNexusConfig",
        reason: issue
          ? `"${issue.path.join(".")}": ${issue.message}`
          : "Config shape does not match the NexusConfig schema."
      }
    );
  }

  for (const obsolete of ["content", "navigation", "settings"] as const) {
    if (obsolete in config) {
      throw new ConfigError(
        `Root config key "${obsolete}" is obsolete. Move the entry under schema.models.`,
        {
          operation: "defineNexusConfig",
          reason:
            "schema.models now owns all content, navigation, and settings models."
        }
      );
    }
  }

  const providerNames = Object.keys(config.providers ?? {});
  const mediaNames = Object.keys(config.media?.providers ?? {});

  if (config.media?.default && !mediaNames.includes(config.media.default)) {
    throw new ConfigError(
      `Default media provider "${config.media.default}" is not declared in media.providers.`,
      {
        operation: "defineNexusConfig",
        reason: `Declared media providers: ${mediaNames.join(", ") || "none"}.`
      }
    );
  }

  for (const [modelName, model] of Object.entries(config.schema.models)) {
    if (model.source.mode && model.kind !== "singleton") {
      throw new ConfigError(
        `Model "${modelName}" declares source.mode but kind is "${model.kind}".`,
        {
          operation: "defineNexusConfig",
          reason: `source.mode is valid only for singleton models.`
        }
      );
    }

    if (!providerNames.includes(model.source.provider)) {
      throw new ConfigError(
        `Model "${modelName}" references provider "${model.source.provider}" which is not declared.`,
        {
          operation: "defineNexusConfig",
          reason: `Declared providers: ${providerNames.join(", ") || "none"}.`
        }
      );
    }

    if (model.fields) {
      validateFields(modelName, model.fields, config.schema.models, mediaNames);
    }
  }
}

function validateFields(
  modelName: string,
  fields: Record<string, FieldSchema>,
  models: Record<string, { kind: string }>,
  mediaNames: string[]
): void {
  for (const [fieldName, field] of Object.entries(fields)) {
    if (field.type === "object" && field.fields) {
      validateFields(modelName, field.fields, models, mediaNames);
    }

    if (field.type === "string" && field.options?.length === 0) {
      throw new ConfigError(
        `Model "${modelName}" field "${fieldName}" declares an empty options list.`,
        {
          operation: "defineNexusConfig",
          reason: "A string field with options needs at least one option."
        }
      );
    }

    if (field.type === "reference") {
      const target = models[field.collection];
      if (!target) {
        throw new ConfigError(
          `Model "${modelName}" field "${fieldName}" references collection "${field.collection}" which does not exist.`,
          {
            operation: "defineNexusConfig",
            reason: `Declared models: ${Object.keys(models).join(", ") || "none"}.`
          }
        );
      }
      if (target.kind !== "collection") {
        throw new ConfigError(
          `Model "${modelName}" field "${fieldName}" references "${field.collection}" but that model kind is "${target.kind}", not "collection".`,
          {
            operation: "defineNexusConfig",
            reason: "Reference fields must target collection models."
          }
        );
      }
    }

    if (field.type === "media" && field.media) {
      if (!mediaNames.includes(field.media)) {
        throw new ConfigError(
          `Model "${modelName}" field "${fieldName}" declares media provider "${field.media}" which is not declared.`,
          {
            operation: "defineNexusConfig",
            reason: `Declared media providers: ${mediaNames.join(", ") || "none"}.`
          }
        );
      }
    }
  }
}