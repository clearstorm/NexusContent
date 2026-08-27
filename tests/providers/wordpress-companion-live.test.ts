import { test } from "node:test";
import assert from "node:assert/strict";
import { WordPressProvider } from "../../src/index.ts";

const WP_BASE_URL =
  process.env.WP_BASE_URL ?? "http://localhost:8888/wp-json/wp/v2";

const wpReachable = fetch(WP_BASE_URL)
  .then((response) => response.ok)
  .catch(() => false);

async function requireLiveWp(
  context: { skip: (reason: string) => void }
): Promise<boolean> {
  if (!(await wpReachable)) {
    context.skip("wp-env is not running; this integration test needs a live WordPress instance.");
    return false;
  }
  return true;
}

function provider(options: Record<string, unknown> = {}): WordPressProvider {
  return new WordPressProvider({
    baseUrl: WP_BASE_URL,
    name: "live-integration",
    apiStrategy: "auto",
    ...options
  });
}

// ─── Page retrieval ────────────────────────────────────────────────

test("getPage returns published page by slug from the companion", async (t) => {
  if (!(await requireLiveWp(t))) return;
  const page = await provider().getPage("sample-page");
  assert.ok(page !== null, "expected non-null page for sample-page");
  assert.equal(typeof page.id, "string");
  assert.equal(page.key, "sample-page");
  assert.equal(page.meta.source, "wordpress");
  assert.equal(typeof page.title, "string");
});

test("getPage returns null for nonexistent slug", async (t) => {
  if (!(await requireLiveWp(t))) return;
  const page = await provider().getPage("nonexistent-page-xyz-123");
  assert.equal(page, null);
});

// ─── Collection retrieval ──────────────────────────────────────────

test("getCollection returns pages with expected shape", async (t) => {
  if (!(await requireLiveWp(t))) return;
  const pages = await provider().getCollection("posts");
  assert.ok(Array.isArray(pages), "expected array");
  assert.ok(pages.length > 0, "expected at least one entry");
  const first = pages[0]!;
  assert.equal(typeof first.id, "string");
  assert.equal(typeof first.key, "string");
  assert.equal(first.meta.source, "wordpress");
});

// ─── Item retrieval ────────────────────────────────────────────────

test("getItem returns single entry by slug", async (t) => {
  if (!(await requireLiveWp(t))) return;
  const item = await provider().getItem("posts", "sample-page");
  assert.ok(item !== null, "expected non-null item for sample-page");
  assert.equal(item.key, "sample-page");
  assert.equal(item.meta.source, "wordpress");
});

test("getItem returns null for nonexistent entry", async (t) => {
  if (!(await requireLiveWp(t))) return;
  const item = await provider().getItem("posts", "nonexistent-page-xyz-999");
  assert.equal(item, null);
});

// ─── Core fallback ─────────────────────────────────────────────────

test("strategy core falls back to standard REST retrieval", async (t) => {
  if (!(await requireLiveWp(t))) return;
  const page = await provider({ apiStrategy: "core" }).getPage("sample-page");
  assert.ok(page !== null, "expected non-null page for sample-page");
  assert.equal(page.key, "sample-page");
  assert.equal(page.meta.source, "wordpress");
});