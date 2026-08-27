import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { test } from "node:test";
import {
  ProviderError,
  WordPressMediaProvider
} from "../../src/index.ts";

type Handler = (request: IncomingMessage, response: ServerResponse) => void;

function sendJson(
  response: ServerResponse,
  body: unknown,
  status = 200
): void {
  response.writeHead(status, { "content-type": "application/json" });
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

const mediaObject = {
  id: 9,
  slug: "about-team",
  source_url: "https://wordpress.example/media/about.jpg",
  alt_text: "The team",
  caption: { rendered: "Team photo" },
  media_details: { width: 1600, height: 900 }
};

test("resolves an id reference through the WordPress media endpoint", async () => {
  await withServer((request, response) => {
    assert.match(request.url ?? "", /^\/wp-json\/wp\/v2\/media\/9(?:\/)?(?:\?.*)?$/);
    sendJson(response, mediaObject);
  }, async (baseUrl) => {
    const provider = new WordPressMediaProvider({ baseUrl });

    const asset = await provider.resolve({ id: "9" });

    assert.ok(asset);
    assert.equal(asset.id, "9");
    assert.equal(asset.src, "https://wordpress.example/media/about.jpg");
    assert.equal(asset.alt, "The team");
    assert.equal(asset.caption, "Team photo");
    assert.equal(asset.width, 1600);
    assert.equal(asset.height, 900);
  });
});

test("returns null when the media endpoint answers 404", async () => {
  await withServer((_request, response) => {
    sendJson(response, { code: "rest_post_invalid_id" }, 404);
  }, async (baseUrl) => {
    const provider = new WordPressMediaProvider({ baseUrl });
    assert.equal(await provider.resolve({ id: "999" }), null);
  });
});

test("wraps non-404 media failures in a ProviderError", async () => {
  await withServer((_request, response) => {
    sendJson(response, { code: "oops" }, 500);
  }, async (baseUrl) => {
    const provider = new WordPressMediaProvider({ baseUrl });
    await assert.rejects(
      () => provider.resolve({ id: "9" }),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.equal(error.provider, "wordpress");
        assert.match((error as ProviderError).message, /HTTP 500/);
        return true;
      }
    );
  });
});

test("passes through src-only references without a network call", async () => {
  await withServer((_request, response) => {
    sendJson(response, mediaObject);
  }, async (baseUrl) => {
    const provider = new WordPressMediaProvider({ baseUrl });

    const asset = await provider.resolve({
      src: "https://cdn.example.com/direct.jpg"
    });

    assert.ok(asset);
    assert.equal(asset.src, "https://cdn.example.com/direct.jpg");
    assert.equal(asset.id, undefined);
  });
});

test("rejects an invalid baseUrl at construction", () => {
  assert.throws(
    () => new WordPressMediaProvider({ baseUrl: "not a url" }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match((error as ProviderError).message, /valid baseUrl/);
      return true;
    }
  );
});

test("supports being registered through registerMedia", async () => {
  await withServer((request, response) => {
    assert.match(request.url ?? "", /\/media\/9/);
    sendJson(response, mediaObject);
  }, async (baseUrl) => {
    // registered instances carry an explicit name
    const provider = new WordPressMediaProvider({ baseUrl, name: "media" });
    assert.equal(provider.name, "media");
    const asset = await provider.resolve({ id: "9" });
    assert.equal(asset?.src, "https://wordpress.example/media/about.jpg");
  });
});