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
const nexus = new NexusContent({
  providers: {
    content: {
      type: "git",
      options: { contentPath: "../client-content" }
    }
  },
  content: {
    home: { provider: "content", key: "home" },
    about: { provider: "content", key: "about" }
  }
});
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
import { NexusContent, WordPressProvider } from "@nexuscontent/core";

const wordpress = new WordPressProvider({
  baseUrl: "https://wordpress.example.com/wp-json/wp/v2"
});

const nexus = new NexusContent({
  providers: {
    wordpress: {
      type: "wordpress",
      options: { baseUrl: "https://wordpress.example.com/wp-json/wp/v2" }
    }
  },
  content: {
    home: { provider: "wordpress", key: "home" },
    posts: { provider: "wordpress", key: "posts" }
  }
});

nexus.register("wordpress", wordpress);

const home = await nexus.getPage("home");
const posts = await nexus.getCollection("posts");
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
const nexus = new NexusContent({
  locales: {
    default: "en",
    supported: ["en", "fr"],
    fallback: { fr: "en" }
  }
  // providers and content as usual
});

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
  { siteTitle: "My Site", defaultImage: { url: "https://example.com/social.jpg" } }
);
```

## Key Concepts

- **Framework neutral** — Core never imports Astro, Next.js, React, or any frontend framework
- **Normalized content** — Every provider returns the same `PageContent` and `CollectionItem` shapes
- **Content provenance** — Every result includes `meta.source` and `meta.sourceId`
- **Validation** — Runtime schema validation with Zod; project-level schemas where practical
- **Static first** — Works at build time without a persistent server

## Documentation

- [ROADMAP.md](ROADMAP.md) — Milestones and release sequencing
- [FEATURES.md](FEATURES.md) — Feature status matrix

## License

MIT
