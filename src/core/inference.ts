import type {
  ContentReference,
  FieldMap,
  FieldSchema,
  MediaReference,
  NexusConfig
} from "./types.ts";

/**
 * Schema-driven TypeScript inference.
 *
 * These types derive model names and `data` shapes from the `schema.models`
 * configuration at compile time. Consumers that build configuration through
 * `defineNexusConfig` (or otherwise preserve literal model shapes) get:
 *
 * - model names restricted to those valid for each retrieval operation;
 * - `data` typed exactly like the declared `fields` of the requested model.
 *
 * Configuration widened to `NexusConfig` degrades to `string` model names and
 * `Record<string, unknown>` data, matching pre-schema behaviour.
 */

export type ModelsOf<TConfig> = TConfig extends NexusConfig
  ? TConfig["schema"]["models"]
  : never;

export type ModelOf<TConfig, TName extends keyof ModelsOf<TConfig>> =
  ModelsOf<TConfig>[TName];

/**
 * All model names in the config. Widened configs fall back to `string`.
 */
export type ModelNameOf<TConfig> =
  string extends keyof ModelsOf<TConfig>
    ? string
    : keyof ModelsOf<TConfig> & string;

/**
 * Model names whose declared `kind` matches `TKind`. Widened configs fall
 * back to `string` because their model kinds cannot be inspected.
 */
export type ModelNamesByKind<TConfig, TKind extends string> =
  string extends keyof ModelsOf<TConfig>
    ? string
    : {
        [TName in keyof ModelsOf<TConfig> & string]: TKind extends ModelOf<
          TConfig,
          TName
        >["kind"]
          ? TName
          : never;
      }[keyof ModelsOf<TConfig> & string];

export type SingletonModelNames<TConfig> = ModelNamesByKind<
  TConfig,
  "singleton"
>;

/**
 * Singleton names that route through `getSingleton` (page-mode singletons
 * route through `getPage` instead).
 */
export type SingletonServiceModelNames<TConfig> =
  string extends keyof ModelsOf<TConfig>
    ? string
    : {
        [TName in keyof ModelsOf<TConfig> & string]: ModelOf<TConfig, TName> extends {
          source: { mode: "page" };
        }
          ? never
          : TName;
      }[keyof ModelsOf<TConfig> & string];

export type CollectionModelNames<TConfig> = ModelNamesByKind<
  TConfig,
  "collection"
>;

export type NavigationModelNames<TConfig> = ModelNamesByKind<
  TConfig,
  "navigation"
>;

export type SettingsModelNames<TConfig> = ModelNamesByKind<TConfig, "settings">;

type InferFieldBase<TField extends FieldSchema> =
  TField extends { type: "string"; options: readonly string[] }
    ? TField["options"] extends readonly (infer TOption)[]
      ? TOption extends string
        ? TOption
        : never
      : never
    : TField extends { type: "string" }
      ? string
      : TField extends { type: "number" }
        ? number
        : TField extends { type: "boolean" }
          ? boolean
          : TField extends { type: "datetime" }
            ? string
            : TField extends { type: "richText" }
              ? string
              : TField extends { type: "object"; fields: FieldMap }
                ? InferFields<TField["fields"]>
                : TField extends { type: "object" }
                  ? Record<string, unknown>
                  : TField extends { type: "reference" }
                    ? ContentReference
                    : TField extends { type: "media" }
                      ? MediaReference
                      : never;

export type InferField<TField extends FieldSchema> =
  TField extends { list: true }
    ? Array<InferFieldBase<TField>>
    : InferFieldBase<TField>;

/**
 * The `data` shape declared by a `fields` map. Declared fields are typed
 * precisely; undeclared keys pass through as `unknown`, matching the
 * runtime `.passthrough()` validation.
 */
export type InferFields<TFields extends FieldMap> = {
  [TName in keyof TFields as TFields[TName] extends { required: true }
    ? TName
    : never]: InferField<TFields[TName]>;
} & {
  [TName in keyof TFields as TFields[TName] extends { required: true }
    ? never
    : TName]?: InferField<TFields[TName]>;
} & Record<string, unknown>;

export type InferModelData<TConfig, TName extends ModelNameOf<TConfig>> =
  ModelOf<TConfig, TName> extends { fields: FieldMap }
    ? InferFields<ModelOf<TConfig, TName>["fields"]>
    : Record<string, unknown>;

/**
 * The public inference entry point. Resolves the `data` type for one model.
 *
 * ```ts
 * type HomeData = InferModel<typeof nexusConfig, "home">;
 * ```
 */
export type InferModel<TConfig, TName extends ModelNameOf<TConfig>> =
  InferModelData<TConfig, TName>;

/**
 * Resolves the `data` type returned by a retrieval method. An explicit
 * `TData` beats the inferred model data; `undefined` defers to the schema.
 */
export type ResolvedData<
  TConfig,
  TName extends ModelNameOf<TConfig>,
  TData
> = [TData] extends [undefined]
  ? InferModelData<TConfig, TName>
  : Exclude<TData, undefined>;