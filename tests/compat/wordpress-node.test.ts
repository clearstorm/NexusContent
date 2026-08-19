import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { test } from "node:test";
import { NexusContent, WordPressProvider } from "../../src/index.ts";

function item(id: number, slug: string): Record<string, unknown> {
  return {
    id,
    slug,
    status: "publish",
    title: { rendered: slug === "home" ? "Home" : `Post ${id}` },
    content: { rendered: `<p>${slug}</p>` },
    modified_gmt: "2026-08-06T10:00:00"
  };
}

test("WordPress public API works in plain Node without Astro", async () => {
  const requests: string[] = [];
  const handler = (request: IncomingMessage, response: ServerResponse): void => {
    requests.push(request.url ?? "");
    const url = new URL(request.url ?? "/", "http://local.test");
    const isPage = url.pathname.endsWith("/pages");
    const values = isPage ? [item(1, "home")] : [item(10, "first"), item(11, "second")];
    const slug = url.searchParams.get("slug");
    const body = slug === null ? values : values.filter((value) => value.slug === slug);
    const headers = slug === null
      ? { "X-WP-Total": String(body.length), "X-WP-TotalPages": "1" }
      : {};
    response.writeHead(200, { "content-type": "application/json", ...headers });
    response.end(JSON.stringify(body));
  };

  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const wordpress = new WordPressProvider({
      baseUrl: `http://127.0.0.1:${address.port}/wp-json/wp/v2`,
      name: "wordpressNode",
      perPage: 2,
      apiStrategy: "core"
    });
    const nexus = new NexusContent({
      content: {
        home: { provider: "wordpressNode", key: "home" },
        posts: { provider: "wordpressNode", key: "posts" }
      }
    });
    nexus.register("wordpressNode", wordpress);

    const page = await nexus.getPage("home");
    const posts = await nexus.getCollection("posts");
    const post = await nexus.getItem("posts", "second");

    assert.equal(page?.title, "Home");
    assert.deepEqual(posts.map((value) => value.key), ["first", "second"]);
    assert.equal(post?.id, "11");
    assert.equal(post?.meta.source, "wordpress");
    assert.equal(requests.length, 3);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
