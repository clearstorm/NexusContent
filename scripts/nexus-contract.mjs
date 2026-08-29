#!/usr/bin/env node
/**
 * NexusContent contract CLI, shipped as the `nexus-contract` npm bin of
 * @nexuscontent/core. Runs from a consumer project against the consumer's own
 * schema; nothing is downloaded from the plugin or a website.
 *
 * Commands:
 *   generate — render a WordPress must-use plugin registering the custom
 *     sections a project contract references. Installed section types come
 *     from the site's live companion `/schema` route when a WordPress API root
 *     is configured, falling back to the bundled canonical vocabulary
 *     (scripts/sections.json) offline. The companion plugin auto-creates the
 *     ACF flexible layout (plus optional ACF block and fixed fields) for every
 *     registered custom section, exactly as it does for the built-in twelve.
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
 *   nexus-contract generate [--schema <file> | --contract <file>] --custom <file> [--write <path>] [--api-root <url>]
 *   nexus-contract push     [--schema <file> | --contract <file>] [--api-root <url>] [--username <user>] [--app-password <pass>]
 *
 * --schema points at the consumer's schema.ts; the contract is derived through
 * WordPressProvider.projectComponentContract(). --contract accepts the
 * serialized `{ components, sectionTypes, componentTypeMap? }` shape instead.
 * Without either, `generate` emits every declared custom section.
 *
 * Credentials and roots default to WORDPRESS_API_URL / WORDPRESS_USERNAME /
 * WORDPRESS_APP_PASSWORD (as documented in the example .env).
 */
import { readFileSync, writeFileSync } from "node:fs";
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

export const USAGE = `usage: nexus-contract <generate|push> [options]

generate — render a WordPress must-use plugin registering custom sections
  --schema <file> | --contract <file>   contract source (consumer schema or
                                        serialized {components, sectionTypes,
                                        componentTypeMap?}); omit to emit all
  --custom <file>          custom section definitions (required)
  --write <path>           write the generated PHP to <path> (default stdout)
  --api-root <url>         WordPress API root (default WORDPRESS_API_URL)

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
  if (options.command === "generate") {
    await generateCommand(options);
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