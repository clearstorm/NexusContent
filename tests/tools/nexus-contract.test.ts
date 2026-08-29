import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BUNDLED_SECTIONS_PATH,
  classify,
  deriveContractFromSchema,
  expectedTypes,
  fetchInstalledSections,
  generateCommand,
  installedSet,
  loadBundledSections,
  loadContract,
  main,
  normalizeCustomSections,
  parseArgs,
  phpString,
  projectContractRouteUrl,
  pushCommand,
  renderPhp,
  schemaRouteUrl
} from "../../scripts/nexus-contract.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

// Installed vocabulary used by the classification tests; mirrors the bundled
// canonical sections so the fixtures are explicit rather than base-loaded.
const INSTALLED = new Set([
  "hero",
  "intro",
  "rich_text",
  "image_text",
  "features",
  "statistics",
  "testimonials",
  "gallery",
  "cta",
  "faq",
  "logo_grid",
  "form_embed"
]);

const CUSTOM_RAW = [
  {
    type: "services_list",
    label: "Services List",
    fixed: true,
    fields: [
      { name: "heading", type: "string" },
      { name: "icon", type: "media" }
    ]
  },
  {
    type: "promo",
    fields: [{ name: "code", type: "string", required: true }]
  },
  {
    type: "unused_type",
    fields: [{ name: "title", type: "string" }]
  }
];

function custom() {
  return normalizeCustomSections(CUSTOM_RAW, INSTALLED);
}

function withFetch(implementation: typeof fetch) {
  const original = globalThis.fetch;
  globalThis.fetch = implementation;
  return () => {
    globalThis.fetch = original;
  };
}

test("classify splits installed, custom, and missing, catching unused declarations", () => {
  const contract = loadContract({
    components: ["servicesList"],
    sectionTypes: ["hero", "services_list", "promo", "mystery"],
    componentTypeMap: { servicesList: "services_list" }
  });
  const state = classify({ installed: INSTALLED, custom: custom(), contract });
  assert.deepEqual(state.installed, ["hero"]);
  assert.deepEqual(state.emittedTypes, ["services_list", "promo"]);
  assert.deepEqual(state.missing, ["mystery"]);
  assert.deepEqual(state.unusedCustom, ["unused_type"]);
});

test("expected types resolve through componentTypeMap and include sectionTypes", () => {
  const contract = loadContract({
    components: ["mapToInstalled", "mapToCustom", "noMap"],
    sectionTypes: [],
    componentTypeMap: { mapToInstalled: "features", mapToCustom: "promo" }
  });
  const state = classify({ installed: INSTALLED, custom: custom(), contract });
  assert.deepEqual(state.installed, ["features"]);
  assert.deepEqual(state.emittedTypes, ["promo"]);
  assert.deepEqual(state.missing, []);
});

test("without a componentTypeMap components contribute no expected types", () => {
  const contract = {
    components: ["hero", "features"],
    sectionTypes: ["promo", "mystery"],
    componentTypeMap: {}
  };
  const state = classify({ installed: INSTALLED, custom: custom(), contract });
  assert.deepEqual(state.installed, []);
  assert.deepEqual(state.emittedTypes, ["promo"]);
  assert.deepEqual(state.missing, ["mystery"]);
});

test("without a contract every declared custom section is emitted", () => {
  const state = classify({ installed: INSTALLED, custom: custom(), contract: null });
  assert.deepEqual(state.installed, []);
  assert.deepEqual(state.emittedTypes, ["services_list", "promo", "unused_type"]);
  assert.deepEqual(state.missing, []);
});

test("custom sections reject reserved prefixes and installed collisions", () => {
  assert.throws(
    () => normalizeCustomSections([{ type: "nc_badge", fields: [] }], INSTALLED),
    /reserved/
  );
  assert.throws(
    () => normalizeCustomSections([{ type: "nexus_badge", fields: [] }], INSTALLED),
    /reserved/
  );
  assert.throws(
    () => normalizeCustomSections([{ type: "hero", fields: [] }], INSTALLED),
    /collides/
  );
});

test("custom sections reject disallowed field types and bad names", () => {
  assert.throws(
    () =>
      normalizeCustomSections(
        [{ type: "thing", fields: [{ name: "x", type: "yaml" }] }],
        INSTALLED
      ),
    /unsupported type "yaml"/
  );
  assert.throws(
    () =>
      normalizeCustomSections(
        [{ type: "thing", fields: [{ name: "bad name", type: "string" }] }],
        INSTALLED
      ),
    /invalid "name"/
  );
});

test("installedSet validates live section definitions", () => {
  assert.deepEqual(
    [...installedSet([{ type: "hero" }, { type: "faq" }])],
    ["hero", "faq"]
  );
  assert.throws(() => installedSet([{ type: "HR_ro" }]), /lowercase snake/);
  assert.throws(() => installedSet([{ type: "hero" }, { type: "hero" }]), /duplicate/);
  assert.throws(() => installedSet(null), /must be an array/);
});

test("loadBundledSections exposes the canonical 12 built-ins", () => {
  assert.ok(existsSync(BUNDLED_SECTIONS_PATH));
  const bundled = loadBundledSections();
  assert.ok(bundled.has("hero"));
  assert.equal(bundled.size, 12);
});

test("fetchInstalledSections parses envelope and reports actionable errors", async () => {
  const restore = withFetch(async () => new Response(JSON.stringify({ contractVersion: 1, data: { sectionDefinitions: [{ type: "hero" }, { type: "promo" }] } })));
  try {
    const installed = await fetchInstalledSections("https://wp.test/wp-json/wp/v2");
    assert.deepEqual([...installed], ["hero", "promo"]);
  } finally {
    restore();
  }

  const restoreBad = withFetch(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
  try {
    await assert.rejects(() => fetchInstalledSections("https://wp.test/"), /not a valid contract v1 envelope/);
  } finally {
    restoreBad();
  }

  const restoreHttp = withFetch(async () => new Response("nope", { status: 500, statusText: "Ouch" }));
  try {
    await assert.rejects(() => fetchInstalledSections("https://wp.test/"), /500 Ouch/);
  } finally {
    restoreHttp();
  }

  const restoreNet = withFetch(async () => {
    throw new TypeError("fetch failed");
  });
  try {
    await assert.rejects(
      () => fetchInstalledSections("https://wp.test/"),
      /could not reach the companion schema route/
    );
  } finally {
    restoreNet();
  }
});

test("URL helpers derive nexus namespace routes from wp-json or bare roots", () => {
  assert.equal(
    schemaRouteUrl("https://wp.test/wp-json/wp/v2"),
    "https://wp.test/wp-json/nexuscontent/v1/schema"
  );
  assert.equal(
    projectContractRouteUrl("https://wp.test/"),
    "https://wp.test/wp-json/nexuscontent/v1/project-contract"
  );
  assert.equal(
    projectContractRouteUrl("http://local.test:8080/wp-json/"),
    "http://local.test:8080/wp-json/nexuscontent/v1/project-contract"
  );
});

test("generateCommand offline uses the bundled vocabulary and emits lintable PHP", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nexus-gen-"));
  try {
    const customPath = path.join(dir, "custom.json");
    const outputPath = path.join(dir, "nexuscontent-sections.php");
    writeFileSync(customPath, JSON.stringify({ sections: CUSTOM_RAW }));
    await generateCommand({ customPath, writePath: outputPath, apiRoot: undefined });
    const php = readFileSync(outputPath, "utf8");
    assert.ok(php?.startsWith("<?php"));
    assert.ok(php.includes("'services_list' => array("));
    assert.ok(php.includes("'fixed' => true,"));
    execFileSync("php", ["-l", outputPath], { stdio: "pipe" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("generateCommand perfection requires --custom and rejects built-in collisions", async () => {
  const shared = { writePath: undefined, schemaPath: undefined };
  await assert.rejects(
    () => generateCommand({ ...shared, customPath: undefined, apiRoot: undefined }),
    /requires --custom/
  );
  const dir = mkdtempSync(path.join(tmpdir(), "nexus-gen-"));
  try {
    const customPath = path.join(dir, "custom.json");
    writeFileSync(customPath, JSON.stringify({ sections: [{ type: "hero", fields: [] }] }));
    await assert.rejects(
      () => generateCommand({ ...shared, customPath, apiRoot: undefined }),
      /collides with an installed section/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("pushCommand posts the contract and reports summary", async () => {
  const seen: {
    url?: string;
    body?: Record<string, unknown>;
    auth?: string;
  } = {};
  const restore = withFetch(async (url: unknown, init?: RequestInit) => {
    seen.url = String(url);
    seen.body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    seen.auth =
      (init?.headers as Record<string, string> | undefined)?.Authorization ?? undefined;
    return new Response(JSON.stringify({ components: ["hero"], sectionTypes: ["hero"] }));
  });
  const dir = mkdtempSync(path.join(tmpdir(), "nexus-push-"));
  try {
    const contractPath = path.join(dir, "contract.json");
    writeFileSync(contractPath, JSON.stringify({ components: ["hero"], sectionTypes: ["hero"] }));
    await pushCommand({
      apiRoot: "https://wp.test/wp-json/wp/v2",
      username: "admin",
      appPassword: "pass pass",
      contractPath
    });
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(seen.url, "https://wp.test/wp-json/nexuscontent/v1/project-contract");
  assert.deepEqual(seen.body?.components, ["hero"]);
  assert.ok(seen.auth?.startsWith("Basic "));
});

test("pushCommand surfaces route failures and missing credentials", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nexus-push-"));
  try {
    const contractPath = path.join(dir, "contract.json");
    writeFileSync(contractPath, JSON.stringify({ components: ["hero"], sectionTypes: ["hero"] }));
    const restore = withFetch(async () => new Response(JSON.stringify({ message: "denied" }), { status: 500, statusText: "Internal" }));
    try {
      await assert.rejects(
        () => pushCommand({ apiRoot: "https://wp.test/", username: "u", appPassword: "p", contractPath }),
        /500 denied/
      );
    } finally {
      restore();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  await assert.rejects(
    () => pushCommand({ apiRoot: undefined, username: "u", appPassword: "p" }),
    /requires --api-root/
  );
  await assert.rejects(
    () => pushCommand({ apiRoot: "https://wp.test/", username: undefined, appPassword: undefined }),
    /requires --username/
  );
});

test("deriveContractFromSchema reads the consumer schema type-stripped", async (t) => {
  // Requires the built package (self-reference / dist); skipped on fresh checkouts.
  const distIndex = path.join(root, "dist/index.js");
  if (!existsSync(distIndex)) {
    t.skip("dist not built; run npm run build first");
    return;
  }
  const schemaPath = path.join(root, "examples/astro-wordpress/src/schema/schema.ts");
  const contract = await deriveContractFromSchema(schemaPath, undefined);
  assert.ok(contract.sectionTypes.includes("hero"));
  assert.ok(contract.sectionTypes.includes("form_embed"));
  assert.equal(contract.sectionTypes.length, 12);
});

test("parseArgs handles commands, flags, help, and unknown input", () => {
  const parsed = parseArgs([
    "generate",
    "--schema",
    "src/schema/schema.ts",
    "--custom",
    "sections.custom.json",
    "--write",
    "out.php",
    "--api-root",
    "https://wp.test/wp-json/wp/v2"
  ]);
  assert.equal(parsed.command, "generate");
  assert.equal(parsed.schemaPath, "src/schema/schema.ts");
  assert.equal(parsed.writePath, "out.php");
  assert.equal(parsed.apiRoot, "https://wp.test/wp-json/wp/v2");

  assert.equal(parseArgs(["--help"]).help, true);
  assert.throws(() => parseArgs(["--nope"]), /unknown argument/);
  assert.throws(() => parseArgs(["generate", "extra"]), /extra arguments/);
});

test("main rejects unknown commands", async () => {
  await assert.rejects(() => main(["frobnicate"]), /unknown command/);
});

test("renderPhp is deterministic, emits both filters, and lints under php", () => {
  const state = classify({
    installed: INSTALLED,
    custom: custom(),
    contract: loadContract({ sectionTypes: ["services_list", "promo"] })
  });
  const first = renderPhp(state.emitted);
  const second = renderPhp(state.emitted);
  assert.equal(first, second);
  assert.ok(first.startsWith("<?php"));
  assert.ok(first.includes("'nexuscontent_section_definitions'"));
  assert.ok(first.includes("'nexuscontent_block_implementations'"));
  assert.ok(first.includes("'services_list' => array("));
  assert.ok(first.includes("'fixed' => true,"));
  assert.ok(first.includes("array( 'name' => 'icon', 'type' => 'media' ),"));
  assert.ok(first.includes("'services_list', 'promo'"));

  const dir = mkdtempSync(path.join(tmpdir(), "nexus-sections-"));
  try {
    const file = path.join(dir, "nexuscontent-sections.php");
    writeFileSync(file, first);
    execFileSync("php", ["-l", file], { stdio: "pipe" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a contract sectionType with no definition is classified as missing, not emitted", () => {
  const contract = loadContract({ sectionTypes: ["promo", "services_list", "unknown_section"] });
  const state = classify({ installed: INSTALLED, custom: custom(), contract });
  assert.deepEqual(state.missing, ["unknown_section"]);
  assert.deepEqual(state.emittedTypes, ["promo", "services_list"]);
});

test("package wiring ships the CLI and bundled vocabulary", async () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.bin["nexus-contract"], "scripts/nexus-contract.mjs");
  assert.ok(pkg.files.includes("scripts/nexus-contract.mjs"));
  assert.ok(pkg.files.includes("scripts/sections.json"));
  assert.ok(existsSync(path.join(root, "scripts/nexus-contract.mjs")));
  assert.ok(existsSync(BUNDLED_SECTIONS_PATH));
});