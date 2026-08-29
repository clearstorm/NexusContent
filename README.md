# NexusContent

> An open source, framework neutral content access layer for JavaScript and TypeScript applications.

NexusContent provides a consistent API for retrieving normalized content from external sources — Git managed content, WordPress, Strapi, and future providers. It sits between content sources and applications so your frontend never depends directly on a CMS.

**Consumers own the application. Content providers own the content. Deployment infrastructure owns delivery.**

## Why NexusContent

Developers want Git, static builds, and predictable deployments. Content editors want forms, media management, and no code access. NexusContent keeps these concerns separate — your application consumes normalized content without depending on which CMS, framework, or hosting platform is in use.

```text
Content Sources → NexusContent → Consumer Build → Deployment
```

The same application should be able to switch from WordPress to Git content without a frontend rewrite.

## Install

```bash
npm install @nexuscontent/core
```

## Quick Start

```ts
import { NexusContent } from "@nexuscontent/core";

const nexus = new NexusContent(config);

const page = await nexus.getPage("about");
const projects = await nexus.getCollection("projects");
const project = await nexus.getItem("projects", "project-one");
```

Works identically in Astro, Next.js, plain Node scripts, or any JavaScript runtime.

## Providers

| Provider | Status | Source |
|----------|--------|--------|
| Git | Implemented | JSON content directories |
| WordPress | Implemented | WordPress REST API |
| Strapi | Planned | Strapi REST API |

### Git Provider

Content lives in a separate repository. Point NexusContent at it:

```ts
import { defineNexusConfig, NexusContent } from "@nexuscontent/core";

const nexus = new NexusContent(
  defineNexusConfig({
    providers: {
      content: {
        type: "git",
        options: { contentPath: "../client-content" }
      }
    },
    schema: {
      models: {
        home: {
          kind: "singleton",
          source: { provider: "content", key: "home", mode: "page" },
          fields: {
            hero: {
              type: "object",
              fields: {
                heading: { type: "string", required: true },
                intro: { type: "string" }
              }
            }
          }
        },
        about: {
          kind: "singleton",
          source: { provider: "content", key: "about", mode: "page" }
        }
      }
    }
  })
);
```

Content structure:

```text
client-content/
├── pages/
│   ├── home.json
│   └── about.json
├── collections/
│   └── team/
├── navigation/
│   └── main.json
└── settings/
    └── site.json
```

### WordPress Provider

```ts
import {
  defineNexusConfig,
  NexusContent,
  WordPressMediaProvider,
  WordPressProvider
} from "@nexuscontent/core";

const wordpress = new WordPressProvider({
  baseUrl: "https://wordpress.example.com/wp-json/wp/v2"
});

const nexus = new NexusContent(
  defineNexusConfig({
    providers: {
      wordpress: {
        type: "wordpress",
        options: { baseUrl: "https://wordpress.example.com/wp-json/wp/v2" }
      }
    },
    schema: {
      models: {
        home: {
          kind: "singleton",
          source: { provider: "wordpress", key: "home", mode: "page" }
        },
        posts: {
          kind: "collection",
          source: { provider: "wordpress", key: "posts" }
        }
      }
    }
  })
);

nexus.register("wordpress", wordpress);

const home = await nexus.getPage("home");
const posts = await nexus.getCollection("posts");
```

### Model Schema

The `schema.models` contract declares where each logical model's content comes
from and what its data should look like. Model `kind` selects the retrieval
operation: `singleton` (via `getPage` or `getSingleton`), `collection`,
`navigation`, or `settings`. For singletons, `source.mode` selects the
provider operation: `"page"` routes to `getPage` (Git `pages/<key>.json`),
`"singleton"` (the default) routes to `getSingleton` (Git
`singletons/<key>.json`).

Field types are `string`, `number`, `boolean`, `datetime`, `object`,
`reference`, `media`, `richText`, `component`, and `blocks`. Fields support
`required`, `list`, `options` (enum strings), nested `object.fields`,
`reference.collection` references, and `media` overrides. `component` fields
reference declared `schema.components`; `blocks` fields validate a
discriminated `_type` list against `allowedComponents`. Data is validated at
retrieval time; a mismatch throws a `SchemaError`. Undeclared data fields pass
through.
`defineNexusConfig()` preserves literal model names and field declarations, so
retrieval methods accept only compatible model kinds and infer each result's
`data` shape without explicit generic parameters.

```ts
fields: {
  title: { type: "string", required: true },
  status: { type: "string", options: ["draft", "published"] },
  tags: { type: "string", list: true },
  cover: { type: "media" },
  author: { type: "reference", collection: "people" }
}
```

### Media

Media references stay neutral. Providers normalize source media into
`MediaAsset` where `src` is the URL source (migrated from the legacy `url`
field in `0.2.2`):

```ts
media: {
  default: "remote",
  providers: {
    local: { type: "local", options: { root: "../client-content/media", publicPath: "/media" } },
    remote: { type: "remote" }
  }
}
```

`local` maps root-relative paths to `publicPath` web URLs with traversal
protection. `remote` validates absolute http(s) URLs without fetching. A
WordPress media provider resolves ids through the WordPress media endpoint and
is registered manually:

```ts
nexus.registerMedia("wordpress", new WordPressMediaProvider({ baseUrl }));
const asset = await nexus.media.resolve({ id: "9" }); // or { src: "..." }
```

### WordPress Options

```ts
new WordPressProvider({
  baseUrl: "https://wordpress.example.com/wp-json/wp/v2", // required
  headers: { Authorization: `Bearer ${token}` },          // optional auth
  collections: { books: { endpoint: "books" } },          // custom post types
  perPage: 100,        // 1-100, default 100
  maxPages: 100,       // safety limit
  timeoutMs: 10000     // request timeout
});
```

### WordPress Components and Synchronisation

Section vocabulary lives in one monorepo canonical file,
`integrations/wordpress/nexuscontent/sections.json`; the PHP plugin registry and
the generated `sections.generated.ts` both derive from it (`npm run
check:sections` enforces freshness in CI).

At build time, validate your declared consumer components against the install:

```ts
const wordpress = await new WordPressProvider({
  baseUrl: "...",
  componentTypeMap: { servicesList: "features" } // rename bridge
});

// Throws wordpress/unknown-component for unresolvable names.
wordpress.validateComponents(schema.components);

// Serializable contract to push to a site (see below):
const contract = wordpress.projectComponentContract(schema); // { components, sectionTypes }
```

During `auto`/`companion` API strategy, the provider reconciles its effective
registry against the site's live `/schema` — install-only sections extend the
registry, and registry-only or conflicting sections surface as structured
diagnostics (thrown in strict companion mode).

Push the project contract to a WordPress site to see expected-vs-installed drift
on the plugin Dashboard:

```bash
curl -X POST "https://wordpress.example.com/wp-json/nexuscontent/v1/project-contract" \
  -H "X-WP-Nonce: <rest-nonce>" \
  -H "Content-Type: application/json" \
  -d '{"components":["hero","servicesList"],"sectionTypes":["hero","features"]}'
```

The route requires `manage_options`, stores only sanitized string arrays in
`nexuscontent_settings`, and never reconfigures editor settings automatically.
It lives outside the content wire contract, so no `contractVersion` negotiation
applies.

See `docs/wordpress-companion.md` for the project-facing definition of the companion plugin.

### Editor Modes

Pages can use one of three editor modes. The companion plugin stores the mode per-page in WordPress, so different pages on the same site can use different modes:

| Mode | Requires | Description |
|------|----------|-------------|
| `gutenberg` | WordPress core | Native block editor (default) |
| `acf_fixed` | ACF Free 6.2+ | Fixed Hero, Intro, CTA fields |
| `acf_flexible` | ACF Pro 6.2+ | Flexible layouts for all 12 sections |

The provider resolves the mode per-page: per-page field → `defaultEditorMode` → `editorMode` fallback (defaults to `"gutenberg"`). With the companion plugin the mode is resolved server-side.

```ts
new WordPressProvider({
  baseUrl: "...",
  editorMode: "gutenberg",       // fallback, default "gutenberg"
  defaultEditorMode: "acf_fixed" // site-wide intermediate default
});
```

## Localisation (Optional)

```ts
const nexus = new NexusContent(
  defineNexusConfig({
    locales: {
      default: "en",
      supported: ["en", "fr"],
      fallback: { fr: "en" }
    },
    // providers and a schema.models contract as usual
  })
);

const page = await nexus.getPage("about", { locale: "fr" });
```

## Astro Usage

```astro
---
import { NexusContent } from "@nexuscontent/core";
import BaseLayout from "../layouts/BaseLayout.astro";

const nexus = new NexusContent(config);
const page = await nexus.getPage("about");
if (!page) throw new Error("About content was not found.");
---

<BaseLayout title={page.title}>
  <h1>{page.title}</h1>
  <Fragment set:html={page.data.content} />
</BaseLayout>
```

## Content Types

```ts
interface PageContent<TData> {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  seo?: SeoData;
  data: TData;
  meta: { source: string; sourceId?: string; updatedAt?: string; locale?: string };
}

interface CollectionItem<TData> {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  data: TData;
  meta: ContentMeta;
}
```

## SEO

```ts
import { resolveSeo } from "@nexuscontent/core";

const seo = resolveSeo(
  { title: page.title, excerpt: page.data.excerpt, featuredImage: page.data.featuredImage },
  { siteTitle: "My Site", defaultImage: { src: "https://example.com/social.jpg" } }
);
```

## Key Concepts

- **Framework neutral** — Core never imports Astro, Next.js, React, or any frontend framework
- **Normalized content** — Every provider returns the same `PageContent` and `CollectionItem` shapes
- **Model contracts** — `schema.models` declares sources and validates field data per logical model
- **Content provenance** — Every result includes `meta.source` and `meta.sourceId`
- **Media** — Provider-neutral `MediaAsset` and `MediaReference` with local, remote, and WordPress resolution
- **Validation** — Runtime schema validation with Zod; project-level schemas where practical
- **Static first** — Works at build time without a persistent server

## Documentation

- [ROADMAP.md](ROADMAP.md) — Milestones and release sequencing
- [FEATURES.md](FEATURES.md) — Feature status matrix

## License

MIT
