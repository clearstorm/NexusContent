// Vendors WordPress' own Gutenberg block styles (GPL, WordPress core) so the
// static dist/ stays self-contained and fallback post bodies keep the editor's
// look. Fetches block-library style + theme CSS from the WORDPRESS_API_URL
// origin into public/gutenberg/. If the origin is unreachable the build warns
// and fallback bodies render unstyled; the consumer owns that degradation.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCES = [
  ["wp-includes/css/dist/block-library/style.min.css", "wp-block-library.css"],
  ["wp-includes/css/dist/block-library/theme.min.css", "wp-block-library-theme.css"]
];

const outDir = fileURLToPath(new URL("../public/gutenberg/", import.meta.url));

async function main() {
  const apiUrl = process.env.WORDPRESS_API_URL;
  if (!apiUrl) {
    console.warn("[vendor-gutenberg] WORDPRESS_API_URL is not set; skipping Gutenberg CSS (fallback bodies render unstyled).");
    return;
  }

  const origin = apiUrl.replace(/\/wp-json\/wp\/v2\/?$/, "");
  await mkdir(outDir, { recursive: true });

  for (const [source, filename] of SOURCES) {
    const url = `${origin}/${source}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      await writeFile(join(outDir, filename), await response.text(), "utf8");
      console.log(`[vendor-gutenberg] wrote public/gutenberg/${filename}`);
    } catch (error) {
      console.warn(`[vendor-gutenberg] failed to fetch ${url}: ${error.message}; skipping (fallback bodies render unstyled)`);
    }
  }
}

main();