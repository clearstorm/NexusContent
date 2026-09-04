#!/usr/bin/env node
/**
 * NexusContent contract CLI, shipped as the `nexus-contract` npm bin of
 * @nexuscontent/core. Runs from a consumer project against the consumer's own
 * schema; nothing is downloaded from the plugin or a website.
 *
 * Commands:
 *   init       — scaffold the consumer project contract workflow: write a
 *     starter `sections.custom.json` and a `nexus.contract.json` config
 *     recording the declared paths, so later commands can run without
 *     re-typing flags.
 *   generate   — render a WordPress must-use plugin registering the custom
 *     sections a project contract references. Installed section types come
 *     from the site's live companion `/schema` route when a WordPress API root
 *     is configured, falling back to the bundled canonical vocabulary
 *     (scripts/sections.json) offline. The companion plugin auto-creates the
 *     ACF flexible layout (plus optional ACF block and fixed fields) for every
 *     registered custom section, exactly as it does for the built-in twelve.
 *   regenerate — re-run `generate` using the paths recorded by `init`
 *     (regenerate cascades over the config, keeping `--schema`, `--contract`,
 *     `--custom`, `--write`, and `--api-root` overrides).
 *   validate   — classify the same way `generate` does and print the drift
 *     (installed/custom/missing/unused) without writing anything; exits
 *     non-zero when the contract references sections with no definition.
 *   push     — POST the consumer's project contract
 *     ({ components, sectionTypes, componentTypeMap? }) to the companion
 *     plugin's read-only-drift `project-contract` route.
 *
 * The single source of truth for the built-in vocabulary stays
 * integrations/wordpress/nexuscontent/sections.json; scripts/sections.json is
 * a generated copy shipped for offline classification. This CLI never edits
 * sections.json and never reconfigures editor settings: it emits consumer-owned
 * code (the drop-in for `generate`) or stores only the consumer's sanitized
 * contract (the `push` route) whose Dashboard card remains a read-only drift
 * comparison.
 *
 * Usage:
 *   nexus-contract init     [--config <file>] [--schema <file>] [--custom <file>] [--write <path>] [--api-root <url>] [--force]
 *   nexus-contract generate [--schema <file> | --contract <file>] --custom <file> [--write <path>] [--api-root <url>]
 *   nexus-contract regenerate [--config <file>] [overrides as generate]
 *   nexus-contract validate [--config <file>] [overrides as generate]
 *   nexus-contract push     [--schema <file> | --contract <file>] [--api-root <url>] [--username <user>] [--app-password <pass>]
 *
 * Built-in commands default their paths to the `nexus.contract.json` config
 * written by `init`: `schema` (consumer schema), `custom` (custom section
 * definitions), `write` (generated mu-plugin path), and `apiRoot` (WordPress
 * API root). Explicit flags always win over config values.
 * --schema points at the consumer's schema.ts; the contract is derived through
 * WordPressProvider.projectComponentContract(). --contract accepts the
 * serialized `{ components, sectionTypes, componentTypeMap? }` shape instead.
 * Without either, `generate` emits every declared custom section.
 *
 * Credentials and roots default to WORDPRESS_API_URL / WORDPRESS_USERNAME /
 * WORDPRESS_APP_PASSWORD (as documented in the example .env).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
export const BUNDLED_SECTIONS_PATH = path.join(
  root,
  "scripts",
  "sections.json"
);

export const CONFIG_FILE = "nexus.contract.json";

const CONFIG_KEYS = ["schema", "custom", "write", "apiRoot"];

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

function nexusRoute(input, route) {
  const url = new URL(String(input));
  const wpJson = url.pathname.indexOf("/wp-json");
  const base = (wpJson >= 0 ? url.pathname.slice(0, wpJson) : url.pathname).replace(/\/+$/, "");
  return new URL(`${base}/wp-json/nexuscontent/v1/${route}`, url).toString();
}

export function schemaRouteUrl(input) {
  return nexusRoute(input, "schema");
}

export function projectContractRouteUrl(input) {
  return nexusRoute(input, "project-contract");
}

export function installedSet(definitions) {
  if (!Array.isArray(definitions)) {
    throw new Error("sectionDefinitions must be an array");
  }
  const installed = new Set();
  for (const section of definitions) {
    const type = section?.type;
    if (typeof type !== "string" || !FIELD_PATTERN.test(type)) {
      throw new Error(
        `installed section "type" must be a lowercase snake identifier, got: ${JSON.stringify(type)}`
      );
    }
    if (installed.has(type)) {
      throw new Error(`duplicate installed section type: ${type}`);
    }
    installed.add(type);
  }
  return installed;
}

export function loadBundledSections() {
  const data = loadJson(BUNDLED_SECTIONS_PATH, "bundled sections.json");
  const sections = data?.sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error(
      "bundled sections.json must contain a non-empty \"sections\" array"
    );
  }
  return installedSet(sections);
}

export async function fetchInstalledSections(apiRoot) {
  const url = schemaRouteUrl(apiRoot);
  let response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw asError(
      `could not reach the companion schema route at ${url}; ` +
        "set WORDPRESS_API_URL (or --api-root) to a site running the NexusContent companion plugin.",
      cause
    );
  }
  if (!response.ok) {
    throw new Error(`companion schema route returned ${response.status} ${response.statusText}: ${url}`);
  }
  let body;
  try {
    body = await response.json();
  } catch (cause) {
    throw asError(`companion schema route returned invalid JSON: ${url}`, cause);
  }
  if (body?.contractVersion !== 1 || !body?.data || !Array.isArray(body.data.sectionDefinitions)) {
    throw new Error(`companion schema response is not a valid contract v1 envelope: ${url}`);
  }
  return installedSet(body.data.sectionDefinitions);
}

export function normalizeCustomSections(raw, installed) {
  const entries = Array.isArray(raw) ? raw : raw?.sections;
  if (!Array.isArray(entries)) {
    throw new Error(
      "--custom must be an array of sections or a { \"sections\": [...] } object"
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
    if (installed.has(type)) {
      throw new Error(
        `custom section "${type}" collides with an installed section`
      );
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
    throw new Error(
      "--contract componentTypeMap must be an object mapping component names to section types"
    );
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
    const mapped = (contract.componentTypeMap ?? {})[component];
    if (mapped !== undefined) {
      expected.add(sanitizeSectionType(mapped));
    }
  }
  return [...expected];
}

export function classify({ installed, custom, contract }) {
  const expected = expectedTypes(contract, custom);
  const emittedTypes = expected.filter((type) => custom.has(type));
  const installedTypes = expected.filter((type) => installed.has(type));
  const missing = expected.filter((type) => !installed.has(type) && !custom.has(type));
  const unusedCustom = [...custom.keys()].filter((type) => !expected.includes(type));
  return {
    expected,
    installed: installedTypes,
    missing,
    emittedTypes,
    unusedCustom,
    emitted: emittedTypes.map((type) => custom.get(type))
  };
}

export async function deriveContractFromSchema(schemaPath, apiRoot) {
  const resolved = path.resolve(schemaPath);
  const { schema } = await import(pathToFileURL(resolved).href);
  const { WordPressProvider } = await import("@nexuscontent/core");
  const provider = new WordPressProvider({
    // projectComponentContract() needs no retrieval; the base URL is only
    // validated, so an unreachable placeholder is fine when classifying offline.
    baseUrl: apiRoot ?? "https://wordpress.invalid/",
    apiStrategy: "core"
  });
  return provider.projectComponentContract(schema);
}

function resolveContractFilePath(contractPath) {
  return loadContract(loadJson(contractPath, "--contract"));
}

async function resolveContract({ schemaPath, contractPath, apiRoot }) {
  if (schemaPath !== undefined && contractPath !== undefined) {
    throw new Error("provide --schema or --contract, not both");
  }
  if (contractPath !== undefined) {
    return resolveContractFilePath(contractPath);
  }
  if (schemaPath !== undefined) {
    return deriveContractFromSchema(schemaPath, apiRoot);
  }
  return null;
}

async function resolveInstalled(apiRoot) {
  if (apiRoot) {
    try {
      const installed = await fetchInstalledSections(apiRoot);
      console.error(
        `installed sections read from the live companion schema at ${schemaRouteUrl(apiRoot)}`
      );
      return installed;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const bundled = loadBundledSections();
      console.error(
        `WARNING: falling back to the bundled canonical vocabulary (${path.relative(root, BUNDLED_SECTIONS_PATH)}) ` +
          `because the live companion schema was unavailable: ${message}`
      );
      return bundled;
    }
  }
  const bundled = loadBundledSections();
  console.error(
    `installed sections read from the bundled canonical vocabulary (offline). ` +
      "Set WORDPRESS_API_URL (or --api-root) to classify against the live site."
  );
  return bundled;
}

export function renderPhp(emitted) {
  const lines = [
    "<?php",
    "/**",
    " * Generated by the NexusContent `nexus-contract generate` CLI. Do not edit by hand. Do not commit.",
    " *",
    " * Registers consumer custom sections through the nexuscontent_section_definitions",
    " * filter so the NexusContent companion plugin auto-creates their ACF flexible",
    " * layouts, ACF blocks, and fixed fields. ACF blocks are opt-in per section via",
    " * nexuscontent_block_implementations; the ACF block only appears with ACF Pro.",
    " *",
    " * Drop into wp-content/mu-plugins/nexuscontent-sections.php and regenerate after",
    " * changing the consumer contract with:",
    " *   npx @nexuscontent/core@latest nexus-contract generate \\",
    " *     --schema <schema.ts> --custom <sections.custom.json> --write <this file>",
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
    lines.push(`\t\t\t${phpString(section.type)} => array(`);
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

export function loadConfig(configPath) {
  const data = loadJson(configPath, "--config");
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(`--config must be a JSON object: ${configPath}`);
  }
  const config = {};
  for (const key of CONFIG_KEYS) {
    if (data[key] === undefined) continue;
    if (typeof data[key] !== "string" || data[key].trim() === "") {
      throw new Error(
        `--config "${key}" must be a non-empty string: ${JSON.stringify(data[key])}`
      );
    }
    config[key] = data[key];
  }
  return config;
}

function configPathFor(options) {
  return options.configPath ?? CONFIG_FILE;
}

export function resolveConfig(options) {
  const configPath = configPathFor(options);
  let config = {};
  if (options.configPath !== undefined || existsSync(configPath)) {
    config = loadConfig(configPath);
    console.error(
      `options read from ${configPath}: ${CONFIG_KEYS.filter((key) => config[key] !== undefined).join(", ") || "(none set)"}`
    );
  }
  return {
    schemaPath: options.schemaPath ?? config.schema,
    contractPath: options.contractPath,
    customPath: options.customPath ?? config.custom,
    writePath: options.writePath ?? config.write,
    apiRoot: options.apiRoot ?? config.apiRoot
  };
}

const INIT_GUIDANCE = `Custom sections are added to the "sections" array of <custom>:

  {
    "sections": [
      {
        "type": "team_grid",
        "label": "Team Grid",
        "fixed": false,
        "fields": [
          { "name": "heading", "type": "string", "required": true }
        ]
      }
    ]
  }

Field types: string, number, boolean, json, media.
Type names are lowercase snake identifiers and must not use the reserved
prefixes (nc-, nexus-, nc_, nexus_) or collide with an installed section.

Next steps:
  npx @nexuscontent/core nexus-contract generate     render the mu-plugin from the config
  npx @nexuscontent/core nexus-contract regenerate   re-render after schema changes
  npx @nexuscontent/core nexus-contract validate     check the contract without writing
  npx @nexuscontent/core nexus-contract push --api-root <url> --username <user> --app-password <pass>
`;

export function initCommand(options) {
  const configPath = configPathFor(options);
  const customPath = options.customPath ?? "sections.custom.json";
  for (const file of [configPath, customPath]) {
    if (existsSync(file) && !options.force) {
      throw new Error(
        `${file} already exists; pass --force to overwrite it (custom sections are preserved, so only use --force to recreate the starter).`
      );
    }
  }

  const entry = {
    schema: typeof options.schemaPath === "string" ? options.schemaPath : undefined,
    custom: customPath,
    write: typeof options.writePath === "string" ? options.writePath : undefined,
    apiRoot: typeof options.apiRoot === "string" ? options.apiRoot : undefined
  };
  const config = {};
  for (const key of CONFIG_KEYS) {
    if (entry[key] !== undefined) config[key] = entry[key];
  }

  writeFileSync(customPath, JSON.stringify({ sections: [] }, null, 2) + "\n", {
    flag: options.force ? "w" : "wx"
  });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", {
    flag: options.force ? "w" : "wx"
  });
  console.error(`Wrote ${customPath}`);
  console.error(`Wrote ${configPath}`);
  process.stdout.write(
    `Initialized the NexusContent contract workflow.\n\n${INIT_GUIDANCE}`
  );
}

export async function validateCommand(options) {
  const merge = resolveConfig(options);
  const installed = await resolveInstalled(merge.apiRoot);
  const custom = normalizeCustomSections(
    loadJson(merge.customPath, "--custom"),
    installed
  );
  const contract = await resolveContract({
    schemaPath: merge.schemaPath,
    contractPath: merge.contractPath,
    apiRoot: merge.apiRoot
  });
  const state = classify({ installed, custom, contract });
  report(state);
  if (state.missing.length > 0) {
    throw new Error(
      `contract references sections with no installed or declared definition: ${state.missing.join(", ")}`
    );
  }
  console.error(
    `validate: ${state.emitted.length} custom and ${state.installed.length} installed section(s) resolve; ` +
      (state.unusedCustom.length > 0
        ? `${state.unusedCustom.length} custom declaration(s) are not referenced: ${state.unusedCustom.join(", ")}`
        : "no unused custom declarations.")
  );
}

export async function generateCommand(options) {
  if (!options.customPath) {
    throw new Error("generate requires --custom <file>");
  }
  const installed = await resolveInstalled(options.apiRoot);
  const custom = normalizeCustomSections(loadJson(options.customPath, "--custom"), installed);
  const contract = await resolveContract(options);
  const state = classify({ installed, custom, contract });
  report(state);

  if (state.missing.length > 0) {
    throw new Error(
      `contract references sections with no installed or declared definition: ${state.missing.join(", ")}`
    );
  }
  if (state.emitted.length === 0) {
    console.error("no custom sections used; nothing to write.");
    return;
  }

  const php = renderPhp(state.emitted);
  if (options.writePath) {
    writeFileSync(options.writePath, php);
    console.error(`Wrote ${options.writePath}`);
  } else {
    process.stdout.write(php);
  }
}

export async function regenerateCommand(options) {
  const resolved = resolveConfig(options);
  if (resolved.customPath === undefined) {
    throw new Error(
      `regenerate needs a custom sections file: add "custom" to ${configPathFor(options)} ` +
        "(run `nexus-contract init` to create it) or pass --custom <file>"
    );
  }
  await generateCommand({
    customPath: resolved.customPath,
    writePath: resolved.writePath,
    schemaPath: resolved.schemaPath,
    contractPath: resolved.contractPath,
    apiRoot: resolved.apiRoot
  });
}

async function pushContract(contract, url, username, appPassword) {
  const authHeader = {
    Authorization: `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`
  };
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader
      },
      body: JSON.stringify(contract)
    });
  } catch (cause) {
    throw asError(`could not reach the project-contract route at ${url}`, cause);
  }
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.message) detail = `${response.status} ${body.message}`;
    } catch {
      // Non-JSON error body; the status line is enough.
    }
    throw new Error(
      `${detail}. Check that the WP API root points at this site, the plugin is active, ` +
        "and the app-password user has manage_options."
    );
  }
  return response.json();
}

export async function pushCommand(options) {
  const apiRoot = options.apiRoot ?? process.env.WORDPRESS_API_URL;
  const username = options.username ?? process.env.WORDPRESS_USERNAME;
  const appPassword = options.appPassword ?? process.env.WORDPRESS_APP_PASSWORD;
  if (!apiRoot) {
    throw new Error("push requires --api-root <url> or WORDPRESS_API_URL");
  }
  if (!username || !appPassword) {
    throw new Error(
      "push requires --username/--app-password or WORDPRESS_USERNAME/WORDPRESS_APP_PASSWORD"
    );
  }
  const contract = await resolveContract(options);
  if (contract === null) {
    throw new Error("push requires --schema <file> or --contract <file>");
  }

  const url = projectContractRouteUrl(apiRoot);
  const stored = await pushContract(contract, url, username, appPassword);
  console.log(
    `Pushed project contract to ${url}: ` +
      `${stored.components.length} components [${stored.components.join(", ")}], ` +
      `${stored.sectionTypes.length} section types [${stored.sectionTypes.join(", ")}]. ` +
      "Refresh the plugin admin page to see the contract and drift."
  );
}

export const USAGE = `usage: nexus-contract <init|generate|regenerate|validate|push> [options]

init — scaffold the project contract workflow (config + starter custom file)
  --schema <file>          record the consumer schema path in the config
  --custom <file>          starter custom sections file (default sections.custom.json)
  --write <path>           record the generated mu-plugin path in the config
  --api-root <url>         record the WordPress API root in the config
  --config <file>          config file to write (default nexus.contract.json)
  --force                  overwrite the config and the starter custom file

generate — render a WordPress must-use plugin registering custom sections
  --schema <file> | --contract <file>   contract source (consumer schema or
                                        serialized {components, sectionTypes,
                                        componentTypeMap?}); omit to emit all
  --custom <file>          custom section definitions (required)
  --write <path>           write the generated PHP to <path> (default stdout)
  --api-root <url>         WordPress API root (default WORDPRESS_API_URL)

regenerate — re-run generate using the paths recorded by init
  --config <file>          config file to read (default nexus.contract.json)
  --schema <file> | --contract <file>   override the recorded contract source
  --custom <file>          override the recorded custom sections file
  --write <path>           override the recorded output path
  --api-root <url>         override the recorded WordPress API root

validate — classify without writing; fails when sections are undefined
  --config <file>          config file to read (default nexus.contract.json)
  --schema <file> | --contract <file>   override the recorded contract source
  --custom <file>          override the recorded custom sections file
  --api-root <url>         override the recorded WordPress API root

push — POST the consumer project contract to the companion plugin
  --schema <file> | --contract <file>   contract source (required)
  --api-root <url>         WordPress API root (default WORDPRESS_API_URL)
  --username <user>        (default WORDPRESS_USERNAME)
  --app-password <pass>    (default WORDPRESS_APP_PASSWORD)

  --help, -h               show this help
`;

export function parseArgs(argv) {
  const options = {
    command: undefined,
    help: false,
    configPath: undefined,
    force: false,
    customPath: undefined,
    writePath: undefined,
    schemaPath: undefined,
    contractPath: undefined,
    apiRoot: undefined,
    username: undefined,
    appPassword: undefined
  };
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined) throw new Error(`${token} requires a value`);
      index += 1;
      return next;
    };
    switch (token) {
      case "--config":
        options.configPath = value();
        break;
      case "--force":
        options.force = true;
        break;
      case "--custom":
        options.customPath = value();
        break;
      case "--write":
        options.writePath = value();
        break;
      case "--schema":
        options.schemaPath = value();
        break;
      case "--contract":
        options.contractPath = value();
        break;
      case "--api-root":
        options.apiRoot = value();
        break;
      case "--username":
        options.username = value();
        break;
      case "--app-password":
        options.appPassword = value();
        break;
      default:
        throw new Error(`unknown argument: ${token}`);
    }
  }
  if (positionals.length > 1) {
    throw new Error(`unexpected extra arguments: ${positionals.slice(1).join(" ")}`);
  }
  options.command = positionals[0];
  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(USAGE);
    return;
  }
  if (options.command === "init") {
    initCommand(options);
  } else if (options.command === "generate") {
    await generateCommand(options);
  } else if (options.command === "regenerate") {
    await regenerateCommand(options);
  } else if (options.command === "validate") {
    await validateCommand(options);
  } else if (options.command === "push") {
    await pushCommand(options);
  } else {
    throw new Error(`unknown command: ${options.command ?? "(none)"}; run \`nexus-contract --help\``);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  try {
    await main();
  } catch (cause) {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exit(1);
  }
}