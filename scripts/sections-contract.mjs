#!/usr/bin/env node
/**
 * Scafests a WordPress must-use plugin that registers a consumer's custom
 * section definitions through the existing nexuscontent_section_definitions
 * filter. The NexusContent companion plugin then auto-creates an ACF flexible
 * layout (and, when both/acf block implementations are selected, an ACF block
 * and fixed fields) for every registered custom section, just as it does for
 * the built-in sections.
 *
 * The single source of truth for the built-in vocabulary stays
 * integrations/wordpress/nexuscontent/sections.json. This script never edits
 * it and never perverts the read-only project-contract route: registration
 * happens in a consumer-owned drop-in, and the plugin Dashboard remains a
 * read-only drift comparison.
 *
 * Usage:
 *   npm run sections:contract -- --custom ./sections.custom.json \
 *     [--contract ./contract.json] [--write ./wp-content/mu-plugins/nexuscontent-sections.php]
 *
 * --custom expects an array of `{ type, fixed?, label?, fields: [...] }`
 * entries shaped exactly like the entries of sections.json.
 * --contract expects the shape the project-contract route stores:
 * `{ components: string[], sectionTypes: string[], componentTypeMap? }`.
 * Without --contract every declared custom section is emitted.
 * A `sectionTypes`/mapped entry with no definition fails the run; declared
 * sections the contract never uses are only warned about.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
export const SECTIONS_PATH = path.join(
  root,
  "integrations/wordpress/nexuscontent/sections.json"
);

export const ALLOWED_FIELD_TYPES = new Set([
  "string",
  "number",
  "boolean",
  "json",
  "media"
]);
export const RESERVED_PREFIXES = ["nc-", "nexus-", "nc_", "nexus_"];
export const FIELD_PATTERN = /^[a-z0-9_]+$/;

export function phpString(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (value === null) return "null";
  return `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

function asError(message, cause) {
  const e = new Error(message);
  e.cause = cause;
  return e;
}

function loadJson(filePath, label) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (cause) {
    throw asError(`${label} is not valid JSON: ${filePath}`, cause);
  }
  return raw;
}

export function loadBaseSections() {
  const data = loadJson(SECTIONS_PATH, "sections.json");
  const sections = data?.sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error('sections.json must contain a non-empty "sections" array');
  }
  const base = new Map();
  for (const section of sections) {
    const type = section?.type;
    if (typeof type !== "string" || !FIELD_PATTERN.test(type)) {
      throw new Error(
        `section "type" must be a lowercase snake identifier, got: ${JSON.stringify(type)}`
      );
    }
    if (base.has(type)) {
      throw new Error(`duplicate section type: ${type}`);
    }
    base.set(type, section);
  }
  return base;
}

export function normalizeCustomSections(raw, base) {
  const entries = Array.isArray(raw) ? raw : raw?.sections;
  if (!Array.isArray(entries)) {
    throw new Error(
      '--custom must be an array of sections or a { "sections": [...] } object'
    );
  }
  const custom = new Map();
  for (const section of entries) {
    const type = section?.type;
    if (typeof type !== "string" || !FIELD_PATTERN.test(type)) {
      throw new Error(
        `custom section "type" must be a lowercase snake identifier, got: ${JSON.stringify(type)}`
      );
    }
    if (RESERVED_PREFIXES.some((prefix) => type.startsWith(prefix))) {
      throw new Error(
        `custom section type "${type}" uses a reserved companion prefix (${RESERVED_PREFIXES.join(", ")})`
      );
    }
    if (base.has(type)) {
      throw new Error(`custom section "${type}" collides with a built-in section`);
    }
    if (custom.has(type)) {
      throw new Error(`duplicate custom section type: ${type}`);
    }
    if (section.fixed !== undefined && typeof section.fixed !== "boolean") {
      throw new Error(`custom section "${type}" "fixed" must be a boolean`);
    }
    if (
      section.label !== undefined &&
      (typeof section.label !== "string" || section.label.trim() === "")
    ) {
      throw new Error(`custom section "${type}" "label" must be a non-empty string`);
    }
    const fields = section.fields;
    if (!Array.isArray(fields)) {
      throw new Error(`custom section "${type}" must declare a "fields" array`);
    }
    for (const field of fields) {
      if (typeof field?.name !== "string" || !FIELD_PATTERN.test(field.name)) {
        throw new Error(
          `custom section "${type}" has a field with an invalid "name": ${JSON.stringify(field?.name)}`
        );
      }
      if (!ALLOWED_FIELD_TYPES.has(field.type)) {
        throw new Error(
          `custom section "${type}" field "${field.name}" has unsupported type ${JSON.stringify(field.type)}`
        );
      }
      if (field.required !== undefined && typeof field.required !== "boolean") {
        throw new Error(
          `custom section "${type}" field "${field.name}" "required" must be a boolean`
        );
      }
      if (
        field.default !== undefined &&
        (typeof field.default !== "object" || field.default === null) &&
        !["string", "number", "boolean"].includes(typeof field.default)
      ) {
        throw new Error(
          `custom section "${type}" field "${field.name}" has an invalid "default"`
        );
      }
    }
    custom.set(type, {
      type,
      fixed: section.fixed === true,
      label:
        typeof section.label === "string" && section.label.trim() !== ""
          ? section.label
          : type,
      fields: fields.map((field) => {
        const copy = { name: field.name, type: field.type };
        if (field.required) copy.required = true;
        if (field.default !== undefined) copy.default = field.default;
        return copy;
      })
    });
  }
  return custom;
}

function sanitizeSectionType(value) {
  const sanitized = String(value).toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!FIELD_PATTERN.test(sanitized)) {
    throw new Error(`invalid section type in contract: ${JSON.stringify(value)}`);
  }
  return sanitized;
}

export function loadContract(raw) {
  if (raw === undefined) return null;
  if (typeof raw !== "object" || raw === null) {
    throw new Error("--contract must be a JSON object");
  }
  const contract = { components: [], sectionTypes: [], componentTypeMap: {} };
  for (const key of ["components", "sectionTypes"]) {
    if (raw[key] !== undefined && !Array.isArray(raw[key])) {
      throw new Error(`--contract "${key}" must be an array of strings`);
    }
    if (Array.isArray(raw[key])) {
      contract[key] = raw[key].map((value) => String(value));
    }
  }
  if (
    raw.componentTypeMap !== undefined &&
    (typeof raw.componentTypeMap !== "object" ||
      raw.componentTypeMap === null ||
      Array.isArray(raw.componentTypeMap))
  ) {
    throw new Error("--contract componentTypeMap must be an object mapping component names to section types");
  }
  if (typeof raw.componentTypeMap === "object" && raw.componentTypeMap !== null) {
    contract.componentTypeMap = raw.componentTypeMap;
  }
  return contract;
}

export function expectedTypes(contract, custom) {
  if (contract === null) return [...custom.keys()];
  const expected = new Set();
  for (const type of contract.sectionTypes) {
    expected.add(sanitizeSectionType(type));
  }
  for (const component of contract.components) {
    const mapped = contract.componentTypeMap[component];
    if (mapped !== undefined) {
      expected.add(sanitizeSectionType(mapped));
    }
  }
  return [...expected];
}

export function classify({ base, custom, contract }) {
  const expected = expectedTypes(contract, custom);
  const emittedTypes = expected.filter((type) => custom.has(type));
  const installed = expected.filter((type) => base.has(type));
  const missing = expected.filter((type) => !base.has(type) && !custom.has(type));
  const unusedCustom = [...custom.keys()].filter((type) => !expected.includes(type));
  return {
    expected,
    installed,
    missing,
    emittedTypes,
    unusedCustom,
    emitted: emittedTypes.map((type) => custom.get(type))
  };
}

export function renderPhp(emitted) {
  const lines = [
    "<?php",
    "/**",
    " * Generated by NexusContent `npm run sections:contract`. Do not edit by hand. Do not commit.",
    " *",
    " * Registers consumer custom sections through the nexuscontent_section_definitions",
    " * filter so the NexusContent companion plugin auto-creates their ACF flexible",
    " * layouts, ACF blocks, and fixed fields. ACF blocks are opt-in per section via",
    " * nexuscontent_block_implementations; the ACF block only appears with ACF Pro.",
    " *",
    " * Drop into wp-content/mu-plugins/nexuscontent-sections.php and regenerate after",
    " * changing the consumer contract with:",
    " *   npm run sections:contract -- --custom <sections.custom.json> --contract <contract.json>",
    " */",
    "",
    "defined( 'ABSPATH' ) || exit;",
    "",
    "add_filter(",
    "\t'nexuscontent_section_definitions',",
    "\tstatic function ( array $definitions ): array {",
    "\t\treturn $definitions + array("
  ];
  for (const section of emitted) {
    lines.push(
      `\t\t\t${phpString(section.type)} => array(`
    );
    if (section.fixed) {
      lines.push("\t\t\t\t'fixed' => true,");
    }
    lines.push(`\t\t\t\t'label'  => ${phpString(section.label)},`);
    lines.push("\t\t\t\t'fields' => array(");
    for (const field of section.fields) {
      const parts = [];
      if (field.required) parts.push("'required' => true");
      if (field.default !== undefined) {
        parts.push(`'default' => ${phpString(field.default)}`);
      }
      lines.push(
        `\t\t\t\t\tarray( 'name' => ${phpString(field.name)}, 'type' => ${phpString(field.type)}${parts.length > 0 ? ", " + parts.join(", ") : ""} ),`
      );
    }
    lines.push("\t\t\t\t),");
    lines.push("\t\t\t),");
  }
  lines.push(
    "\t\t);",
    "\t}",
    ");",
    "",
    "add_filter(",
    "\t'nexuscontent_block_implementations',",
    "\tstatic function ( $selection, string $type ) {",
    `\t\tif ( in_array( $type, array( ${emitted.map((section) => phpString(section.type)).join(", ")} ), true ) ) {`,
    "\t\t\treturn 'both';",
    "\t\t}",
    "\t\treturn $selection;",
    "\t},",
    "\t10,",
    "\t2",
    ");",
    ""
  );
  return lines.join("\n");
}

function report(state) {
  for (const type of state.installed) {
    console.error(`installed: ${type}`);
  }
  for (const section of state.emitted) {
    console.error(`custom:    ${section.type}`);
  }
  for (const type of state.missing) {
    console.error(`missing:   ${type}`);
  }
  for (const type of state.unusedCustom) {
    console.error(`unused:    ${type} (declared but not referenced by the contract)`);
  }
}

export function run({ customPath, contractPath, writePath }) {
  const base = loadBaseSections();
  if (!customPath) {
    throw new Error("--custom <file> is required");
  }
  const custom = normalizeCustomSections(loadJson(customPath, "--custom"), base);
  const contract = loadContract(
    contractPath === undefined ? undefined : loadJson(contractPath, "--contract")
  );
  const state = classify({ base, custom, contract });
  report(state);

  if (state.missing.length > 0) {
    throw new Error(
      `contract references sections with no built-in or declared definition: ${state.missing.join(", ")}`
    );
  }
  if (state.emitted.length === 0) {
    console.error("no custom sections used; nothing to write.");
    return;
  }

  const php = renderPhp(state.emitted);
  if (writePath) {
    writeFileSync(writePath, php);
    console.error(`Wrote ${writePath}`);
  } else {
    process.stdout.write(php);
  }
}

function main() {
  const args = process.argv.slice(2);
  const options = { customPath: undefined, contractPath: undefined, writePath: undefined };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = () => {
      const next = args[index + 1];
      if (next === undefined) throw new Error(`${flag} requires a value`);
      index += 1;
      return next;
    };
    if (flag === "--custom") options.customPath = value();
    else if (flag === "--contract") options.contractPath = value();
    else if (flag === "--write") options.writePath = value();
    else if (flag === "--help" || flag === "-h") {
      console.log(
        "usage: npm run sections:contract -- --custom <file> [--contract <file>] [--write <path>]"
      );
      return;
    } else {
      throw new Error(`unknown argument: ${flag}`);
    }
  }
  run(options);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  try {
    main();
  } catch (cause) {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exit(1);
  }
}