# Astro WordPress Example

A dual-provider reference consumer: the same Astro site is served from a **Git
content repository** (the committed `content/` directory) and declares a
**WordPress** source that any model can switch to. Astro owns `/`, `/about`,
`/services`, `/contact`, `/blog/`, and `/blog/[slug]/`; pages retrieve
normalized content only through the helpers in `src/nexus.ts`.

## How providers are mixed

Every model in `src/schema/schema.ts` declares its own source:

```ts
home: {
  kind: "singleton",
  source: { provider: "wordpress", key: "home" }
}
```

Pages come from both providers: `home` and `services` are served by
WordPress, `about` and `contact` by Git. Page singletons declare **no
`fields`**: NexusContent projects each provider's ordered sections onto
`page.sections` — a named map keyed by section type — plus the ordered
`page.sectionsList`, so the same template composes from the map no matter
which source supplied it.

The WordPress instance lives in `src/nexus.config.ts` and uses provider options
`apiStrategy: "companion"` (the secured companion plugin routes via the managed
WordPress instance running the plugin; set `auto` to fall back to standard REST
silently when the plugin is absent, or `core` for the released 0.2.0 REST path
without any companion calls) and `editorMode: "gutenberg"`. Under that mode
companion sections arrive as the canonical `data.sections` array on every item,
matching the `sections` field the Git blog posts author. A site that needs both
at once can register two WordPress instances (one per editor mode, see
"Multiple provider instances" in the root `AGENTS.md`).

Navigation and settings are NexusContent models; this example resolves them
through the Git provider. `BaseLayout` loads
them through `nexus.getNavigation("primary")` / `nexus.getSettings("site")` and
falls back to small constants if either is missing. (The WordPress provider
also resolves native `wp/v2` navigation and settings since `0.2.9`.)

## The twelve canonical sections

Blog posts carry CMS-ordered bodies as a `sections` array in the canonical
wire shape both providers share:

```json
{
  "type": "rich_text",
  "data": { "heading": "...", "body": "<p>...</p>" }
}
```

`components/PostSections.astro` renders any of the twelve canonical types —
`hero`, `intro`, `rich_text`, `image_text`, `features`, `statistics`,
`testimonials`, `gallery`, `cta`, `faq`, `logo_grid`, `form_embed` — with the
`{ type, data }` shape. Components render against the same field names the
companion plugin's `sections.json` defines. A reusable `buttons` subcomponent
(`{ label, url, variant? }`) appears on hero, image_text, and cta instead of
fixed primary/secondary action field pairs.

Singleton pages (home, about, services, contact) render the same section
components through the projected `page.sections` map. Git authoring mirrors it:
`content/pages/about.json` stores a `sections: { ... }` map keyed by section
type (JSON key order is the section order), and the WordPress page path is
normalized to the same ordered list, so the map contains the identical
headings whether `about` came from Git or a CMS. Posts without sections fall
back to the raw HTML `content` field, which is exactly what a plain WordPress
post produces.

## Media

`src/app/media.ts` is the consumer-owned resolver. Section data may carry
`{ src, alt }` references; `resolveImage` / `resolveMediaFields` resolve them
through `nexus.media.resolve` before pages render. `media.default` is
`"remote"`, so absolute http(s) URLs pass through validated — the committed Git
content uses absolute image URLs and normalized WordPress media resolves the
same way.

## Environment variables

```text
WORDPRESS_API_URL=https://wordpress.example.com/wp-json/wp/v2
WORDPRESS_USERNAME=your-wordpress-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
NEXUS_GIT_CONTENT_PATH=../client-content
```

`WORDPRESS_API_URL` is required (the example registers the WordPress provider).
Create an Application Password under **Users > Your Profile > Application
Passwords** in WordPress. `NEXUS_GIT_CONTENT_PATH` defaults to `content` — this
example's committed content directory. Never expose credentials in client-side
code, committed files, logs, or public environment variables.

## Fallback body styling

Posts without sections render WordPress `content` HTML and load Gutenberg's own
block styles (`wp-includes/css/dist/block-library/style.min.css` +
`theme.min.css`) so blocks keep their editor look. `npm run build` first runs
`scripts/vendor-gutenberg.mjs`, which fetches those two files from the
`WORDPRESS_API_URL` origin into `public/gutenberg/` (gitignored) — the static
`dist/` stays self-contained. If the origin is unreachable the build warns and
fallback bodies render unstyled (a consumer-planned degradation). The vendored
files are WordPress core block styles (GPL); see `scripts/vendor-gutenberg.mjs`
for their source.

## HTML trust

The `rich_text`, `image_text`, and `form_embed` sections insert provided HTML
with `set:html`, and posts fall back to WordPress `content.rendered` HTML. The
application must trust that HTML or sanitize it according to its own security
policy; this example intentionally does not add a sanitizer.

## Build and check

After workspace install metadata includes this example and the root package has
been built:

```sh
npm run build --workspace @nexuscontent/example-astro-wordpress
npm run check --workspace @nexuscontent/example-astro-wordpress
```

## Project contract push

The NexusContent companion plugin's admin "Project contract" card only fills in
once the consumer pushes its schema. This example pushes its contract from the
example directory:

```sh
npm run push:project-contract
```

It derives `{ components, sectionTypes }` via the public
`WordPressProvider.projectComponentContract(schema)` API (twelve canonical
section types, no component type map) and POSTs it to
`/wp-json/nexuscontent/v1/project-contract` with the Application Password from
the environment variables above (requires `manage_options`).

Installed consumers do the same in their own code: call
`provider.projectComponentContract(schema)` and POST the result (or curl it) to
the plugin route.
## Draft preview

The WordPress companion plugin's "Open frontend preview" button opens this
example's `src/pages/preview.astro` route with `?token=...&id=...`. The token
is the auth and expires within minutes; the route fetches the tokenized
companion endpoint server-side and renders the draft through the same section
components as published content.

The preview route must read the token query string per request, so it is
on-demand (`export const prerender = false`). The example uses the
`@astrojs/node` standalone adapter: every other route remains a static build
under `dist/client/`, while `dist/server/entry.mjs` serves the preview route
(and, in `standalone` mode, the whole site) from `node dist/server/entry.mjs`.
`astro dev` renders it per request too. A pure static host cannot serve draft
preview because no static page can read a visitor's query string.

If the page shows a failure notice, open its collapsed "Preview diagnostics"
block: it states whether a token and id reached the renderer and which API base
was detected, so a misconfigured `WORDPRESS_API_URL` (which must end in
`/wp-json/wp/v2`) is distinguishable from a missing or stripped query string.
