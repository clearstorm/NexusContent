import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
  GitProvider,
  NexusContentError,
  ProviderError
} from "../../src/index.ts";

const contentPath = fileURLToPath(new URL("./fixtures/content", import.meta.url));

function buildProvider(name = "git") {
  return new GitProvider({ contentPath, name });
}

test("loads and normalizes a page", async () => {
  const page = await buildProvider().getPage("home");

  assert.ok(page);
  assert.equal(page.id, "home");
  assert.equal(page.key, "home");
  assert.equal(page.title, "Home");
  assert.equal(page.slug, "home");
  assert.equal(page.seo?.title, "NexusContent Example");

  const hero = page.data.hero as { heading: string };
  const services = page.data.services as { items: unknown[] };
  const cta = page.data.cta as { href: string };

  assert.equal(hero.heading, "Astro owns the website.");
  assert.equal(services.items.length, 3);
  assert.equal(cta.href, "/blog");
});

test("records content provenance for pages", async () => {
  const page = await buildProvider().getPage("about");

  assert.ok(page);
  assert.equal(page.meta.source, "git");
  assert.equal(page.meta.sourceId, "pages/about.json");
  assert.equal(typeof page.meta.updatedAt, "string");
});

test("keeps seo in the envelope and the rest in data", async () => {
  const page = await buildProvider().getPage("about");

  assert.ok(page);
  assert.equal(page.seo?.title, "About - NexusContent Example");
  assert.deepEqual(page.data.story, {
    heading: "Our story",
    content:
      "NexusContent keeps the boundary between content sources and content consumers clean."
  });
});

test("returns null for a missing page", async () => {
  assert.equal(await buildProvider().getPage("missing"), null);
});

test("throws a ProviderError for malformed JSON", async () => {
  await assert.rejects(
    () => buildProvider().getPage("malformed"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.ok(error instanceof NexusContentError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.equal(error.content, "pages/malformed.json");
      assert.match(error.reason ?? "", /JSON/i);
      return true;
    }
  );
});

test("throws a ProviderError when the file is not a JSON object", async () => {
  await assert.rejects(
    () => buildProvider().getPage("array"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.operation, "normalize");
      assert.match(error.reason ?? "", /object/i);
      return true;
    }
  );
});

test("loads a collection with items sorted by file name", async () => {
  const items = await buildProvider().getCollection("posts");

  assert.equal(items.length, 2);
  assert.deepEqual(
    items.map((item) => item.key),
    ["hello-world", "welcome"]
  );
  assert.equal(items[0]?.title, "Hello World");
  assert.equal(items[0]?.meta.sourceId, "collections/posts/hello-world.json");
});

test("normalizes collection items", async () => {
  const items = await buildProvider().getCollection("posts");
  const welcome = items.find((item) => item.key === "welcome");

  assert.ok(welcome);
  assert.equal(welcome.slug, "welcome");
  assert.equal(welcome.meta.source, "git");
  assert.equal(typeof welcome.meta.updatedAt, "string");
  assert.equal(welcome.data.date, "2026-02-10");
});

test("returns an empty array for a missing collection", async () => {
  assert.deepEqual(await buildProvider().getCollection("missing"), []);
});

test("ignores unrelated repository files such as CMS configuration and media", async () => {
  const page = await buildProvider().getPage("home");
  assert.ok(page);

  const items = await buildProvider().getCollection("posts");
  assert.deepEqual(
    items.map((item) => item.key),
    ["hello-world", "welcome"]
  );

  assert.deepEqual(await buildProvider().getCollection("admin"), []);
});

test("loads a single collection item", async () => {
  const item = await buildProvider().getItem("posts", "hello-world");

  assert.ok(item);
  assert.equal(item.key, "hello-world");
  assert.equal(item.title, "Hello World");
  assert.equal((item.data.body as string).includes("consistent content API"), true);
});

test("returns null for a missing collection item", async () => {
  assert.equal(await buildProvider().getItem("posts", "missing"), null);
});

test("supports a custom provider name", async () => {
  const provider = buildProvider("content");

  assert.equal(provider.name, "content");
  const page = await provider.getPage("home");
  assert.ok(page);
  assert.equal(page.meta.source, "git");
});

test("requires a content path", () => {
  assert.throws(
    () => new GitProvider({ contentPath: "" }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match(error.message, /contentPath/);
      return true;
    }
  );
});

test("rejects a page key that escapes the content root", async () => {
  await assert.rejects(
    () => buildProvider().getPage("../../secret"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.ok(error instanceof NexusContentError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.match(error.message, /escapes the configured content root/);
      return true;
    }
  );
});

test("rejects a collection item key that escapes the content root", async () => {
  await assert.rejects(
    () => buildProvider().getItem("../../", "secret"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.match(error.message, /escapes the configured content root/);
      return true;
    }
  );
});

test("rejects a nested collection item key that escapes the content root", async () => {
  await assert.rejects(
    () => buildProvider().getItem("posts", "../../../secret"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.match(error.message, /escapes the configured content root/);
      return true;
    }
  );
});

test("rejects a collection name that escapes the content root", async () => {
  await assert.rejects(
    () => buildProvider().getCollection("../../"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.match(error.message, /escapes the configured content root/);
      return true;
    }
  );
});

test("rejects a collection name that resolves exactly to the content root", async () => {
  await assert.rejects(
    () => buildProvider().getCollection(".."),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.match(error.message, /escapes the configured content root/);
      return true;
    }
  );
});
