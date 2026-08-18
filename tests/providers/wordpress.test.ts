import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  NexusContent,
  ProviderError,
  WordPressProvider,
  type WordPressContentData,
  type WordPressProviderOptions
} from "../../src/index.ts";

type Handler = (request: IncomingMessage, response: ServerResponse) => void;

const fixtureDirectory = new URL("./fixtures/wordpress/", import.meta.url);
const richPage = await readFixture("page.json") as Record<string, unknown>;
const posts = await readFixture("posts.json") as Record<string, unknown>[];

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

async function withServer<T>(handler: Handler, run: (baseUrl: string) => Promise<T>): Promise<T> {
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

function provider(baseUrl: string, options: Partial<WordPressProviderOptions> = {}): WordPressProvider {
  return new WordPressProvider({ baseUrl, ...options });
}

function entry(id: number, slug = `post-${id}`): Record<string, unknown> {
  return {
    id,
    slug,
    status: "publish",
    title: { rendered: `Post ${id}` },
    content: { rendered: `<p>Body ${id}</p>` },
    modified_gmt: "2026-08-05T12:00:00"
  };
}

async function expectProviderError(
  action: () => Promise<unknown>,
  pattern: RegExp,
  check?: (error: ProviderError) => void
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.match(`${error.message}\n${error.reason ?? ""}`, pattern);
    check?.(error);
    return true;
  });
}

test("accepts a valid base URL and validates constructor options", async (t) => {
  assert.equal(provider("https://example.test/wp-json/wp/v2").name, "wordpress");

  const invalid: Array<[string, WordPressProviderOptions, RegExp]> = [
    ["missing base URL", {} as WordPressProviderOptions, /baseUrl is required/],
    ["empty base URL", { baseUrl: "" }, /baseUrl is required/],
    ["invalid URL", { baseUrl: "wordpress" }, /valid absolute URL/],
    ["unsupported protocol", { baseUrl: "ftp://example.test" }, /http or https/],
    ["URL credentials", { baseUrl: "https://user:secret@example.test" }, /credentials/],
    ["URL query", { baseUrl: "https://example.test?secret=yes" }, /query or hash/],
    ["URL hash", { baseUrl: "https://example.test#fragment" }, /query or hash/],
    ["perPage zero", { baseUrl: "https://example.test", perPage: 0 }, /perPage.*1 to 100/],
    ["perPage over 100", { baseUrl: "https://example.test", perPage: 101 }, /perPage.*1 to 100/],
    ["perPage fraction", { baseUrl: "https://example.test", perPage: 1.5 }, /perPage.*1 to 100/],
    ["maxPages zero", { baseUrl: "https://example.test", maxPages: 0 }, /maxPages.*positive integer/],
    ["maxPages fraction", { baseUrl: "https://example.test", maxPages: 1.5 }, /maxPages.*positive integer/],
    ["timeout zero", { baseUrl: "https://example.test", timeoutMs: 0 }, /timeoutMs.*positive integer/],
    ["empty CPT endpoint", { baseUrl: "https://example.test", collections: { books: { endpoint: "" } } }, /requires an endpoint/],
    ["absolute CPT endpoint", { baseUrl: "https://example.test", collections: { books: { endpoint: "/books" } } }, /invalid endpoint path/],
    ["traversing CPT endpoint", { baseUrl: "https://example.test", collections: { books: { endpoint: "../books" } } }, /invalid endpoint path/],
    ["query CPT endpoint", { baseUrl: "https://example.test", collections: { books: { endpoint: "books?draft=1" } } }, /invalid endpoint path/]
  ];

  for (const [name, options, pattern] of invalid) {
    await t.test(name, () => {
      assert.throws(() => new WordPressProvider(options), (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.equal(error.operation, "constructor");
        assert.match(error.reason ?? "", pattern);
        return true;
      });
    });
  }
});

test("supports custom names and multiple independent instances", () => {
  const primary = provider("https://primary.example.test", { name: "primaryWordPress" });
  const news = provider("https://news.example.test", { name: "newsWordPress" });
  assert.equal(primary.name, "primaryWordPress");
  assert.equal(news.name, "newsWordPress");
  assert.notEqual(primary, news);
});

test("sends custom headers without exposing Authorization in HTTP errors", async () => {
  const secret = "Bearer local-test-secret";
  let receivedAuthorization: string | undefined;
  let receivedSite: string | undefined;

  await withServer((request, response) => {
    receivedAuthorization = request.headers.authorization;
    receivedSite = request.headers["x-site"] as string | undefined;
    sendJson(response, { code: "rest_forbidden" }, { status: 401 });
  }, async (baseUrl) => {
    const wordpress = provider(baseUrl, {
      headers: { Authorization: secret, "X-Site": "marketing" }
    });
    await expectProviderError(() => wordpress.getPage("private"), /HTTP 401/, (error) => {
      assert.equal(error.provider, "wordpress");
      assert.equal(error.operation, "getPage");
      assert.doesNotMatch(error.format(), /local-test-secret|Authorization/i);
    });
  });

  assert.equal(receivedAuthorization, secret);
  assert.equal(receivedSite, "marketing");
});

test("does not expose Authorization in network errors", async () => {
  const secret = "Bearer network-secret";
  let closedBaseUrl = "";
  await withServer((_request, response) => sendJson(response, []), async (baseUrl) => {
    closedBaseUrl = baseUrl;
  });

  const wordpress = provider(closedBaseUrl, { headers: { Authorization: secret } });
  await expectProviderError(() => wordpress.getPage("offline"), /Network error/, (error) => {
    assert.doesNotMatch(error.format(), /network-secret|Authorization/i);
  });
});

test("looks up and fully normalizes a page while preserving rendered values", async () => {
  const key = "About team/é?";
  let requestedUrl = "";

  await withServer((request, response) => {
    requestedUrl = request.url ?? "";
    sendJson(response, [richPage]);
  }, async (baseUrl) => {
    const page = await provider(baseUrl).getPage<WordPressContentData>(key);
    assert.ok(page);
    assert.equal(page.id, "42");
    assert.equal(page.key, key);
    assert.equal(page.slug, "about-us");
    assert.equal(page.title, "Fish &amp; Chips &#8212; News");
    assert.equal(page.data.content, "<p>Rendered <strong>page</strong> content.</p>");
    assert.equal(page.data.excerpt, "<p>Rendered excerpt.</p>");
    assert.equal(page.data.publishedAt, "2026-08-01T09:30:00Z");
    assert.equal(page.data.modifiedAt, "2026-08-02T10:45:00+02:00");
    assert.equal(page.data.url, "https://wordpress.example/about-us/");
    assert.equal(page.data.authorId, 7);
    assert.equal(page.data.featuredMediaId, 99);
    assert.deepEqual(page.data.categories, [3, 5]);
    assert.deepEqual(page.data.tags, [8, 13]);
    assert.deepEqual(page.data.fields, { eyebrow: "About NexusContent", featured: true });
    assert.deepEqual(page.data.featuredImage, {
      id: "99",
      url: "https://wordpress.example/media/about.jpg",
      alt: "The NexusContent team",
      width: 1600,
      height: 900
    });
    assert.deepEqual(page.meta, {
      source: "wordpress",
      sourceId: "42",
      updatedAt: "2026-08-02T10:45:00+02:00"
    });
  });

  const url = new URL(requestedUrl, "http://local.test");
  assert.equal(url.pathname, "/wp-json/wp/v2/pages");
  assert.equal(url.searchParams.get("slug"), key);
  assert.equal(url.searchParams.get("per_page"), "1");
  assert.equal(url.searchParams.get("_embed"), "wp:featuredmedia");
  assert.equal(url.searchParams.get("status"), "publish");
  assert.match(requestedUrl, /slug=About\+team%2F%C3%A9%3F/);
});

test("returns null for a missing page and rejects malformed lookup shapes", async (t) => {
  await t.test("empty lookup", async () => {
    await withServer((_request, response) => sendJson(response, []), async (baseUrl) => {
      assert.equal(await provider(baseUrl).getPage("missing"), null);
    });
  });
  await t.test("non-array lookup", async () => {
    await withServer((_request, response) => sendJson(response, { id: 1 }), async (baseUrl) => {
      await expectProviderError(() => provider(baseUrl).getPage("bad"), /invalid lookup payload/);
    });
  });
  await t.test("ambiguous lookup", async () => {
    await withServer((_request, response) => sendJson(response, [entry(1), entry(2)]), async (baseUrl) => {
      await expectProviderError(() => provider(baseUrl).getPage("duplicate"), /ambiguous slug lookup/);
    });
  });
});

test("omits featuredImage when embedded media is missing", async () => {
  const withoutMedia = { ...richPage };
  delete withoutMedia._embedded;
  await withServer((_request, response) => sendJson(response, [withoutMedia]), async (baseUrl) => {
    const page = await provider(baseUrl).getPage<WordPressContentData>("about-us");
    assert.ok(page);
    assert.equal(page.data.featuredMediaId, 99);
    assert.equal(page.data.featuredImage, undefined);
  });
});

test("retrieves posts as a single-page collection and by item slug", async () => {
  const requests: string[] = [];
  await withServer((request, response) => {
    requests.push(request.url ?? "");
    const url = new URL(request.url ?? "/", "http://local.test");
    const slug = url.searchParams.get("slug");
    if (slug !== null) {
      sendJson(response, posts.filter((post) => post.slug === slug));
      return;
    }
    sendJson(response, posts, { headers: { "X-WP-Total": "2", "X-WP-TotalPages": "1" } });
  }, async (baseUrl) => {
    const wordpress = provider(baseUrl, { perPage: 2 });
    const collection = await wordpress.getCollection<WordPressContentData>("posts");
    assert.deepEqual(collection.map((item) => item.key), ["first-post", "second-post"]);
    assert.equal(collection[0]?.data.excerpt, "<p>First excerpt.</p>");
    const item = await wordpress.getItem<WordPressContentData>("posts", "second-post");
    assert.ok(item);
    assert.equal(item.id, "102");
    assert.equal(item.key, "second-post");
    assert.equal(item.data.content, "<p>Second body.</p>");
  });
  assert.match(requests[0] ?? "", /\/posts\?per_page=2&page=1&_embed=wp%3Afeaturedmedia&status=publish/);
  assert.match(requests[1] ?? "", /slug=second-post&per_page=1&_embed=wp%3Afeaturedmedia&status=publish/);
});

test("supports configured CPT collections and rejects unknown collections", async () => {
  const paths: string[] = [];
  await withServer((request, response) => {
    paths.push(request.url ?? "");
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.searchParams.has("slug")) sendJson(response, [entry(301, "the-book")]);
    else sendJson(response, [entry(301, "the-book")], { headers: { "X-WP-Total": "1", "X-WP-TotalPages": "1" } });
  }, async (baseUrl) => {
    const wordpress = provider(baseUrl, {
      perPage: 1,
      collections: { books: { endpoint: "library/books" } }
    });
    assert.equal((await wordpress.getCollection("books"))[0]?.key, "the-book");
    assert.equal((await wordpress.getItem("books", "the-book"))?.id, "301");
    await expectProviderError(() => wordpress.getCollection("events"), /Unknown WordPress collection/, (error) => {
      assert.equal(error.content, "events");
    });
  });
  assert.ok(paths.every((path) => path.startsWith("/wp-json/wp/v2/library/books?")));
});

test("loads multiple collection pages sequentially in request order", async () => {
  const all = [entry(1), entry(2), entry(3), entry(4), entry(5)];
  const requestedPages: number[] = [];
  let activeRequests = 0;
  let maximumActiveRequests = 0;
  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    const page = Number(url.searchParams.get("page"));
    requestedPages.push(page);
    activeRequests += 1;
    maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
    setTimeout(() => {
      activeRequests -= 1;
      sendJson(response, all.slice((page - 1) * 2, page * 2), {
        headers: { "X-WP-Total": "5", "X-WP-TotalPages": "3" }
      });
    }, 5);
  }, async (baseUrl) => {
    const collection = await provider(baseUrl, { perPage: 2 }).getCollection("posts");
    assert.deepEqual(collection.map((item) => item.id), ["1", "2", "3", "4", "5"]);
  });
  assert.deepEqual(requestedPages, [1, 2, 3]);
  assert.equal(maximumActiveRequests, 1);
});

test("accepts an empty collection with zero pagination headers", async () => {
  await withServer((_request, response) => {
    sendJson(response, [], { headers: { "X-WP-Total": "0", "X-WP-TotalPages": "0" } });
  }, async (baseUrl) => {
    assert.deepEqual(await provider(baseUrl).getCollection("posts"), []);
  });
});

test("throws when total pages exceed maxPages instead of truncating", async () => {
  let requests = 0;
  await withServer((_request, response) => {
    requests += 1;
    sendJson(response, [entry(1)], { headers: { "X-WP-Total": "3", "X-WP-TotalPages": "3" } });
  }, async (baseUrl) => {
    await expectProviderError(
      () => provider(baseUrl, { perPage: 1, maxPages: 2 }).getCollection("posts"),
      /exceeds the configured page limit/
    );
  });
  assert.equal(requests, 1);
});

test("rejects invalid collection pagination and later-page failures", async (t) => {
  const cases: Array<{
    name: string;
    pattern: RegExp;
    handler: Handler;
  }> = [
    {
      name: "missing pagination headers",
      pattern: /invalid pagination headers/,
      handler: (_request, response) => sendJson(response, [])
    },
    {
      name: "malformed pagination headers",
      pattern: /invalid pagination headers/,
      handler: (_request, response) => sendJson(response, [], { headers: { "X-WP-Total": "two", "X-WP-TotalPages": "1.5" } })
    },
    {
      name: "inconsistent initial pagination headers",
      pattern: /inconsistent pagination headers/,
      handler: (_request, response) => sendJson(response, [entry(1), entry(2)], { headers: { "X-WP-Total": "3", "X-WP-TotalPages": "1" } })
    },
    {
      name: "page-size mismatch",
      pattern: /inconsistent collection page/,
      handler: (_request, response) => sendJson(response, [entry(1)], { headers: { "X-WP-Total": "3", "X-WP-TotalPages": "2" } })
    },
    {
      name: "later-page pagination changes",
      pattern: /inconsistent pagination headers/,
      handler: (request, response) => {
        const page = new URL(request.url ?? "/", "http://local.test").searchParams.get("page");
        const headers = page === "1"
          ? { "X-WP-Total": "3", "X-WP-TotalPages": "2" }
          : { "X-WP-Total": "4", "X-WP-TotalPages": "2" };
        sendJson(response, page === "1" ? [entry(1), entry(2)] : [entry(3), entry(4)], { headers });
      }
    },
    {
      name: "later-page HTTP failure",
      pattern: /HTTP 500/,
      handler: (request, response) => {
        const page = new URL(request.url ?? "/", "http://local.test").searchParams.get("page");
        if (page === "2") sendJson(response, { code: "server_error" }, { status: 500 });
        else sendJson(response, [entry(1), entry(2)], { headers: { "X-WP-Total": "3", "X-WP-TotalPages": "2" } });
      }
    }
  ];

  for (const current of cases) {
    await t.test(current.name, async () => {
      await withServer(current.handler, async (baseUrl) => {
        await expectProviderError(
          () => provider(baseUrl, { perPage: 2 }).getCollection("posts"),
          current.pattern
        );
      });
    });
  }
});

test("reports WordPress HTTP status failures", async (t) => {
  for (const status of [401, 403, 404, 429, 500]) {
    await t.test(String(status), async () => {
      await withServer((_request, response) => sendJson(response, { code: "failure" }, { status }), async (baseUrl) => {
        await expectProviderError(() => provider(baseUrl).getPage("about"), new RegExp(`HTTP ${status}`), (error) => {
          assert.equal(error.content, "about");
        });
      });
    });
  }
});

test("reports invalid JSON, timeout, and invalid WordPress entries", async (t) => {
  await t.test("invalid JSON", async () => {
    await withServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{not-json");
    }, async (baseUrl) => {
      await expectProviderError(() => provider(baseUrl).getPage("bad-json"), /invalid JSON/i);
    });
  });
  await t.test("timeout", async () => {
    await withServer(() => {}, async (baseUrl) => {
      await expectProviderError(
        () => provider(baseUrl, { timeoutMs: 20 }).getPage("slow"),
        /timed out|exceeded 20ms/i
      );
    });
  });
  await t.test("unexpected entry shape", async () => {
    await withServer((_request, response) => sendJson(response, [{ id: "not-an-integer" }]), async (baseUrl) => {
      await expectProviderError(() => provider(baseUrl).getPage("bad-entry"), /invalid content item|integer id/);
    });
  });
  await t.test("non-published entry", async () => {
    await withServer((_request, response) => sendJson(response, [{ ...richPage, status: "draft" }]), async (baseUrl) => {
      await expectProviderError(() => provider(baseUrl).getPage("draft"), /status.*publish/);
    });
  });
});

test("returns null for unsupported singleton, navigation, and settings operations", async () => {
  const wordpress = provider("https://example.test/wp-json/wp/v2");
  assert.equal(await wordpress.getSingleton("site"), null);
  assert.equal(await wordpress.getNavigation("main"), null);
  assert.equal(await wordpress.getSettings("site"), null);
});

test("normalized WordPress output passes through the NexusContent service", async () => {
  await withServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://local.test");
    if (url.pathname.endsWith("/pages")) sendJson(response, [richPage]);
    else sendJson(response, posts, { headers: { "X-WP-Total": "2", "X-WP-TotalPages": "1" } });
  }, async (baseUrl) => {
    const nexus = new NexusContent({
      content: {
        about: { provider: "cms", key: "about-us" },
        blog: { provider: "cms", key: "posts" }
      }
    });
    nexus.register("cms", provider(baseUrl, { name: "cms", perPage: 2 }));
    const page = await nexus.getPage("about");
    const collection = await nexus.getCollection("blog");
    assert.equal(page?.meta.source, "wordpress");
    assert.equal(page?.title, "Fish &amp; Chips &#8212; News");
    assert.deepEqual(collection.map((item) => item.key), ["first-post", "second-post"]);
  });
});
