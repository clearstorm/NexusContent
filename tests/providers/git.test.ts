import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  assert.equal(page.seo?.canonicalUrl, "https://example.com/");
  assert.equal(page.seo?.robots?.follow, true);
  assert.equal(page.seo?.openGraph?.image?.alt, "NexusContent");
  assert.equal(page.seo?.twitter?.card, "summary_large_image");
  assert.equal(page.seo?.structuredData?.[0]?.["@type"], "WebSite");

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

test("keeps SEO optional for Git pages", async () => {
  const page = await buildProvider().getPage("no-seo");

  assert.ok(page);
  assert.equal(page.seo, undefined);
  assert.equal(page.data.body, "SEO remains optional.");
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

test("loads and normalizes navigation singleton content", async () => {
  const singleton = await buildProvider().getSingleton("navigation");

  assert.ok(singleton);
  assert.equal(singleton.id, "navigation");
  assert.equal(singleton.key, "navigation");
  assert.deepEqual(singleton.data.items, [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" }
  ]);
});

test("loads settings as provider-neutral singleton content", async () => {
  const singleton = await buildProvider().getSingleton("settings");

  assert.ok(singleton);
  assert.equal(singleton.id, "settings");
  assert.equal(singleton.key, "settings");
  assert.equal(singleton.data.siteName, "NexusContent Example");
  assert.equal(singleton.data.locale, "en-ZA");
});

test("records content provenance for singletons", async () => {
  const singleton = await buildProvider().getSingleton("navigation");

  assert.ok(singleton);
  assert.equal(singleton.meta.source, "git");
  assert.equal(singleton.meta.sourceId, "singletons/navigation.json");
  assert.equal(typeof singleton.meta.updatedAt, "string");
});

test("returns null for a missing singleton", async () => {
  assert.equal(await buildProvider().getSingleton("missing"), null);
});

test("throws a ProviderError for malformed singleton JSON", async () => {
  await assert.rejects(
    () => buildProvider().getSingleton("malformed"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.equal(error.content, "singletons/malformed.json");
      assert.match(error.reason ?? "", /JSON/i);
      return true;
    }
  );
});

test("throws a ProviderError when a singleton file is not a JSON object", async () => {
  await assert.rejects(
    () => buildProvider().getSingleton("array"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.operation, "normalize");
      assert.equal(error.content, "singletons/array.json");
      assert.match(error.reason ?? "", /object/i);
      return true;
    }
  );
});

test("loads navigation from the dedicated navigation directory", async () => {
  const navigation = await buildProvider().getNavigation("primary");

  assert.ok(navigation);
  assert.equal(navigation.id, "primary");
  assert.equal(navigation.key, "primary");
  assert.equal(navigation.items[1]?.children?.[0]?.label, "Guides");
});

test("records dedicated navigation provenance", async () => {
  const navigation = await buildProvider().getNavigation("primary");

  assert.ok(navigation);
  assert.equal(navigation.meta.source, "git");
  assert.equal(navigation.meta.sourceId, "navigation/primary.json");
  assert.equal(typeof navigation.meta.updatedAt, "string");
});

test("returns null for missing dedicated navigation", async () => {
  assert.equal(await buildProvider().getNavigation("missing"), null);
});

test("throws a ProviderError for malformed navigation JSON", async () => {
  await assert.rejects(
    () => buildProvider().getNavigation("malformed"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.equal(error.content, "navigation/malformed.json");
      assert.match(error.reason ?? "", /JSON/i);
      return true;
    }
  );
});

test("throws a ProviderError when navigation JSON is not an object", async () => {
  await assert.rejects(
    () => buildProvider().getNavigation("array"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.operation, "normalize");
      assert.equal(error.content, "navigation/array.json");
      assert.match(error.reason ?? "", /object/i);
      return true;
    }
  );
});

test("loads settings from the dedicated settings directory", async () => {
  const settings = await buildProvider().getSettings("site");

  assert.ok(settings);
  assert.equal(settings.id, "site");
  assert.equal(settings.key, "site");
  assert.equal(settings.data.siteName, "NexusContent Example");
  assert.deepEqual(settings.data.theme, { color: "indigo" });
});

test("records dedicated settings provenance", async () => {
  const settings = await buildProvider().getSettings("site");

  assert.ok(settings);
  assert.equal(settings.meta.source, "git");
  assert.equal(settings.meta.sourceId, "settings/site.json");
  assert.equal(typeof settings.meta.updatedAt, "string");
});

test("returns null for missing dedicated settings", async () => {
  assert.equal(await buildProvider().getSettings("missing"), null);
});

test("throws a ProviderError for malformed settings JSON", async () => {
  await assert.rejects(
    () => buildProvider().getSettings("malformed"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.equal(error.content, "settings/malformed.json");
      assert.match(error.reason ?? "", /JSON/i);
      return true;
    }
  );
});

test("throws a ProviderError when settings JSON is not an object", async () => {
  await assert.rejects(
    () => buildProvider().getSettings("array"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.operation, "normalize");
      assert.equal(error.content, "settings/array.json");
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

test("rejects a singleton key that escapes the content root", async () => {
  await assert.rejects(
    () => buildProvider().getSingleton("../../secret"),
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

test("rejects a navigation key that escapes the content root", async () => {
  await assert.rejects(
    () => buildProvider().getNavigation("../../secret"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.match(error.message, /escapes the configured content root/);
      return true;
    }
  );
});

test("rejects a settings key that escapes the content root", async () => {
  await assert.rejects(
    () => buildProvider().getSettings("../../secret"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
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

test("rejects a page file symlink that escapes the content root", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "nexuscontent-symlink-page-"));
  const root = join(fixtureRoot, "content");
  const outside = join(fixtureRoot, "outside.json");

  try {
    await mkdir(join(root, "pages"), { recursive: true });
    await writeFile(outside, JSON.stringify({ title: "Outside" }), "utf8");
    await symlink(outside, join(root, "pages", "outside.json"));

    const provider = new GitProvider({ contentPath: root });
    await assert.rejects(
      () => provider.getPage("outside"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.equal(error.content, "pages/outside.json");
        assert.match(error.message, /escapes the configured content root/);
        return true;
      }
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("rejects a singleton file symlink that escapes the content root", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "nexuscontent-symlink-singleton-"));
  const root = join(fixtureRoot, "content");
  const outside = join(fixtureRoot, "outside.json");

  try {
    await mkdir(join(root, "singletons"), { recursive: true });
    await writeFile(outside, JSON.stringify({ siteName: "Outside" }), "utf8");
    await symlink(outside, join(root, "singletons", "outside.json"));

    const provider = new GitProvider({ contentPath: root });
    await assert.rejects(
      () => provider.getSingleton("outside"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.equal(error.content, "singletons/outside.json");
        assert.match(error.message, /escapes the configured content root/);
        return true;
      }
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("rejects a navigation file symlink that escapes the content root", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "nexuscontent-symlink-navigation-"));
  const root = join(fixtureRoot, "content");
  const outside = join(fixtureRoot, "outside.json");

  try {
    await mkdir(join(root, "navigation"), { recursive: true });
    await writeFile(outside, JSON.stringify({ items: [] }), "utf8");
    await symlink(outside, join(root, "navigation", "outside.json"));

    const provider = new GitProvider({ contentPath: root });
    await assert.rejects(
      () => provider.getNavigation("outside"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.equal(error.content, "navigation/outside.json");
        assert.match(error.message, /escapes the configured content root/);
        return true;
      }
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("rejects a settings file symlink that escapes the content root", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "nexuscontent-symlink-settings-"));
  const root = join(fixtureRoot, "content");
  const outside = join(fixtureRoot, "outside.json");

  try {
    await mkdir(join(root, "settings"), { recursive: true });
    await writeFile(outside, JSON.stringify({ siteName: "Outside" }), "utf8");
    await symlink(outside, join(root, "settings", "outside.json"));

    const provider = new GitProvider({ contentPath: root });
    await assert.rejects(
      () => provider.getSettings("outside"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.equal(error.content, "settings/outside.json");
        assert.match(error.message, /escapes the configured content root/);
        return true;
      }
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("rejects a collection directory symlink that escapes the content root", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "nexuscontent-symlink-collection-"));
  const root = join(fixtureRoot, "content");
  const outside = join(fixtureRoot, "outside-collection");

  try {
    await mkdir(join(root, "collections"), { recursive: true });
    await mkdir(outside);
    await writeFile(
      join(outside, "outside.json"),
      JSON.stringify({ title: "Outside" }),
      "utf8"
    );
    await symlink(outside, join(root, "collections", "outside"));

    const provider = new GitProvider({ contentPath: root });
    await assert.rejects(
      () => provider.getCollection("outside"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.equal(error.content, "collections/outside");
        assert.match(error.message, /escapes the configured content root/);
        return true;
      }
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
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
