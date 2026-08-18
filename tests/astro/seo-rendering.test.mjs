import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { test } from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const fixtureRoot = fileURLToPath(
  new URL("../../examples/astro-basic/tests/seo-fixture/", import.meta.url)
);

test("NexusSeo renders available metadata and safe structured data", async () => {
  await rm(`${fixtureRoot}dist`, { recursive: true, force: true });
  await execFileAsync(
    "npm",
    [
      "run",
      "astro",
      "--workspace",
      "@nexuscontent/example-astro-basic",
      "--",
      "build",
      "--root",
      "tests/seo-fixture"
    ],
    { cwd: root }
  );

  const html = await readFile(`${fixtureRoot}dist/index.html`, "utf8");
  assert.match(html, /<title>SEO &amp; safety<\/title>/);
  assert.match(html, /<meta name="description" content="Escaped &quot;metadata&quot; <value>">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.com\/page">/);
  assert.match(html, /<meta name="robots" content="noindex, follow">/);
  assert.match(html, /<meta property="og:title" content="Open Graph title">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/example\.com\/open-graph\.jpg">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/example\.com\/twitter\.jpg">/);

  const scripts = [
    ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)
  ];
  assert.equal(scripts.length, 2);
  assert.doesNotMatch(html, /<script>globalThis\.compromised/);
  assert.match(scripts[0]?.[1] ?? "", /\\u003c\/script\\u003e/);
  assert.equal(JSON.parse(scripts[0]?.[1] ?? "").name.includes("</script>"), true);

  for (const tag of ["<title>", 'name="description"', 'rel="canonical"']) {
    assert.equal(html.split(tag).length - 1, 1, `expected one ${tag}`);
  }

  const minimal = await readFile(`${fixtureRoot}dist/missing/index.html`, "utf8");
  assert.match(minimal, /<title>Only a title<\/title>/);
  assert.doesNotMatch(minimal, /name="description"|rel="canonical"|name="robots"|property="og:|name="twitter:|application\/ld\+json/);
});
