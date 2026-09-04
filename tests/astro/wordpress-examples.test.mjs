import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { test } from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const singleRoot = fileURLToPath(new URL("../../examples/astro-wordpress/", import.meta.url));

const companionFilePath = new URL("../contracts/fixtures/", import.meta.url);

async function companionFixture(name) {
  return JSON.parse(await readFile(fileURLToPath(new URL(`${name}.json`, companionFilePath)), "utf8"));
}

const projectContract = async () => {
  const capabilities = await companionFixture("companion-capabilities");
  const schema = await companionFixture("companion-schema");
  return { capabilities, schema };
};

const companionPosts = {
  "first-post": {
    id: "2",
    key: "first-post",
    slug: "first-post",
    title: "First Post",
    status: "published",
    excerpt: "First excerpt",
    sections: [
      {
        id: "hero-1",
        type: "hero",
        data: {
          eyebrow: "Companion content",
          heading: "Companion sections, same shape.",
          body: "Served from the plugin wire contract."
        }
      },
      {
        id: "gallery-1",
        type: "gallery",
        data: {
          heading: "Gallery parity",
          // Wire media shape (`url` + metadata) is normalized to `src` by the
          // provider, so the built page renders through the shared gallery grid.
          images: [
            { url: "https://example.test/gallery-one.jpg", id: "1", mimeType: "image/jpeg", width: 1200, height: 800, alt: "One" },
            { url: "https://example.test/gallery-two.jpg", id: "2", mimeType: "image/jpeg", width: 640, height: 480, alt: "Two" }
          ]
        }
      }
    ],
    rawFields: {
      publishedAt: "2026-08-01T10:00:00Z",
      content: "<p>Raw HTML fallback is bypassed when sections exist.</p>"
    }
  },
  "second-post": {
    id: "3",
    key: "second-post",
    slug: "second-post",
    title: "Second Post",
    status: "published",
    excerpt: "Second excerpt",
    sections: [],
    rawFields: {
      publishedAt: "2026-08-02T10:00:00Z",
      content: "<p>Second post body from WordPress.</p>"
    }
  }
};

const companionPages = {
  home: {
    id: "10",
    key: "home",
    slug: "home",
    title: "Home - NexusContent",
    sections: [
      { id: "home-hero", type: "hero", data: { heading: "Content abstraction, done right." } },
      { id: "home-intro", type: "intro", data: { heading: "One interface, every content source." } }
    ],
    rawFields: {}
  },
  services: {
    id: "11",
    key: "services",
    slug: "services",
    title: "Services - NexusContent",
    sections: [
      { id: "services-hero", type: "hero", data: { heading: "What we deliver" } },
      { id: "services-faq", type: "faq", data: { heading: "Frequently asked questions" } }
    ],
    rawFields: {}
  }
};

function collectionItems() {
  return Object.values(companionPosts).map(({ id, key, slug, title, sections, rawFields }) => ({
    id,
    key,
    slug,
    title,
    sections,
    rawFields
  }));
}

function pageEnvelope(data) {
  return { contractVersion: 1, data };
}

test("WordPress Astro examples build against a local companion API", async (t) => {
  const { capabilities, schema } = await projectContract();
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const path = url.pathname;

    response.setHeader("Content-Type", "application/json");
    if (path === "/wp-includes/css/dist/block-library/style.min.css") {
      response.setHeader("Content-Type", "text/css");
      response.end(".wp-block-image img{max-width:100%;height:auto}");
      return;
    }
    if (path === "/wp-includes/css/dist/block-library/theme.min.css") {
      response.setHeader("Content-Type", "text/css");
      response.end(".wp-block-table{width:100%}");
      return;
    }
    if (path === "/wp-json/nexuscontent/v1/capabilities") {
      response.end(JSON.stringify(capabilities));
      return;
    }
    if (path === "/wp-json/nexuscontent/v1/schema") {
      response.end(JSON.stringify(schema));
      return;
    }
    if (path === "/wp-json/nexuscontent/v1/posts") {
      response.end(JSON.stringify(pageEnvelope({ items: collectionItems(), pagination: { total: 2, totalPages: 1, page: 1, perPage: 20 } })));
      return;
    }
    const pageSlugMatch = path.match(/^\/wp-json\/nexuscontent\/v1\/pages\/slug\/(.+)$/);
    if (pageSlugMatch) {
      const page = companionPages[decodeURIComponent(pageSlugMatch[1])];
      if (page) {
        response.end(JSON.stringify(pageEnvelope(page)));
        return;
      }
      response.writeHead(404);
      response.end();
      return;
    }
    const tokenMatch = path.match(/^\/nexuscontent\/v1\/preview\/([0-9a-f]{64})\/(\d+)$/);
    if (tokenMatch) {
      // The preview token is short-lived and bound to a single post id. A
      // valid token serves the matching post's draft content; anything else is
      // rejected as a 401 so the consumer route renders the expired message.
      const token = tokenMatch[1];
      const id = tokenMatch[2];
      const valid = id === "2" && token === "a".repeat(64);
      if (!valid) {
        response.writeHead(401);
        response.end();
        return;
      }
      const post = companionPosts["first-post"];
      response.end(JSON.stringify(pageEnvelope({ ...post, id, status: "draft" })));
      return;
    }
    if (path === "/nexuscontent/v1/preview-token") {
      response.end(JSON.stringify(pageEnvelope({ token: "a".repeat(64), expiresAt: "2026-08-31T12:00:00Z" })));
      return;
    }
    const slugMatch = path.match(/^\/wp-json\/nexuscontent\/v1\/posts\/slug\/(.+)$/);
    if (slugMatch) {
      const post = companionPosts[decodeURIComponent(slugMatch[1])];
      if (post) {
        response.end(JSON.stringify(pageEnvelope(post)));
        return;
      }
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(404);
    response.end();
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  t.after(async () => {
    await rm(`${singleRoot}dist`, { recursive: true, force: true });
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  const address = server.address();
  assert(address && typeof address === "object");
  const env = {
    ...process.env,
    WORDPRESS_API_URL: `http://127.0.0.1:${address.port}/wp-json/wp/v2`
  };

  const result = await execFileAsync("npm", ["run", "build", "--workspace", "@nexuscontent/example-astro-wordpress"], {
    cwd: root,
    env,
    maxBuffer: 10 * 1024 * 1024
  });
  assert.equal(result.stderr.includes("ERROR"), false, result.stderr);

  const singleHome = await readFile(`${singleRoot}dist/index.html`, "utf8");
  const singleAbout = await readFile(`${singleRoot}dist/about/index.html`, "utf8");
  const singleServices = await readFile(`${singleRoot}dist/services/index.html`, "utf8");
  const singleContact = await readFile(`${singleRoot}dist/contact/index.html`, "utf8");
  const singleBlog = await readFile(`${singleRoot}dist/blog/index.html`, "utf8");
  const singlePost = await readFile(`${singleRoot}dist/blog/first-post/index.html`, "utf8");
  const secondPost = await readFile(`${singleRoot}dist/blog/second-post/index.html`, "utf8");
  assert.match(singleHome, /Content abstraction, done right/);
  assert.match(singleHome, /One interface, every content source/);
  assert.match(singleHome, /property="og:image" content="https:\/\/nexuscontent\.dev\/social-default\.jpg"/);
  assert.match(singleAbout, /We make content replaceable/);
  assert.match(singleAbout, /Content first, page later/);
  assert.match(singleServices, /What we deliver/);
  assert.match(singleServices, /Frequently asked questions/);
  assert.match(singleContact, /Talk to us/);
  assert.match(singleContact, /hello@nexuscontent\.dev/);
  assert.match(singleBlog, /\/blog\/first-post/);
  assert.match(singleBlog, /Second Post/);

  // Companion items carry normalized sections in `data.sections`, so the post
  // renders through PostSections instead of the raw-HTML fallback.
  assert.match(singlePost, /Companion sections, same shape/);
  assert.match(singlePost, /Gallery parity/);
  assert.doesNotMatch(singlePost, /Raw HTML fallback/);

  // Companion wire media (`image.url`) renders as `src` after provider
  // normalization, proving section parity through the full static build.
  assert.match(singlePost, /src="https:\/\/example\.test\/gallery-one\.jpg"/);

  // A post with no sections keeps the raw-HTML fallback path.
  assert.match(secondPost, /Second post body from WordPress/);

  // Gutenberg block styles are vendored at build time into dist/gutenberg/ and
  // linked from fallback post pages, keeping the static dist self-contained.
  const gutenbergCss = await readFile(`${singleRoot}dist/gutenberg/wp-block-library.css`, "utf8");
  const gutenbergThemeCss = await readFile(`${singleRoot}dist/gutenberg/wp-block-library-theme.css`, "utf8");
  assert.match(gutenbergCss, /wp-block-image img/);
  assert.match(gutenbergThemeCss, /wp-block-table/);
  assert.match(secondPost, /href="\/gutenberg\/wp-block-library\.css"/);
  assert.match(secondPost, /href="\/gutenberg\/wp-block-library-theme\.css"/);

  // The consumer-owned preview route builds as a static page. It has no
  // session or persisted state: it only ever renders content when given a
  // valid `?token=...&id=...`, and otherwise shows a placeholder.
  const previewPage = await readFile(`${singleRoot}dist/preview/index.html`, "utf8");
  assert.match(previewPage, /Missing preview token or content id/);
});
