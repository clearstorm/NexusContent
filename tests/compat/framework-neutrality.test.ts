import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative, extname } from "node:path";
import { NexusContent } from "../../src/index.ts";
import { GitProvider } from "../../src/providers/git/index.ts";

const FRAMEWORK_IMPORTS = [
  /from\s+["']astro["']/,
  /from\s+["']next[\/\w-]*["']/,
  /from\s+["']react[\/\w-]*["']/,
  /from\s+["']@tanstack[\/\w-]*["']/,
  /from\s+["']vue[\/\w-]*["']/,
  /from\s+["']svelte[\/\w-]*["']/,
  /from\s+["']@sveltejs[\/\w-]*["']/
];

const FORBIDDEN_DEPENDENCIES = [
  "astro",
  "next",
  "react",
  "@tanstack/react-query",
  "@tanstack/solid-router",
  "vue",
  "svelte"
];

const SRC_DIR = fileURLToPath(new URL("../../src", import.meta.url));
const PACKAGE_JSON_PATH = fileURLToPath(
  new URL("../../package.json", import.meta.url)
);
const EXAMPLE_SOURCE_DIRS = [
  "astro-basic",
  "astro-basic-localised",
  "astro-wordpress"
].map((name) => fileURLToPath(new URL(`../../examples/${name}/src`, import.meta.url)));

const LEGACY_EXAMPLE_PATTERNS = [
  /\bget(?:Page|Collection|Item|Navigation|Settings)Content\b/,
  /\bdata\.fields\b/,
  /\bSectionRenderer\b/,
  /\.image\.url\b/
];

const FRAMEWORK_MARKERS = [
  /\bAstro\b/,
  /\bimport\.meta\.env\b/,
  /\bprocess\.env\b/,
  /\bReact\b/,
  /\bnext\b/,
  /\bwindow\b/,
  /\bdocument\b/
];

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)));
    } else if (extname(entry.name) === ".ts") {
      files.push(path);
    }
  }

  return files;
}

async function collectExampleFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectExampleFiles(path)));
    } else if ([".ts", ".astro", ".mjs"].includes(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

test("Core and provider sources contain no framework imports", async () => {
  const files = await collectSourceFiles(SRC_DIR);

  assert.ok(files.length > 0, "expected source files to exist");

  for (const file of files) {
    const content = await readFile(file, "utf8");
    const rel = relative(SRC_DIR, file);

    for (const pattern of FRAMEWORK_IMPORTS) {
      assert.doesNotMatch(
        content,
        pattern,
        `found a framework import in src/${rel}`
      );
    }
  }
});

test("Core and provider sources contain no framework specific globals", async () => {
  const files = await collectSourceFiles(SRC_DIR);

  for (const file of files) {
    const content = await readFile(file, "utf8");
    const rel = relative(SRC_DIR, file);

    for (const pattern of FRAMEWORK_MARKERS) {
      assert.doesNotMatch(
        content,
        pattern,
        `found a framework specific global in src/${rel}`
      );
    }
  }
});

test("runtime dependencies do not include Astro or any frontend framework", async () => {
  const raw = await readFile(PACKAGE_JSON_PATH, "utf8");
  const manifest = JSON.parse(raw) as {
    dependencies?: Record<string, string>;
  };

  const dependencies = Object.keys(manifest.dependencies ?? {});

  for (const name of FORBIDDEN_DEPENDENCIES) {
    assert.ok(
      !dependencies.includes(name),
      `runtime dependency "${name}" must not be required by Core`
    );
  }
});

test("Astro examples use schema-driven APIs and MediaAsset.src", async () => {
  for (const dir of EXAMPLE_SOURCE_DIRS) {
    for (const file of await collectExampleFiles(dir)) {
      const content = await readFile(file, "utf8");
      for (const pattern of LEGACY_EXAMPLE_PATTERNS) {
        assert.doesNotMatch(content, pattern, `found a legacy pattern in ${file}`);
      }
    }
  }
});

test("the public API works from plain Node code without Astro installed", async () => {
  const contentPath = fileURLToPath(
    new URL("../providers/fixtures/content", import.meta.url)
  );

  const nexus = new NexusContent({
    providers: { git: { type: "git" } },
    schema: {
      models: {
        home: {
          kind: "singleton",
          source: { provider: "git", key: "home", mode: "page" }
        },
        singleton: {
          kind: "singleton",
          source: { provider: "git", key: "navigation" }
        },
        posts: {
          kind: "collection",
          source: { provider: "git", key: "posts" }
        },
        primary: {
          kind: "navigation",
          source: { provider: "git", key: "primary" }
        },
        site: {
          kind: "settings",
          source: { provider: "git", key: "site" }
        }
      }
    }
  });

  nexus.register(
    "git",
    new GitProvider({ contentPath, name: "git" })
  );

  const page = await nexus.getPage("home");
  assert.ok(page);
  assert.equal(page.key, "home");
  assert.equal(page.meta.source, "git");

  const singleton = await nexus.getSingleton("singleton");
  assert.ok(singleton);
  assert.equal(singleton.key, "navigation");
  assert.equal(singleton.meta.sourceId, "singletons/navigation.json");

  const navigation = await nexus.getNavigation("primary");
  assert.ok(navigation);
  assert.equal(navigation.key, "primary");
  assert.equal(navigation.items[1]?.children?.[0]?.label, "Guides");
  assert.equal(navigation.meta.sourceId, "navigation/primary.json");

  const settings = await nexus.getSettings("site");
  assert.ok(settings);
  assert.equal(settings.key, "site");
  assert.equal(settings.data.siteName, "NexusContent Example");
  assert.equal(settings.meta.sourceId, "settings/site.json");

  const collection = await nexus.getCollection("posts");
  assert.equal(collection.length, 2);

  const item = await nexus.getItem("posts", "welcome");
  assert.ok(item);
  assert.equal(item.key, "welcome");
});
