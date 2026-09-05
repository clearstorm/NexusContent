import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { serializeJsonLd } from "../../src/index.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const examples = [
  "astro-basic",
  "astro-basic-localised",
  "astro-wordpress"
] as const;
const routeFiles = {
  "astro-basic": [
    "index.astro",
    "about.astro",
    "services.astro",
    "contact.astro",
    "blog/index.astro",
    "blog/[slug].astro"
  ],
  "astro-basic-localised": [
    "[locale]/index.astro",
    "[locale]/company.astro",
    "[locale]/services.astro",
    "[locale]/contact.astro",
    "[locale]/blog/index.astro",
    "[locale]/blog/[slug].astro"
  ],
  "astro-wordpress": [
    "index.astro",
    "about.astro",
    "services.astro",
    "contact.astro",
    "preview.astro",
    "blog/index.astro",
    "blog/[slug].astro"
  ]
} as const;

test("serializeJsonLd escapes script-breaking characters", () => {
  const value = {
    text: "</script><script>alert('xss')</script>&\u2028\u2029"
  };
  const result = serializeJsonLd(value);

  assert.doesNotMatch(result, /[<>&\u2028\u2029]/u);
  assert.match(result, /\\u003c\/script\\u003e/);
  assert.match(result, /\\u0026\\u2028\\u2029/);
  assert.deepEqual(JSON.parse(result), value);
});

test("each Astro example owns and integrates its SEO component", async () => {
  for (const example of examples) {
    const base = `${root}examples/${example}/src`;
    const [component, layout] = await Promise.all([
      readFile(`${base}/components/NexusSeo.astro`, "utf8"),
      readFile(`${base}/layouts/BaseLayout.astro`, "utf8")
    ]);

    assert.match(component, /import type \{ SeoData \} from "@nexuscontent\/core"/);
    assert.match(component, /canonicalUrl \?\? seo\.canonical/);
    assert.match(component, /set:html=\{serializeJsonLd\(value\)\}/);
    assert.match(layout, /<NexusSeo seo=\{seo\} \/>/);

    const seoHelper = await readFile(`${base}/app/seo.ts`, "utf8");
    assert.match(seoHelper, /import \{ makeCanonicalUrl \} from "@nexuscontent\/core"/);
    assert.doesNotMatch(seoHelper, /new URL\(/);

    for (const route of routeFiles[example]) {
      const source = await readFile(`${base}/pages/${route}`, "utf8");
      assert.match(source, /import \{ canonicalUrl \} from "[^"]*app\/seo"/);
      assert.match(source, /const seo = await nexus\.resolvePageSeo\(/);
      assert.match(source, /seo=\{seo\}/);
    }
  }
});