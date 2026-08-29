import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  WordPressProvider,
  WordPressCompanionClient,
  ProviderError,
  deriveRestRoot,
  type WordPressProviderOptions
} from "../../src/index.ts";
import { normalizeCompanionPage, normalizeCompanionPageItem } from "../../src/providers/wordpress/companion-normalize.ts";

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
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

// ─── Strategy: core ────────────────────────────────────────────────

test("strategy core never requests companion endpoints", async () => {
  const paths: string[] = [];
  await withServer((request, response) => {
    paths.push(request.url ?? "");
    sendJson(response, [{ id: 1, slug: "home", status: "publish", title: { rendered: "Home" }, content: { rendered: "<p>Hi</p>" }, modified_gmt: "2026-08-01T00:00:00" }]);
  }, async (baseUrl) => {
    const page = await provider(baseUrl, { apiStrategy: "core" }).getPage("home");
    assert.equal(page?.title, "Home");
    assert.ok(paths.every((p) => !p.includes("nexuscontent")));
  });
});

// ─── Strategy: auto with companion available ───────────────────────

test("strategy auto uses companion when capabilities succeed", async () => {
  const capabilities = await readFixture("companion-capabilities.json");
  const page = await readFixture("companion-page.json");
  const paths: string[] = [];

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    paths.push(url.pathname);
    if (url.pathname.includes("nexuscontent/v1/capabilities")) {
      sendJson(response, capabilities);
    } else if (url.pathname.includes("nexuscontent/v1/pages")) {
      sendJson(response, page);
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    const result = await provider(baseUrl, { apiStrategy: "auto" }).getPage("home");
    assert.equal(result?.title, "Home");
    assert.ok(paths.some((p) => p.includes("nexuscontent/v1/capabilities")));
    assert.ok(paths.some((p) => p.includes("nexuscontent/v1/pages/slug/home")));
    assert.ok(!paths.some((p) => p.includes("/wp/v2/pages")));
  });
});

// ─── Strategy: auto falls back on discovery failure ────────────────

test("strategy auto falls back to core when companion discovery fails", async () => {
  const paths: string[] = [];

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    paths.push(url.pathname);
    if (url.pathname.includes("nexuscontent")) {
      sendJson(response, { code: "not_found" }, { status: 404 });
    } else {
      sendJson(response, [{ id: 1, slug: "home", status: "publish", title: { rendered: "Home" }, content: { rendered: "<p>Hi</p>" }, modified_gmt: "2026-08-01T00:00:00" }]);
    }
  }, async (baseUrl) => {
    const result = await provider(baseUrl, { apiStrategy: "auto" }).getPage("home");
    assert.equal(result?.title, "Home");
    assert.ok(paths.some((p) => p.includes("/wp/v2/pages")));
  });
});

// ─── Strategy: auto propagates non-404 errors from capabilities ─────

test("strategy auto propagates 401 from capabilities endpoint", async () => {
  await withServer((_request, response) => {
    sendJson(response, { code: "unauthorized" }, { status: 401 });
  }, async (baseUrl) => {
    await assert.rejects(
      () => provider(baseUrl, { apiStrategy: "auto" }).getPage("home"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.match(error.message ?? "", /HTTP 401/);
        return true;
      }
    );
  });
});

test("strategy auto propagates 403 from capabilities endpoint", async () => {
  await withServer((_request, response) => {
    sendJson(response, { code: "forbidden" }, { status: 403 });
  }, async (baseUrl) => {
    await assert.rejects(
      () => provider(baseUrl, { apiStrategy: "auto" }).getPage("home"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.match(error.message ?? "", /HTTP 403/);
        return true;
      }
    );
  });
});

test("strategy auto propagates 429 from capabilities endpoint", async () => {
  await withServer((_request, response) => {
    sendJson(response, { code: "rate_limited" }, { status: 429 });
  }, async (baseUrl) => {
    await assert.rejects(
      () => provider(baseUrl, { apiStrategy: "auto" }).getPage("home"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.match(error.message ?? "", /HTTP 429/);
        return true;
      }
    );
  });
});

test("strategy auto propagates 500 from capabilities endpoint", async () => {
  await withServer((_request, response) => {
    sendJson(response, { code: "server_error" }, { status: 500 });
  }, async (baseUrl) => {
    await assert.rejects(
      () => provider(baseUrl, { apiStrategy: "auto" }).getPage("home"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.match(error.message ?? "", /HTTP 500/);
        return true;
      }
    );
  });
});

test("strategy auto propagates network failure from capabilities endpoint", async () => {
  const server = createServer((_request, response) => {
    response.destroy();
  });
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
    await assert.rejects(
      () => provider(baseUrl, { apiStrategy: "auto" }).getPage("home"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.match(error.message ?? "", /request failed/i);
        return true;
      }
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("strategy auto propagates invalid JSON from capabilities endpoint", async () => {
  await withServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end("not json {{{");
  }, async (baseUrl) => {
    await assert.rejects(
      () => provider(baseUrl, { apiStrategy: "auto" }).getPage("home"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.match(error.message ?? "", /invalid json/i);
        return true;
      }
    );
  });
});

test("strategy auto propagates contract version mismatch", async () => {
  await withServer((_request, response) => {
    sendJson(response, {
      contractVersion: 99,
      data: {
        pluginVersion: "1.0.0",
        wordpressVersion: "6.6",
        gutenberg: true,
        acf: false,
        acfPro: false,
        acfBlocks: false,
        flexibleContent: false,
        editorModes: ["gutenberg"],
        sectionTypes: ["hero"]
      }
    });
  }, async (baseUrl) => {
    await assert.rejects(
      () => provider(baseUrl, { apiStrategy: "auto" }).getPage("home"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.match(error.reason ?? "", /contract version/i);
        return true;
      }
    );
  });
});

// ─── Strategy: companion when unavailable ──────────────────────────

test("strategy companion throws when plugin is not available", async () => {
  await withServer((_request, response) => {
    sendJson(response, { code: "not_found" }, { status: 404 });
  }, async (baseUrl) => {
    await assert.rejects(
      () => provider(baseUrl, { apiStrategy: "companion" }).getPage("home"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.match(error.reason ?? "", /not detected/i);
        return true;
      }
    );
  });
});

// ─── Strategy: companion with 404 page ────────────────────────────

test("strategy companion returns null for a missing page", async () => {
  const capabilities = await readFixture("companion-capabilities.json");

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    const result = await provider(baseUrl, { apiStrategy: "companion" }).getPage("missing");
    assert.equal(result, null);
  });
});

// ─── Strategy: companion collection ────────────────────────────────

test("strategy companion returns posts collection from the posts route", async () => {
  const capabilities = await readFixture("companion-capabilities.json");
  const posts = await readFixture("companion-posts.json");

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else if (url.pathname.includes("nexuscontent/v1/posts")) {
      sendJson(response, posts);
    }
  }, async (baseUrl) => {
    const result = await provider(baseUrl, { apiStrategy: "companion" }).getCollection("posts");
    assert.equal(result.length, 2);
    assert.equal(result[0]?.key, "hello-world");
    assert.equal(result[1]?.key, "second-post");
    // Companion posts normalize section wire media (`image.url`) to MediaAsset `src`.
    const hero = (result[0]?.data as { sections?: Array<{ data: { image: { src: string; id: string } } }> }).sections?.[0];
    assert.equal(hero?.data.image.src, "https://example.test/hello.jpg");
    assert.equal(hero?.data.image.id, "9");
    assert.equal(result[0]?.data.excerpt, "The first post.");
  });
});

test("strategy companion maps an explicit pages companionRoute to the pages route", async () => {
  const capabilities = await readFixture("companion-capabilities.json");
  const pages = await readFixture("companion-pages.json");
  const paths: string[] = [];

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    paths.push(url.pathname);
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else if (url.pathname.includes("nexuscontent/v1/pages")) {
      sendJson(response, pages);
    }
  }, async (baseUrl) => {
    const result = await provider(baseUrl, {
      apiStrategy: "companion",
      collections: { info: { endpoint: "pages", companionRoute: "pages" } }
    }).getCollection("info");
    assert.equal(result.length, 2);
    assert.equal(result[0]?.key, "home");
    assert.ok(paths.some((p) => p.includes("nexuscontent/v1/pages")));
  });
});

test("strategy companion throws for a custom collection without a companion route", async () => {
  const capabilities = await readFixture("companion-capabilities.json");

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    await assert.rejects(
      () => provider(baseUrl, {
        apiStrategy: "companion",
        collections: { projects: { endpoint: "projects" } }
      }).getCollection("projects"),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.match(error.reason ?? "", /companionRoute/);
        return true;
      }
    );
  });
});

test("strategy auto falls back to core REST for a custom collection without a companion route", async () => {
  const capabilities = await readFixture("companion-capabilities.json");
  const paths: string[] = [];

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    paths.push(url.pathname);
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else if (url.pathname.includes("wp/v2/projects")) {
      sendJson(response, [
        { id: 7, slug: "project-one", status: "publish", title: { rendered: "Project One" }, content: { rendered: "" }, modified_gmt: "2026-08-01T00:00:00", _embedded: { "wp:featuredmedia": [] } }
      ], { headers: { "X-WP-Total": "1", "X-WP-TotalPages": "1" } });
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    const wp = provider(baseUrl, {
      apiStrategy: "auto",
      collections: { projects: { endpoint: "projects" } }
    });
    const result = await wp.getCollection("projects");
    assert.equal(result.length, 1);
    assert.equal(result[0]?.key, "project-one");
    assert.ok(paths.some((p) => p.includes("wp/v2/projects")));
    assert.ok(!paths.some((p) => p.includes("nexuscontent/v1/posts")));
    assert.ok(!paths.some((p) => p.includes("nexuscontent/v1/pages")));
  });
});

// ─── Companion normalization ───────────────────────────────────────

test("normalizeCompanionPage maps companion data to PageContent", () => {
  const input = {
    id: "42",
    key: "about",
    slug: "about-us",
    title: "About Us",
    status: "published" as const,
    excerpt: "Learn about us",
    modifiedAt: "2026-08-10T12:00:00Z",
    sections: [{ id: "hero-1", type: "hero", data: { heading: "Hi" } }],
    rawFields: { custom: "value" }
  };

  const result = normalizeCompanionPage(input, "about");
  assert.equal(result.id, "42");
  assert.equal(result.key, "about");
  assert.equal(result.slug, "about-us");
  assert.equal(result.title, "About Us");
  assert.equal(result.status, "published");
  assert.equal(result.excerpt, "Learn about us");
  assert.equal(result.modifiedAt, "2026-08-10T12:00:00Z");
  assert.equal(result.sections?.length, 1);
  assert.equal(result.sections?.[0]?.type, "hero");
  assert.deepEqual(result.data, { custom: "value" });
  assert.deepEqual(result.meta, { source: "wordpress", sourceId: "42" });
});

test("normalizeCompanionPageItem maps companion data to CollectionItem", () => {
  const input = {
    id: "5",
    key: "services",
    slug: "services",
    title: "Services",
    sections: [
      { id: "intro-1", type: "intro", data: { heading: "What we do" } },
      { id: "cta-1", type: "cta", settings: { align: "center" }, data: { heading: "Get started" } }
    ],
    rawFields: { custom: "value" }
  };

  const result = normalizeCompanionPageItem(input);
  assert.equal(result.id, "5");
  assert.equal(result.key, "services");
  assert.equal(result.slug, "services");
  assert.equal(result.title, "Services");
  const sections = result.data.sections as Array<{
    type: string;
    data: Record<string, unknown>;
    settings?: Record<string, unknown>;
  }>;
  assert.equal(sections.length, 2);
  assert.equal(sections[0]?.type, "intro");
  assert.equal(sections[0]?.data.heading, "What we do");
  assert.equal(sections[1]?.type, "cta");
  assert.deepEqual(sections[1]?.settings, { align: "center" });
  assert.equal(result.data.custom, "value");
  assert.deepEqual(result.meta, { source: "wordpress", sourceId: "5" });
});

test("normalizeCompanionPageItem keeps an empty sections array for raw-HTML fallback", () => {
  const result = normalizeCompanionPageItem({
    id: "9",
    key: "legacy",
    slug: "legacy",
    title: "Legacy",
    sections: [],
    rawFields: { content: "<p>Plain HTML post.</p>" }
  });

  assert.deepEqual(result.data, {
    content: "<p>Plain HTML post.</p>",
    sections: []
  });
});

test("normalizeCompanionPageItem surfaces featuredImage and excerpt and converts nested section media", () => {
  const result = normalizeCompanionPageItem({
    id: "5",
    key: "post-one",
    slug: "post-one",
    title: "Post One",
    excerpt: "The excerpt",
    featuredImage: { id: "7", url: "https://example.test/featured.jpg", alt: "Featured", width: 640, height: 480 },
    sections: [
      {
        id: "hero-1",
        type: "hero",
        data: {
          heading: "Hi",
          image: { url: "https://example.test/hero.jpg", id: "8", mimeType: "image/jpeg", width: 1200, height: 800 },
          gallery: [{ url: "https://example.test/one.jpg", id: "9" }],
          link: { url: "https://example.test/not-media", label: "CTA" }
        }
      }
    ],
    rawFields: { publishedAt: "2026-08-01T10:00:00Z" }
  });

  const data = result.data as Record<string, unknown>;
  const featured = data.featuredImage as { src: string; id?: string; alt?: string };
  assert.equal(featured.src, "https://example.test/featured.jpg");
  assert.equal(featured.id, "7");
  assert.equal(featured.alt, "Featured");
  assert.equal(data.excerpt, "The excerpt");
  assert.deepEqual(data.publishedAt, "2026-08-01T10:00:00Z");

  const hero = (data as { sections: Array<{ data: Record<string, unknown> }> }).sections[0]?.data;
  assert.ok(hero);
  assert.deepEqual(hero.image, { id: "8", src: "https://example.test/hero.jpg", mimeType: "image/jpeg", width: 1200, height: 800 });
  assert.deepEqual(hero.gallery, [{ id: "9", src: "https://example.test/one.jpg" }]);
  // A plain object carrying only a `url` (a link, not media) is untouched.
  assert.deepEqual(hero.link, { url: "https://example.test/not-media", label: "CTA" });
});

// ─── URL derivation ────────────────────────────────────────────────

test("deriveRestRoot extracts WordPress REST root from baseUrl", () => {
  // Valid cases
  const root1 = new WordPressProvider({
    baseUrl: "https://example.com/wp-json/wp/v2",
    apiStrategy: "companion"
  });
  assert.equal(root1.name, "wordpress");

  const root2 = new WordPressProvider({
    baseUrl: "https://example.com/subdir/wp-json/wp/v2",
    apiStrategy: "companion"
  });
  assert.equal(root2.name, "wordpress");
});

test("deriveRestRoot throws when baseUrl lacks /wp-json/", () => {
  assert.throws(
    () => new WordPressProvider({
      baseUrl: "https://example.com/api/v2",
      apiStrategy: "auto"
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match(error.reason ?? "", /wp-json/);
      return true;
    }
  );
});

// ─── Config validation ────────────────────────────────────────────

test("rejects old strategy values", () => {
  assert.throws(
    () => provider("https://example.com/wp-json/wp/v2", { apiStrategy: "rest-v2" as any }),
    /Invalid WordPress provider configuration/
  );
});

test("rejects old content policy values", () => {
  assert.throws(
    () => provider("https://example.com/wp-json/wp/v2", { unknownContentPolicy: "throw" as any }),
    /Invalid WordPress provider configuration/
  );
});

test("rejects old media resolution values", () => {
  assert.throws(
    () => provider("https://example.com/wp-json/wp/v2", { mediaResolution: "embed" as any }),
    /Invalid WordPress provider configuration/
  );
});

test("rejects an invalid companionRoute value", () => {
  assert.throws(
    () => provider("https://example.com/wp-json/wp/v2", {
      collections: { info: { endpoint: "pages", companionRoute: "files" as any } }
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match(error.reason ?? "", /companionRoute/);
      return true;
    }
  );
});

// ─── Discovery caching ────────────────────────────────────────────

test("companion discovery caches result across multiple calls", async () => {
  let capabilitiesRequests = 0;
  const capabilities = await readFixture("companion-capabilities.json");

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      capabilitiesRequests += 1;
      sendJson(response, capabilities);
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    const wp = provider(baseUrl, { apiStrategy: "auto" });
    // Multiple calls should reuse the cached discovery
    await wp.getPage("a");
    await wp.getPage("b");
    await wp.getPage("c");
    // Discovery should only have been called once (cached)
    assert.equal(capabilitiesRequests, 1);
  });
});

// ─── Companion client: getItem ──────────────────────────────────────

test("companion getItem returns item by slug", async () => {
  const capabilities = await readFixture("companion-capabilities.json");
  const page = await readFixture("companion-page.json");

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else {
      sendJson(response, page);
    }
  }, async (baseUrl) => {
    const result = await provider(baseUrl, { apiStrategy: "companion" }).getItem("posts", "home");
    assert.ok(result !== null);
    assert.equal(result?.key, "home");
  });
});

test("companion getItem returns null for missing item", async () => {
  const capabilities = await readFixture("companion-capabilities.json");

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    const result = await provider(baseUrl, { apiStrategy: "companion" }).getItem("posts", "missing");
    assert.equal(result, null);
  });
});

// ─── Companion client: schema ───────────────────────────────────────

test("companion schema retrieval succeeds", async () => {
  const capabilities = await readFixture("companion-capabilities.json");
  const schema = await readFixture("companion-schema.json");

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else if (url.pathname.includes("schema")) {
      sendJson(response, schema);
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    const root = deriveRestRoot(new URL(`${baseUrl}/wp/v2`), "test");
    const client = new WordPressCompanionClient({
      restRoot: root,
      headers: {},
      providerName: "test",
      timeoutMs: 5000
    });

    const available = await client.isAvailable();
    assert.equal(available, true);

    const result = await client.getSchema({ provider: "test", operation: "getSchema", content: "schema" });
    assert.ok(result.editorModes.length > 0);
    assert.ok(result.sectionDefinitions.length > 0);
  });
});

// ─── Contract version negotiation ──────────────────────────────────

test("companion stores negotiated contract version", async () => {
  const capabilities = await readFixture("companion-capabilities.json");

  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.includes("capabilities")) {
      sendJson(response, capabilities);
    } else {
      sendJson(response, { code: "not_found" }, { status: 404 });
    }
  }, async (baseUrl) => {
    const root = deriveRestRoot(new URL(`${baseUrl}/wp/v2`), "test");
    const client = new WordPressCompanionClient({
      restRoot: root,
      headers: {},
      providerName: "test",
      timeoutMs: 5000
    });

    await client.isAvailable();
    const version = client.getNegotiatedVersion();
    assert.equal(version, 1);
  });
});

// ─── Config: new options ───────────────────────────────────────────

test("accepts defaultEditorMode option", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    defaultEditorMode: "acf_flexible"
  });
  assert.equal(wp.defaultEditorMode, "acf_flexible");
});

test("accepts editorModeField option", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    editorModeField: "custom_mode"
  });
  assert.equal(wp.editorModeField, "custom_mode");
});

test("accepts sectionBlockNamespaces option", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    sectionBlockNamespaces: ["my-plugin", "custom"]
  });
  assert.deepEqual(wp.sectionBlockNamespaces, ["my-plugin", "custom"]);
});

test("accepts includeCoreBlocks option", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    includeCoreBlocks: true
  });
  assert.equal(wp.includeCoreBlocks, true);
});

test("defaults for new config options", () => {
  const wp = provider("https://example.com/wp-json/wp/v2");
  assert.equal(wp.defaultEditorMode, undefined);
  assert.equal(wp.editorModeField, undefined);
  assert.deepEqual(wp.sectionBlockNamespaces, []);
  assert.equal(wp.includeCoreBlocks, false);
});

// ─── Editor mode resolution ─────────────────────────────────────────

test("resolveEditorMode uses page-level field when editorModeField is set", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    editorModeField: "custom_mode"
  });
  const mode = wp.resolveEditorMode({ custom_mode: "acf_flexible" });
  assert.equal(mode, "acf_flexible");
});

test("resolveEditorMode falls back to defaultEditorMode when page field is missing", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    editorModeField: "custom_mode",
    defaultEditorMode: "acf_fixed"
  });
  const mode = wp.resolveEditorMode({});
  assert.equal(mode, "acf_fixed");
});

test("resolveEditorMode falls back to editorMode when no page field or default", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    editorMode: "acf_fixed"
  });
  const mode = wp.resolveEditorMode({});
  assert.equal(mode, "acf_fixed");
});

test("resolveEditorMode defaults to gutenberg", () => {
  const wp = provider("https://example.com/wp-json/wp/v2");
  const mode = wp.resolveEditorMode({});
  assert.equal(mode, "gutenberg");
});

test("resolveEditorMode ignores invalid page-level mode values", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    editorModeField: "custom_mode",
    defaultEditorMode: "acf_fixed"
  });
  const mode = wp.resolveEditorMode({ custom_mode: "invalid_mode" });
  assert.equal(mode, "acf_fixed");
});

// ─── Editor mode predicates ─────────────────────────────────────────

test("shouldParseGutenberg returns true only for gutenberg mode", () => {
  const wp = provider("https://example.com/wp-json/wp/v2");
  assert.equal(wp.shouldParseGutenberg("gutenberg"), true);
  assert.equal(wp.shouldParseGutenberg("acf_flexible"), false);
  assert.equal(wp.shouldParseGutenberg("acf_fixed"), false);
});

test("shouldParseAcfFlexible returns true only for acf_flexible mode", () => {
  const wp = provider("https://example.com/wp-json/wp/v2");
  assert.equal(wp.shouldParseAcfFlexible("acf_flexible"), true);
  assert.equal(wp.shouldParseAcfFlexible("gutenberg"), false);
  assert.equal(wp.shouldParseAcfFlexible("acf_fixed"), false);
});

test("shouldParseAcfFixed returns true only for acf_fixed mode", () => {
  const wp = provider("https://example.com/wp-json/wp/v2");
  assert.equal(wp.shouldParseAcfFixed("acf_fixed"), true);
  assert.equal(wp.shouldParseAcfFixed("gutenberg"), false);
  assert.equal(wp.shouldParseAcfFixed("acf_flexible"), false);
});

// ─── Unknown content policy ─────────────────────────────────────────

test("applyUnknownContentPolicy returns throw for error policy", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    unknownContentPolicy: "error"
  });
  assert.equal(wp.applyUnknownContentPolicy("unknown_block"), "throw");
});

test("applyUnknownContentPolicy returns skip for ignore policy", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    unknownContentPolicy: "ignore"
  });
  assert.equal(wp.applyUnknownContentPolicy("unknown_block"), "skip");
});

test("applyUnknownContentPolicy returns raw for html policy", () => {
  const wp = provider("https://example.com/wp-json/wp/v2", {
    unknownContentPolicy: "html"
  });
  assert.equal(wp.applyUnknownContentPolicy("unknown_block"), "raw");
});
