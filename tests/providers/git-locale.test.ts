import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
  GitProvider,
  MissingLocaleVariantError,
  ProviderError
} from "../../src/index.ts";

const contentPath = fileURLToPath(
  new URL("./fixtures/content-locale", import.meta.url)
);

function buildProvider(name = "git") {
  return new GitProvider({ contentPath, name });
}

test("loads a page variant from the requested locale directory", async () => {
  const page = await buildProvider().getPage("home", {
    locale: "en-ZA",
    fallbackLocales: ["en-ZA"]
  });

  assert.ok(page);
  assert.equal(page.title, "Home (en-ZA)");
  assert.equal((page.data.intro as string), "English variant");
});

test("records provenance for locale variant pages", async () => {
  const page = await buildProvider().getPage("home", {
    locale: "en-ZA",
    fallbackLocales: ["en-ZA"]
  });

  assert.ok(page);
  assert.equal(page.meta.source, "git");
  assert.equal(page.meta.locale, "en-ZA");
  assert.equal(page.meta.sourceId, "pages/en-ZA/home.json");
  assert.equal(typeof page.meta.updatedAt, "string");
});

test("selects a different locale variant when requested", async () => {
  const page = await buildProvider().getPage("home", {
    locale: "zu-ZA",
    fallbackLocales: ["zu-ZA"]
  });

  assert.ok(page);
  assert.equal(page.title, "Home (zu-ZA)");
  assert.equal(page.meta.locale, "zu-ZA");
  assert.equal(page.meta.sourceId, "pages/zu-ZA/home.json");
});

test("falls back through the fallback chain when a variant is missing", async () => {
  const page = await buildProvider().getPage("about", {
    locale: "zu-ZA",
    fallbackLocales: ["zu-ZA", "en-ZA"]
  });

  assert.ok(page);
  assert.equal(page.title, "About (en-ZA)");
  assert.equal(page.meta.locale, "en-ZA");
  assert.equal(page.meta.sourceId, "pages/en-ZA/about.json");
});

test("falls back to the legacy flat file when no variant exists", async () => {
  const page = await buildProvider().getPage("about", {
    locale: "zu-ZA",
    fallbackLocales: ["zu-ZA"]
  });

  assert.ok(page);
  assert.equal(page.title, "About (flat)");
  assert.equal(page.meta.locale, undefined);
  assert.equal(page.meta.sourceId, "pages/about.json");
});

test("throws a ProviderError for malformed JSON inside a locale directory", async () => {
  await assert.rejects(
    () =>
      buildProvider().getPage("malformed", {
        locale: "en-ZA",
        fallbackLocales: ["en-ZA"]
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.equal(error.content, "pages/en-ZA/malformed.json");
      assert.match(error.reason ?? "", /JSON/i);
      return true;
    }
  );
});

test("throws a MissingLocaleVariantError in strict mode even when flat fallback exists", async () => {
  await assert.rejects(
    () =>
      buildProvider().getPage("about", {
        locale: "zu-ZA",
        fallbackLocales: ["zu-ZA"],
        strict: true
      }),
    (error: unknown) => {
      assert.ok(error instanceof MissingLocaleVariantError);
      assert.equal(error.provider, "git");
      assert.equal(error.locale, "zu-ZA");
      assert.equal(error.content, "about");
      assert.deepEqual(error.chain, ["zu-ZA"]);
      assert.match(error.message, /missing/i);
      return true;
    }
  );
});

test("throws a MissingLocaleVariantError in strict mode when no content exists", async () => {
  await assert.rejects(
    () =>
      buildProvider().getPage("nope", {
        locale: "zu-ZA",
        fallbackLocales: ["zu-ZA"],
        strict: true
      }),
    (error: unknown) => {
      assert.ok(error instanceof MissingLocaleVariantError);
      assert.equal(error.locale, "zu-ZA");
      return true;
    }
  );
});

test("loads navigation variants", async () => {
  const navigation = await buildProvider().getNavigation("primary", {
    locale: "zu-ZA",
    fallbackLocales: ["zu-ZA"]
  });

  assert.ok(navigation);
  assert.equal(navigation.items[0]?.label, "Ikhaya");
  assert.equal(navigation.meta.locale, "zu-ZA");
});

test("loads settings variants", async () => {
  const settings = await buildProvider().getSettings("site", {
    locale: "en-ZA",
    fallbackLocales: ["en-ZA"]
  });

  assert.ok(settings);
  assert.equal(settings.data.siteName, "NexusContent (en-ZA)");
  assert.equal(settings.meta.locale, "en-ZA");
});

test("loads collection variants as a whole collection", async () => {
  const items = await buildProvider().getCollection("posts", {
    locale: "en-ZA",
    fallbackLocales: ["en-ZA"]
  });

  assert.equal(items.length, 2);
  assert.deepEqual(
    items.map((item) => item.key),
    ["one", "two"]
  );
  assert.equal(items[0]?.title, "One (en-ZA)");
  assert.equal(items[0]?.meta.locale, "en-ZA");
  assert.equal(items[0]?.meta.sourceId, "collections/posts/en-ZA/one.json");
});

test("uses the first existing variant directory for collections", async () => {
  const items = await buildProvider().getCollection("posts", {
    locale: "zu-ZA",
    fallbackLocales: ["zu-ZA", "en-ZA"]
  });

  assert.deepEqual(
    items.map((item) => item.key),
    ["one"]
  );
  assert.equal(items[0]?.meta.locale, "zu-ZA");
  assert.equal(items[0]?.title, "One (zu-ZA)");
});

test("throws a MissingLocaleVariantError for a missing collection variant in strict mode", async () => {
  await assert.rejects(
    () =>
      buildProvider().getCollection("posts", {
        locale: "af",
        fallbackLocales: ["af"],
        strict: true
      }),
    (error: unknown) => {
      assert.ok(error instanceof MissingLocaleVariantError);
      assert.equal(error.locale, "af");
      assert.equal(error.content, "posts");
      return true;
    }
  );
});

test("loads collection item variants with fallback", async () => {
  const item = await buildProvider().getItem("posts", "two", {
    locale: "zu-ZA",
    fallbackLocales: ["zu-ZA", "en-ZA"]
  });

  assert.ok(item);
  assert.equal(item.title, "Two (en-ZA)");
  assert.equal(item.meta.locale, "en-ZA");
  assert.equal(item.meta.sourceId, "collections/posts/en-ZA/two.json");
});

test("returns null for a missing item variant in non-strict mode", async () => {
  const item = await buildProvider().getItem("posts", "missing", {
    locale: "en-ZA",
    fallbackLocales: ["en-ZA"]
  });

  assert.equal(item, null);
});

test("rejects a malicious locale segment", async () => {
  await assert.rejects(
    () =>
      buildProvider().getPage("home", {
        locale: "../../../secret",
        fallbackLocales: ["../../../secret"]
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match(error.message, /Invalid locale/);
      return true;
    }
  );
});

test("rejects a malicious locale in the fallback chain", async () => {
  await assert.rejects(
    () =>
      buildProvider().getPage("home", {
        locale: "en-ZA",
        fallbackLocales: ["../../etc"]
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match(error.message, /Invalid locale/);
      return true;
    }
  );
});

test("legacy flat retrieval remains available without locale options", async () => {
  const page = await buildProvider().getPage("about");

  assert.ok(page);
  assert.equal(page.title, "About (flat)");
  assert.equal(page.meta.locale, undefined);
});
