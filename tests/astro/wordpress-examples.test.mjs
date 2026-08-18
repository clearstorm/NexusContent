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

const posts = [
  entry(2, "first-post", "First Post", "<p>First post body from WordPress.</p>", "First excerpt"),
  entry(3, "second-post", "Second Post", "<p>Second post body from WordPress.</p>", "Second excerpt")
];

const pages = {
  home: entry(1, "home", "WordPress Home", "<p>Home content from WordPress.</p>", "Home excerpt", {
    hero: {
      eyebrow: "Content, decoupled",
      heading: "Astro owns the website.",
      intro: "Content providers own the content.",
      cta: { label: "About us", href: "/about" }
    },
    services: {
      heading: "What we do",
      items: [
        { title: "Static builds", description: "Predictable output." },
        { title: "Separated content", description: "Editable content lives outside the app." },
        { title: "Provider freedom", description: "Swap Git for WordPress." }
      ]
    },
    testimonials: {
      heading: "What people say",
      items: [
        { quote: "Content changed without touching a single component.", author: "Editor" },
        { quote: "The build failed loudly when content was invalid.", author: "Developer" }
      ]
    },
    cta: { heading: "Read our blog", intro: "Collection-driven pages.", label: "View posts", href: "/blog" }
  }),
  about: entry(10, "about", "About", "<p>About content from WordPress.</p>", "About excerpt", {
    hero: { eyebrow: "Who we are", heading: "Separation, by design.", intro: "NexusContent keeps the boundary clean." },
    mission: { heading: "Our mission", content: "Give frontend applications a single content interface." },
    story: { heading: "Our story", content: "NexusContent began with one question." },
    values: { heading: "Principles", items: ["Astro owns routing.", "Core stays provider independent.", "Editable content lives outside the app."] },
    cta: { heading: "Want to talk?", intro: "We are happy to explain.", label: "Contact us", href: "/contact" }
  }),
  services: entry(11, "services", "Services", "<p>Services content from WordPress.</p>", "Services excerpt", {
    hero: { eyebrow: "What we do", heading: "Services built on a clean boundary.", intro: "Every service is delivered through the same API." },
    services: {
      heading: "Core services",
      intro: "Proven by the pages you are visiting.",
      items: [
        { title: "Static builds", description: "Static generation is the default.", points: ["Predictable output", "Fast builds"] },
        { title: "Localised content", description: "Locale variants with fallback.", points: ["Two languages", "Explicit fallback"] },
        { title: "Separated content", description: "Editable content outside the app.", points: ["Client owned content", "Clean diffs"] }
      ]
    },
    cta: { heading: "Ready to start?", intro: "Contact us.", label: "Contact us", href: "/contact" }
  }),
  contact: entry(12, "contact", "Contact", "<p>Contact content from WordPress.</p>", "Contact excerpt", {
    hero: { eyebrow: "Get in touch", heading: "Contact us", intro: "These details are content too." },
    contact: {
      heading: "Details",
      items: [
        { label: "Email", value: "hello@example.com", href: "mailto:hello@example.com" },
        { label: "Phone", value: "+27 11 000 0000", href: "tel:+27110000000" },
        { label: "Address", value: "1 Content Lane, Sandton" },
        { label: "Office hours", value: "Mon-Fri, 08:00-17:00" }
      ]
    },
    cta: { heading: "Email us directly", intro: "Write to the address above.", label: "Send an email", href: "mailto:hello@example.com" }
  })
};

test("WordPress Astro examples build against a local REST API", async (t) => {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    let payload;

    if (url.pathname === "/wp-json/wp/v2/pages" && url.searchParams.has("slug")) {
      const slug = url.searchParams.get("slug");
      const page = pages[slug];
      payload = page ? [page] : [];
    } else if (url.pathname === "/wp-json/wp/v2/posts" && url.searchParams.has("slug")) {
      payload = posts.filter((post) => post.slug === url.searchParams.get("slug"));
    } else if (url.pathname === "/wp-json/wp/v2/posts") {
      payload = posts;
      response.setHeader("X-WP-Total", String(posts.length));
      response.setHeader("X-WP-TotalPages", "1");
    } else {
      response.writeHead(404).end();
      return;
    }

    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(payload));
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
  assert.match(singleHome, /WordPress Home/);
  assert.match(singleHome, /Astro owns the website/);
  assert.match(singleHome, /property="og:image" content="https:\/\/nexuscontent\.dev\/social-default\.jpg"/);
  assert.match(singleAbout, /Separation, by design/);
  assert.match(singleAbout, /Our mission/);
  assert.match(singleServices, /Services built on a clean boundary/);
  assert.match(singleServices, /Static builds/);
  assert.match(singleContact, /Contact us/);
  assert.match(singleContact, /hello@example\.com/);
  assert.match(singleBlog, /\/blog\/first-post/);
  assert.match(singleBlog, /Second Post/);
  assert.match(singlePost, /First post body from WordPress/);
});

function entry(id, slug, title, content, excerpt, fields = undefined) {
  const entry = {
    id,
    slug,
    status: "publish",
    title: { rendered: title },
    content: { rendered: content },
    excerpt: { rendered: excerpt },
    date_gmt: "2026-08-01T10:00:00",
    modified_gmt: "2026-08-02T10:00:00",
    link: `https://example.test/${slug}/`,
    featured_media: 10,
    _embedded: {
      "wp:featuredmedia": [{
        id: 10,
        source_url: "https://example.test/featured.jpg",
        alt_text: "Featured image",
        media_details: { width: 1200, height: 630 }
      }]
    }
  };
  if (fields) {
    entry.acf = fields;
  }
  return entry;
}
