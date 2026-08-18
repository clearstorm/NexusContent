import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { serializeJsonLd as serializeBasicJsonLd } from "../../examples/astro-basic/src/app/serialize-json-ld.ts";
import { serializeJsonLd as serializeLocalisedJsonLd } from "../../examples/astro-basic-localised/src/app/serialize-json-ld.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const examples = ["astro-basic", "astro-basic-localised"] as const;
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
    "[locale]/about.astro",
    "[locale]/services.astro",
    "[locale]/contact.astro",
    "[locale]/blog/index.astro",
    "[locale]/blog/[slug].astro"
  ]
} as const;

test("Astro JSON-LD serializers escape script-breaking characters", () => {
  const value = {
    text: "</script><script>alert('xss')</script>&\u2028\u2029"
  };

  for (const serialize of [serializeBasicJsonLd, serializeLocalisedJsonLd]) {
    const result = serialize(value);

    assert.doesNotMatch(result, /[<>&\u2028\u2029]/u);
    assert.match(result, /\\u003c\/script\\u003e/);
    assert.match(result, /\\u0026\\u2028\\u2029/);
    assert.deepEqual(JSON.parse(result), value);
  }
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

    for (const route of routeFiles[example]) {
      const source = await readFile(`${base}/pages/${route}`, "utf8");
      assert.match(source, /import \{ resolveSeo \} from "@nexuscontent\/core"/);
      assert.match(source, /const seo = resolveSeo\(\{/);
      assert.match(source, /seo=\{seo\}/);
    }
  }
});
