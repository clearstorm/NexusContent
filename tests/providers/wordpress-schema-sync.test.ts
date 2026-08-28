import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  ProviderError,
  WordPressProvider,
  applyInstallOnlyDefinitions,
  buildSectionRegistry,
  reconcileSectionRegistry,
  type SectionRegistry,
  type SectionRegistryEntry,
  type WordPressProviderOptions,
  type WordPressSchemaData,
  type WordPressSectionSchema
} from "../../src/index.ts";

const fixtureDirectory = new URL("../contracts/fixtures/", import.meta.url);

async function readFixture(name: string): Promise<unknown> {
  const path = fileURLToPath(new URL(name, fixtureDirectory));
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

function sendJson(
  response: ServerResponse,
  body: unknown,
  options: { status?: number; headers?: Record<string, string> } = {}
): void {
  response.writeHead(options.status ?? 200, {
    "content-type": "application/json",
    ...options.headers
  });
  response.end(JSON.stringify(body));
}

function provider(baseUrl: string, options: Partial<WordPressProviderOptions> = {}): WordPressProvider {
  return new WordPressProvider({ baseUrl, ...options });
}

async function withServer<T>(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  run: (baseUrl: string) => Promise<T>
): Promise<T> {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      resolve();
    });
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}/wp-json/wp/v2`;

  try {
    return await run(baseUrl);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error: Error | undefined) => error ? reject(error) : resolve());
    });
  }
}

/** Builds the canonical install schema from the current registry so tests do
 * not drift from the section definitions. */
function canonicalSchema(
  extras: Array<WordPressSectionSchema> = []
): WordPressSchemaData {
  const registry = buildSectionRegistry();
  const sectionDefinitions: WordPressSectionSchema[] = [];
  const sourceMappings: Record<string, string> = {};

  for (const [sectionType, entry] of registry) {
    const definition = entry.definition;
    const fields = definition.dataSchema?.fields.map((field) => ({
      name: field.name,
      type: field.type
    })) ?? [];
    sectionDefinitions.push({ type: sectionType, fields });
    sourceMappings[definition.sourceType] = sectionType;
    if (definition.sourceKey) sourceMappings[definition.sourceKey] = sectionType;
    sourceMappings[sectionType] = sectionType;
  }

  for (const extra of extras) {
    sectionDefinitions.push(extra);
    sourceMappings[`acf/${extra.type}`] = extra.type;
    sourceMappings[`nexuscontent/${extra.type}`] = extra.type;
    sourceMappings[extra.type] = extra.type;
  }

  return {
    editorModes: ["gutenberg", "acf_flexible", "acf_fixed"],
    sectionDefinitions,
    sourceMappings
  };
}

// ─── reconcileSectionRegistry: clean sync ────────────────────────────

test("reconcile reports a clean sync for the full canonical registry", () => {
  const registry = buildSectionRegistry();
  const result = reconcileSectionRegistry(registry, canonicalSchema());
  assert.equal(result.knownTypes.length, 12);
  assert.equal(result.registryOnly.length, 0);
  assert.equal(result.installOnly.length, 0);
  assert.equal(result.conflicts.length, 0);
});

// ─── reconcileSectionRegistry: install-only sections ────────────────

test("reconcile reports custom sections the install knows but the project does not", () => {
  const registry = buildSectionRegistry();
  const result = reconcileSectionRegistry(registry, canonicalSchema([
    {
      type: "banner",
      fields: [{ name: "headline", type: "string" }]
    }
  ]));
  assert.deepEqual(result.installOnly, ["banner"]);
  assert.equal(result.knownTypes.length, 12);
  assert.equal(result.registryOnly.length, 0);
});

// ─── reconcileSectionRegistry: registry-only sections ───────────────

test("reconcile reports declared sections the install cannot produce", () => {
  const registry = buildSectionRegistry({
    customSections: [{
      type: "legacy-banner",
      sourceType: "acf/legacy-banner",
      dataSchema: { fields: [{ name: "text", type: "string" }] }
    }]
  });
  const result = reconcileSectionRegistry(registry, canonicalSchema());
  assert.deepEqual(result.registryOnly, ["legacy-banner"]);
  assert.equal(result.knownTypes.length, 12);
});

// ─── reconcileSectionRegistry: conflicting source mapping ───────────

test("reconcile reports a source alias resolving to a different installed type", () => {
  const registry: SectionRegistry = new Map<string, SectionRegistryEntry>([
    ["banner", {
      definition: {
        type: "banner",
        sourceType: "acf/banner",
        dataSchema: { fields: [] }
      }
    }]
  ]);
  const schema = canonicalSchema();
  schema.sourceMappings["acf/banner"] = "hero";
  const result = reconcileSectionRegistry(registry, schema);
  assert.equal(result.conflicts.length, 1);
  assert.deepEqual(result.conflicts[0], {
    type: "banner",
    source: "acf/banner",
    expected: "banner",
    installed: "hero"
  });
});

// ─── applyInstallOnlyDefinitions ─────────────────────────────────────

test("applyInstallOnlyDefinitions extends the registry with live sections", () => {
  const registry = buildSectionRegistry();
  const schema = canonicalSchema([
    {
      type: "banner",
      fields: [{ name: "headline", type: "string", required: true }]
    }
  ]);
  const result = reconcileSectionRegistry(registry, schema);
  const merged = applyInstallOnlyDefinitions(registry, result);
  assert.equal(merged.size, 13);
  const banner = merged.get("banner");
  assert.equal(banner?.definition.dataSchema?.fields.length, 1);
});

// ─── Provider integration: sync surfaced through capabilities ───────

test("provider reconciles against the live schema and reports status", async () => {
  const capabilities = await readFixture("companion-capabilities.json");
  const page = await readFixture("companion-page.json");
  const schema = canonicalSchema();
  let schemaRequests = 0;

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else if (url.pathname.includes("schema")) {
      schemaRequests += 1;
      sendJson(response, { contractVersion: 1, data: schema, diagnostics: [] });
    } else if (url.pathname.includes("pages/slug/home")) {
      sendJson(response, page);
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    const wp = provider(baseUrl, { apiStrategy: "auto", sectionRegistry: buildSectionRegistry() });
    assert.equal(wp.capabilities().sectionSync, "none");

    const result = await wp.getPage("home");
    assert.equal(result?.title, "Home");

    const status = wp.schemaStatus();
    assert.equal(status?.knownTypes.length, 12);
    assert.equal(wp.capabilities().sectionSync, "synced");

    await wp.getPage("home");
    assert.equal(schemaRequests, 1, "schema must be fetched only once");
  });
});

test("provider reports unsynced when the install lacks a declared section", async () => {
  const capabilities = await readFixture("companion-capabilities.json");
  const page = await readFixture("companion-page.json");
  const schema = canonicalSchema();

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else if (url.pathname.includes("schema")) {
      sendJson(response, { contractVersion: 1, data: schema, diagnostics: [] });
    } else if (url.pathname.includes("pages/slug/home")) {
      sendJson(response, page);
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    const wp = provider(baseUrl, {
      apiStrategy: "companion",
      customSections: [{
        type: "legacy-banner",
        sourceType: "acf/legacy-banner",
        dataSchema: { fields: [{ name: "text", type: "string" }] }
      }]
    });
    await wp.getPage("home");
    assert.equal(wp.schemaStatus()?.registryOnly.length, 1);
    assert.equal(wp.capabilities().sectionSync, "unsynced");
  });
});

test("strict section sync throws on registry-only drift", async () => {
  const capabilities = await readFixture("companion-capabilities.json");
  const schema = canonicalSchema();

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else if (url.pathname.includes("schema")) {
      sendJson(response, { contractVersion: 1, data: schema, diagnostics: [] });
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    const wp = provider(baseUrl, {
      apiStrategy: "companion",
      strictSectionSync: true,
      customSections: [{
        type: "legacy-banner",
        sourceType: "acf/legacy-banner",
        dataSchema: { fields: [{ name: "text", type: "string" }] }
      }]
    });
    await assert.rejects(
      () => wp.getPage("home"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.match(error.reason ?? "", /legacy-banner/);
        return true;
      }
    );
  });
});

test("core strategy never reconciles", async () => {
  const wp = provider("https://example.com/wp-json/wp/v2", { apiStrategy: "core" });
  assert.equal(await wp.reconcileSections({ provider: "wordpress", operation: "getPage", content: "home" }), undefined);
  assert.equal(wp.capabilities().sectionSync, "none");
});