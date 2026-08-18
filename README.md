# NexusContent

> NexusContent is an open source, framework neutral content access layer for JavaScript and TypeScript applications. It provides a consistent API for retrieving normalized content from external sources such as Git managed content, WordPress, Strapi, and future providers.

NexusContent sits between content sources and applications.

Astro is the first reference consumer and integration environment used to prove NexusContent in static website workflows. It is not a dependency or architectural owner of NexusContent.

It is designed around a simple principle:

**Consumers own the application. Content providers own the content. Deployment infrastructure owns delivery.**

NexusContent sits between those concerns.

```text
Content Sources
      │
      ├── Git Content
      ├── WordPress
      ├── Strapi
      └── Future Providers
      │
      ▼
   Providers
      │
      ▼
NexusContent Core
      │
      ├── Provider Interface
      ├── Normalization
      ├── Validation
      ├── Content Services
      └── Content Provenance
      │
      ▼
    Consumers
      │
      ├── Astro
      ├── Next.js
      ├── Node
      ├── React based frameworks
      └── Future JavaScript consumers
      │
      ▼
 Build or Runtime
      │
      ├── cPanel
      ├── Vercel
      ├── Cloudflare
      ├── Netlify
      └── Other Hosts
```

---

# Project Status

NexusContent is at version `0.2.0`, released internally on 2026-08-18 as an early-development private package. The framework-neutral Core, Git JSON provider, WordPress REST provider, validation pipeline, localisation and SEO foundations, Astro reference consumers, and plain Node compatibility proofs are implemented. No feature is currently marked in progress; the recommended next focus is the directional `0.3.0` Strapi provider milestone.

For authoritative project tracking:

- [Current project status](PROJECT_STATUS.md)
- [Feature matrix](FEATURES.md)
- [Roadmap](ROADMAP.md)
- [Machine-readable state](project.state.json)

---

# Why NexusContent Exists

Modern JavaScript applications are excellent at building fast websites, but real client websites have a content management problem.

Developers want:

* Git
* structured code
* reusable components
* static builds
* predictable deployments
* strong validation
* version control

Content editors want:

* forms
* media management
* drafts
* previews
* publishing
* no Git knowledge
* no JSON editing
* no code access

Hosting requirements also vary.

One project may use cPanel.

Another may use Vercel.

Another may use Cloudflare.

Content may live in WordPress, Strapi, a Git backed content system, or another headless CMS.

Applications also vary in framework.

One project may use Astro.

Another may use a React based framework.

Another may be a plain Node script.

These concerns should not be tightly coupled.

NexusContent provides the boundary between them.

---

# Core Philosophy

NexusContent follows five major principles.

## 1. Consumers own routing

Primary website routes belong inside the consuming application.

For example, in the Astro reference example:

```text
src/pages/
├── index.astro
├── about.astro
├── services.astro
├── contact.astro
└── blog/
    ├── index.astro
    └── [slug].astro
```

A CMS does not determine the primary website information architecture.

A CMS supplies content.

The consumer determines how that content is presented.

Dynamic routes are still valid where appropriate.

For example, an Astro blog may use:

```text
src/pages/blog/[slug].astro
```

with entries supplied by WordPress, Strapi, Git content, or another provider.

---

## 2. Editable content should be separated from application code

NexusContent does not treat `src/data/*.json` as the primary content management strategy.

Files bundled directly inside the application repository are appropriate for developer owned configuration, but they are weak as a client content management system.

Editable business content should normally live outside the application.

Examples include:

* Git based content repository
* WordPress
* Strapi
* another headless CMS
* another external content service

This provides a clearer separation between application code and content.

---

## 3. Applications must not know which CMS is being used

Application pages and components should consume normalized NexusContent data.

They should not consume WordPress or Strapi response objects directly.

Bad:

```text
Page
    ↓
WordPress REST API
```

Correct:

```text
Page
    ↓
NexusContent Service
    ↓
Provider
    ↓
WordPress
```

The same application should be capable of changing content providers without requiring a complete frontend rewrite.

---

## 4. Deployment is independent

NexusContent does not require a particular hosting platform.

Static consumer output should be deployable to any suitable host.

Examples include:

* cPanel
* Vercel
* Cloudflare
* Netlify
* object storage
* traditional web servers
* other static hosting platforms

Deployment concerns must remain outside NexusContent Core.

---

## 5. Static first

The default website architecture should remain static whenever possible.

```text
Content
   ↓
NexusContent
   ↓
Consumer Build
   ↓
dist/
   ↓
Deployment
```

Static generation is a consumer execution mode, not a NexusContent Core requirement.

A Node runtime should only be introduced when the project actually requires server side functionality.

---

# What NexusContent Is

NexusContent is:

* a content abstraction layer
* a provider architecture
* a normalization layer
* a validation layer
* a consistent API for JavaScript and TypeScript applications
* a foundation for CMS integrations
* a foundation for content synchronization
* a foundation for preview workflows
* framework neutral infrastructure
* open source infrastructure

---

# What NexusContent Is Not

NexusContent is not:

* a CMS
* a page builder
* a WordPress replacement
* a Strapi replacement
* an Astro theme
* a Next.js plugin
* a React library
* a UI component library
* a hosting platform
* a deployment platform
* a database
* a frontend framework

NexusContent connects these systems.

It should not attempt to replace them.

---

# Architectural Overview

The target architecture is:

```text
                         Content Sources

          ┌─────────────────┼─────────────────┐
          │                 │                 │
        Git             WordPress          Strapi
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                            ▼
                    NexusContent Core
                            │
                 ┌──────────┼──────────┐
                 │          │          │
              Provider   Normalize   Validate
                 │          │          │
                 └──────────┼──────────┘
                            │
                            ▼
                     Content Service
                            │
            ┌───────────────┼───────────────┐
            │               │               │
          Node            Astro          Future
                                          Next.js
                                          TanStack
                                          Other JS
                            │
                            ▼
                     Build or Runtime
                            │
                            ▼
                          dist/
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
        cPanel            Vercel          Cloudflare
```

NexusContent Core ends at the consumer boundary.

It does not own the build, the runtime, or the deployment of the consuming application.

---

# Separation of Responsibilities

NexusContent uses a separation similar in spirit to MVC, although consuming applications are not being forced into a traditional MVC framework.

## Model

The content source.

Examples:

```text
Git content repository
WordPress
Strapi
Future CMS providers
```

## View

The consumer application's presentation.

```text
Pages
Layouts
Components
Styles
```

For Astro projects, Astro owns these concerns.

## Content Controller Layer

NexusContent.

```text
Configuration
Provider selection
Fetching
Normalization
Validation
Content services
```

This creates the desired separation:

```text
Content ≠ Application ≠ Infrastructure
```

---

# Repository Architecture

The initial repository should remain deliberately small.

```text
nexuscontent/
│
├── src/
│   │
│   ├── core/
│   │   ├── config.ts
│   │   ├── types.ts
│   │   ├── provider.ts
│   │   ├── registry.ts
│   │   ├── service.ts
│   │   ├── errors.ts
│   │   └── index.ts
│   │
│   ├── providers/
│   │   └── git/
│   │       ├── provider.ts
│   │       ├── loader.ts
│   │       ├── normalize.ts
│   │       └── index.ts
│   │
│   ├── validation/
│   │   ├── schemas.ts
│   │   ├── validate.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
├── examples/
│   ├── astro-basic/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── layouts/
│   │   │   └── pages/
│   │   ├── public/
│   │   ├── astro.config.mjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── astro-basic-localised/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── layouts/
│   │   │   └── pages/
│   │   ├── public/
│   │   ├── astro.config.mjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── node-basic/
│       ├── index.mjs
│       └── package.json
│
├── tests/
│   ├── core/
│   ├── providers/
│   ├── compat/
│   └── validation/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .gitignore
├── .env.example
├── package.json
├── tsconfig.json
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
└── README.md
```

Do not create empty directories for features that have not been implemented.

The repository structure should grow with real capabilities.

---

# NexusContent Core

Core must remain provider independent.

It must not contain WordPress, Strapi, Astro, cPanel, Vercel, or other platform specific implementation logic.

Core is responsible for:

* content contracts
* provider contracts
* provider registration
* provider resolution
* configuration
* normalized content
* errors
* content retrieval

Core never assumes the consuming application is an Astro project.

Core works in any JavaScript runtime where its dependencies can run.

---

# Normalized Content

Every provider returns normalized NexusContent objects.

A provider must never expose its native API response as the public NexusContent API.

Initial types may look similar to:

```ts
export type ContentSource = string;

export interface MediaAsset {
  id?: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export interface SeoRobots {
  index?: boolean;
  follow?: boolean;
}

export interface SeoOpenGraph {
  title?: string;
  description?: string;
  image?: MediaAsset;
  type?: string;
}

export interface SeoTwitter {
  card?: "summary" | "summary_large_image";
  title?: string;
  description?: string;
  image?: MediaAsset;
}

export interface SeoData {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  /** @deprecated Use `canonicalUrl` instead. */
  canonical?: string;
  robots?: SeoRobots;
  openGraph?: SeoOpenGraph;
  twitter?: SeoTwitter;
  structuredData?: JsonObject[];
}

export interface ContentMeta {
  source: ContentSource;
  sourceId?: string;
  updatedAt?: string;
}

export interface PageContent<TData = Record<string, unknown>> {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  seo?: SeoData;
  data: TData;
  meta: ContentMeta;
}

export interface CollectionItem<TData = Record<string, unknown>> {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  data: TData;
  meta: ContentMeta;
}
```

The generic `data` property is intentional.

NexusContent must not assume that every page has the same structure.

A homepage may contain:

```text
hero
services
testimonials
cta
```

while a contact page may contain:

```text
intro
contactDetails
locations
form
```

The content provider supplies normalized content.

The consuming project determines the page specific schema.

---

# SEO Foundations

Version `0.1.4` gives providers and consumers one normalized SEO contract. Core owns the data types, validation, and deterministic resolution. Providers map source-specific fields into that contract. Consumers such as Astro own HTML rendering, canonical URL construction, and deployment-specific decisions.

`PageContent.seo` remains optional. Pages without SEO continue to validate and resolve normally.

## Public contract

The public API exports `SeoData`, `SeoRobots`, `SeoOpenGraph`, `SeoTwitter`, `JsonObject`, `JsonValue`, `ResolveSeoInput`, `SeoDefaults`, and `resolveSeo`.

```ts
export interface ResolveSeoInput {
  seo?: SeoData;
  title?: string;
  excerpt?: string;
  summary?: string;
  featuredImage?: MediaAsset;
}

export interface SeoDefaults {
  siteTitle?: string;
  defaultImage?: MediaAsset;
}

export function resolveSeo(
  input: ResolveSeoInput,
  defaults?: SeoDefaults
): SeoData;
```

```ts
import { resolveSeo } from "@nexuscontent/core";
import type { MediaAsset, SeoData } from "@nexuscontent/core";

const seo: SeoData = resolveSeo(
  {
    seo: page.seo,
    title: page.title,
    excerpt: page.data.excerpt,
    summary: page.data.summary,
    featuredImage: page.data.featuredImage as MediaAsset | undefined
  },
  {
    siteTitle: "Example Site",
    defaultImage: { url: "https://example.com/default-social.jpg" }
  }
);
```

`resolveSeo` is pure: it does not mutate its input and omits unavailable fields. It uses nullish fallback semantics, so an explicit empty string is preserved.

Partial `openGraph` and `twitter` sub-objects receive field-level fallbacks. For example, `{ openGraph: { title: "X" } }` preserves that title while description and image resolve from the page inputs and site defaults when available.

## Exact fallback order

Resolution is deterministic:

1. Title: `seo.title` → `input.title` → `defaults.siteTitle`.
2. Description: `seo.description` → `input.excerpt` → `input.summary`.
3. Canonical URL: `seo.canonicalUrl` → deprecated `seo.canonical`.
4. Open Graph title: `seo.openGraph.title` → resolved title.
5. Open Graph description: `seo.openGraph.description` → resolved description.
6. Open Graph image: `seo.openGraph.image` → `input.featuredImage` → `defaults.defaultImage`.
7. Twitter title: `seo.twitter.title` → resolved Open Graph title → resolved title.
8. Twitter description: `seo.twitter.description` → resolved Open Graph description → resolved description.
9. Twitter image: `seo.twitter.image` → resolved Open Graph image.

`robots`, Open Graph `type`, Twitter `card`, and `structuredData` have no inferred defaults. The only site defaults are `siteTitle` and `defaultImage`.

## Provider mapping

Providers must stop source-specific SEO structures at the provider boundary. Git JSON can provide the normalized shape directly:

```json
{
  "title": "About",
  "seo": {
    "title": "About Example Co",
    "canonicalUrl": "https://example.com/about/",
    "robots": { "index": true, "follow": true },
    "openGraph": { "type": "website" }
  },
  "hero": { "heading": "About Example Co" }
}
```

An API provider maps its native response rather than exposing it:

```ts
const page: PageContent = {
  id: source.id,
  key,
  title: source.heading,
  seo: {
    title: source.metadata.seoTitle,
    description: source.metadata.seoDescription,
    canonicalUrl: source.metadata.canonicalUrl,
    openGraph: {
      image: source.metadata.socialImage
        ? { url: source.metadata.socialImage.url }
        : undefined
    }
  },
  data: mapPageData(source),
  meta: { source: providerName, sourceId: source.id }
};
```

Normalized validation checks URL, robots, social, media, Twitter card, and structured-data fields. `structuredData` must be an array of plain JSON-compatible objects: no functions, `undefined`, symbols, `bigint`, non-finite numbers, class instances, dates, or circular references.

## Complete Astro usage

Resolve SEO in the page, pass it through the layout, and render it in a consumer-owned component:

```astro
---
import { resolveSeo } from "@nexuscontent/core";
import type { MediaAsset } from "@nexuscontent/core";
import BaseLayout from "../layouts/BaseLayout.astro";

const page = await nexus.getPage<{
  summary?: string;
  featuredImage?: MediaAsset;
}>("about");
if (!page) throw new Error("Required content was not found.");

const seo = resolveSeo(
  {
    title: page.title,
    summary: page.data.summary,
    featuredImage: page.data.featuredImage,
    seo: {
      ...page.seo,
      canonicalUrl: new URL("/about/", siteUrl).href
    }
  },
  { siteTitle: "Example Site", defaultImage: { url: `${siteUrl}/social.jpg` } }
);
---

<BaseLayout seo={seo}>
  <h1>{page.title}</h1>
</BaseLayout>
```

The layout places the component in `<head>`:

```astro
---
import NexusSeo from "../components/NexusSeo.astro";
const { seo } = Astro.props;
---
<html lang="en">
  <head>
    <NexusSeo seo={seo} />
  </head>
  <body><slot /></body>
</html>
```

The consumer component renders the normalized contract:

```astro
---
import type { SeoData } from "@nexuscontent/core";
import { serializeJsonLd } from "../app/serialize-json-ld";

const { seo } = Astro.props as { seo: SeoData };
const robots = [
  seo.robots?.index === undefined ? undefined : seo.robots.index ? "index" : "noindex",
  seo.robots?.follow === undefined ? undefined : seo.robots.follow ? "follow" : "nofollow"
].filter(Boolean).join(", ");
---
{seo.title !== undefined && <title>{seo.title}</title>}
{seo.description !== undefined && <meta name="description" content={seo.description} />}
{seo.canonicalUrl && <link rel="canonical" href={seo.canonicalUrl} />}
{robots && <meta name="robots" content={robots} />}
{seo.openGraph?.title && <meta property="og:title" content={seo.openGraph.title} />}
{seo.openGraph?.description && <meta property="og:description" content={seo.openGraph.description} />}
{seo.openGraph?.image && <meta property="og:image" content={seo.openGraph.image.url} />}
{seo.openGraph?.type && <meta property="og:type" content={seo.openGraph.type} />}
{seo.twitter?.card && <meta name="twitter:card" content={seo.twitter.card} />}
{seo.twitter?.title && <meta name="twitter:title" content={seo.twitter.title} />}
{seo.twitter?.description && <meta name="twitter:description" content={seo.twitter.description} />}
{seo.twitter?.image && <meta name="twitter:image" content={seo.twitter.image.url} />}
{seo.structuredData?.map((value) => (
  <script type="application/ld+json" is:inline set:html={serializeJsonLd(value)} />
))}
```

JSON-LD inserted with `set:html` must be script-safe. The reference consumer escapes `<`, `>`, `&`, U+2028, and U+2029 after `JSON.stringify`:

```ts
export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) =>
    ({ "<": "\\u003c", ">": "\\u003e", "&": "\\u0026", "\u2028": "\\u2028", "\u2029": "\\u2029" })[character]!
  );
}
```

Do not insert unescaped external JSON into an inline script.

## Exclusions and migration

NexusContent does not infer canonical URLs or deployment hosts. It does not generate sitemaps, robots.txt, redirects, keywords, analytics, or scraped metadata. Provider-specific SEO plugin mappings belong in providers, not Core. Framework metadata components remain consumer code and are not exported by the package.

For `0.1.3` consumers, no change is required when `seo` is absent. Existing `seo.canonical` input still resolves, but it is deprecated: rename it to `seo.canonicalUrl`. Consumers can adopt `resolveSeo` incrementally and continue rendering metadata themselves.

---

# Content Provenance

Normalized content should retain information about where it came from.

Example:

```json
{
  "meta": {
    "source": "wordpress",
    "sourceId": "184",
    "updatedAt": "2026-08-14T10:30:00Z"
  }
}
```

Or:

```json
{
  "meta": {
    "source": "git",
    "sourceId": "pages/about.json"
  }
}
```

This improves:

* debugging
* logging
* synchronization
* auditing
* cache invalidation
* future preview workflows

---

# Provider Contract

All providers must implement the same core interface.

Initial contract:

```ts
export interface ContentProvider {
  readonly name: string;

  getPage<TData = Record<string, unknown>>(
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<PageContent<TData> | null>;

  getSingleton<TData = Record<string, unknown>>(
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<SingletonContent<TData> | null>;

  getNavigation(
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<NavigationContent | null>;

  getSettings<TData = Record<string, unknown>>(
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<SettingsContent<TData> | null>;

  getCollection<TData = Record<string, unknown>>(
    collection: string,
    options?: ProviderRetrievalOptions
  ): Promise<CollectionItem<TData>[]>;

  getItem<TData = Record<string, unknown>>(
    collection: string,
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<CollectionItem<TData> | null>;
}
```

Providers may internally use:

* REST
* GraphQL
* filesystem access
* Git
* databases
* SDKs

Core must not care.

---

# Provider Registry

Providers are registered with NexusContent.

Example:

```ts
nexus.register(
  "primary",
  new StrapiProvider(...)
);
```

Another provider:

```ts
nexus.register(
  "legacy",
  new WordPressProvider(...)
);
```

Multiple instances of the same provider type must be possible.

For example:

```text
primaryWordPress
newsWordPress
legacyWordPress
```

This is why provider names and provider types are separate concepts.

---

# Configuration

Projects should declare their content architecture explicitly.

Example:

```ts
export const nexusConfig = {
  providers: {
    primary: {
      type: "strapi"
    },

    marketing: {
      type: "git"
    }
  },

  content: {
    home: {
      provider: "marketing",
      key: "home"
    },

    about: {
      provider: "marketing",
      key: "about"
    },

    services: {
      provider: "primary",
      key: "services"
    }
  },

  navigation: {
    primary: {
      provider: "marketing",
      key: "primary"
    }
  },

  settings: {
    site: {
      provider: "marketing",
      key: "site"
    }
  }
};
```

The configuration determines:

```text
Content Name
     ↓
Provider
     ↓
Provider Content Key
```

It does not create application routes.

---

# Localisation

Locale-aware content resolution is optional.

Projects that do not configure locales keep the exact legacy flat retrieval behaviour.

Configure locales on the NexusContent configuration:

```ts
const nexus = new NexusContent({
  locales: {
    default: "en-ZA",
    supported: ["en-ZA", "zu-ZA", "af"],
    fallback: {
      "zu-ZA": "en-ZA",
      af: "en-ZA"
    }
  }
  // providers and content as usual
});
```

`default` must be one of `supported`. The optional `fallback` map defines a per-locale fallback chain; a value of `null` terminates fallback for that locale. When `fallback` is absent, a locale falls back to `default`.

Per-request options select a locale and control fallback:

```ts
const page = await nexus.getPage("home", { locale: "zu-ZA" });
```

`fallback` defaults to `true`. Set `fallback: false` for strict retrieval; a missing variant then throws `MissingLocaleVariantError`. An unsupported locale throws `UnsupportedLocaleError` before any provider call.

The Git provider stores locale variants in locale directories:

```text
pages/
├── home.json
├── en-ZA/
│   └── home.json
└── zu-ZA/
    └── home.json
```

A request for `zu-ZA` resolves `pages/zu-ZA/home.json`. If it is missing and fallback is enabled, the provider tries `pages/en-ZA/home.json` through the fallback chain and finally the flat `pages/home.json`. The same layout applies to `singletons/`, `navigation/`, `settings/`, and `collections/<name>/<locale>/`. Resolved variants record `meta.locale`; flat fallbacks do not.

Translation workflows (state tracking, per-locale publishing, completeness reporting, and outdated detection) are not part of `0.1.3`. `TranslationState` and `LocaleVariantInfo` are typed extension points for a future workflow.

The localised Astro example (`examples/astro-basic-localised/`) demonstrates per-locale retrieval: every page is generated in English and French under `/en/` and `/fr/`, with translated navigation and site settings resolved through the same locale-aware calls. The single-locale example (`examples/astro-basic/`) demonstrates the flat retrieval path with no locale configuration.

---

# Content Service

Consumers should normally interact with NexusContent through the content service.

Examples:

```ts
const page = await nexus.getPage("about");
const singleton = await nexus.getSingleton("announcement");
const navigation = await nexus.getNavigation("primary");
const settings = await nexus.getSettings("site");
```

Internally:

```text
nexus.getPage("about")
        ↓
Read configuration
        ↓
Resolve provider
        ↓
provider.getPage()
        ↓
Normalize
        ↓
Validate
        ↓
Return content
```

The consumer should not need to know whether `about` came from Git, WordPress, Strapi, or another provider.

---

# Framework Neutrality

NexusContent Core is framework neutral.

It does not depend on Astro, Next.js, React, Vue, Svelte, or any frontend framework.

The same Core code runs inside:

```text
Astro
Next.js
React based frameworks
plain Node scripts
future JavaScript consumers
```

Core never assumes the consumer is:

* Astro
* a Next.js application
* a React application
* any other specific framework

Bad:

```ts
import { Astro } from "astro";
```

inside NexusContent Core or a content provider.

Core deals with content.

Consumers deal with presentation.

The consumer imports NexusContent.

NexusContent does not import the consumer's framework.

Framework specific integration code belongs in the consuming application, not in Core.

A project that wants a NexusContent integration for a new framework should build that integration in the consuming application.

---

# Consumer Example

Every consumer uses the same NexusContent API.

First install the package:

```text
npm install @nexuscontent/core
```

### Astro

```astro
---
import { NexusContent } from "@nexuscontent/core";
import AboutHero from "../components/AboutHero.astro";
import CompanyStory from "../components/CompanyStory.astro";

const nexus = new NexusContent(config);
const page = await nexus.getPage("about");

if (!page) {
  throw new Error("About content was not found.");
}

const content = page.data;
---

<AboutHero {...content.hero} />

<CompanyStory {...content.story} />
```

### Plain Node

```js
import { NexusContent } from "@nexuscontent/core";

const nexus = new NexusContent(config);

const about = await nexus.getPage("about");
const projects = await nexus.getCollection("projects");
const project = await nexus.getItem("projects", "project-one");

console.log(about.title);
console.log(projects.length);
console.log(project.title);
```

The Astro page and the Node script call the same methods.

No provider code is imported in either consumer.

The reference examples live under `examples/`:

* `examples/astro-basic/` proves consumption inside an Astro static build for a single locale.
* `examples/astro-basic-localised/` proves the same build with locale-prefixed routes in English and French.
* `examples/astro-wordpress/` proves published WordPress page and post consumption in an Astro static build.
* `examples/node-basic/` proves consumption from a plain Node process.

---

# Astro Examples

The Astro reference examples prove NexusContent consumption inside an Astro static build.

Two Astro examples are provided so the localisation progression is visible:

* `examples/astro-basic/` is a single-locale site. It reads flat content (no locale configuration) and serves English routes directly at the root.
* `examples/astro-basic-localised/` adds localisation. The same site is generated in English and French under locale-prefixed routes, and the root `/` redirects to the default locale.

The two examples are intentionally separate so each demonstrates one concern without the other.

## Single-locale example

Astro routes remain explicit:

```text
src/pages/
├── index.astro              # home
├── about.astro
├── services.astro
├── contact.astro
└── blog/
    ├── index.astro
    └── [slug].astro
```

Pages request content without any locale options:

```ts
const page = await getPageContent("about");
```

## Localised example

Astro routes remain explicit, with one variant per locale:

```text
src/pages/
├── index.astro              # redirects to /en/
└── [locale]/
    ├── index.astro          # home
    ├── about.astro
    ├── services.astro
    ├── contact.astro
    └── blog/
        ├── index.astro
        └── [slug].astro
```

Every page requests its content with the active locale:

```ts
const page = await getPageContent("about", { locale });
```

Navigation, settings, and collection content are resolved the same way. Internal content hrefs stay locale-relative and are localized by the application at render time because routing belongs to the consumer.

In both examples the page controls composition.

NexusContent supplies data.

No Astro page or component calls a provider directly.

---

# No Generic Section Renderer by Default

NexusContent does not require a universal section renderer.

For normal websites, explicit composition is preferred.

Example (Astro):

```astro
<Hero {...content.hero} />
<Services {...content.services} />
<Testimonials {...content.testimonials} />
<CTA {...content.cta} />
```

This keeps page structure obvious.

A dynamic section registry may be implemented by an individual project if that project genuinely requires CMS controlled section ordering.

It is not part of NexusContent Core.

---

# Git Content Provider

The Git provider is the first provider to be implemented.

Its purpose is to prove the provider architecture without introducing an external CMS dependency.

The recommended production model is a separate content repository.

Example:

```text
GitHub

company-website/
    Application

company-content/
    Content
```

The content repository may contain:

```text
company-content/
│
├── pages/
│   ├── home.json
│   ├── about.json
│   ├── services.json
│   └── contact.json
│
├── collections/
│   ├── team/
│   ├── testimonials/
│   └── faqs/
│
├── navigation/
│   └── main.json
│
└── settings/
    └── site.json
```

During development or CI, the content repository becomes available through a configured path.

Example:

```env
NEXUS_GIT_CONTENT_PATH=../company-content
```

The Git provider reads from that location.

The application must not assume the content repository exists inside `src`.

### GitHub-hosted content repository

The reference flow keeps editable content in a separate GitHub repository and
reads it from a local clone at build time. Retrieval never runs Git commands;
cloning and pulling are the synchronization step, performed by CI, deployment
tooling, or a developer before the build.

Tested flow:

```bash
# 1. Content lives in its own repository on GitHub.
# 2. Clone it beside the application repository.
git clone https://github.com/<org>/company-content.git ../company-content

# 3. Point the Git provider at the content directory inside the clone.
#    In the example this is done through a local .env file:
NEXUS_GIT_CONTENT_PATH=../company-content/content

# 4. Build. NexusContent reads the cloned content.
npm run build

# 5. Editors push content changes to GitHub; the build machine pulls before building.
git -C ../company-content pull
```

The `examples/astro-basic-localised/` example was tested against a real
GitHub-hosted content repository: a fresh clone of
`https://github.com/clearstorm/nexuscontent-demo-content` produced the same
17 built pages, confirming GitHub as the source of truth.

## Node requirement

The Git provider uses Node filesystem APIs.

This constraint is specific to the Git provider.

Core itself does not assume a Node runtime.

Future providers may target other JavaScript runtimes.

---

# Why a Separate Content Repository

This provides actual separation between application code and editable content.

```text
Application Repository
        │
        └── developers

Content Repository
        │
        └── content workflow
```

Benefits include:

* independent content history
* independent permissions
* content rollback
* cleaner application repository
* CMS interfaces can manage content without exposing application code
* content changes can trigger builds independently
* application deployments do not require content authors to understand Git

---

# Git Backed Editing

A Git repository does not mean editors should edit JSON manually.

A Git backed CMS or editing interface can sit above the repository.

NexusContent integrates with the content source, not necessarily the editing interface.

Expected workflow:

```text
Content Editor
      ↓
Editing UI
      ↓
Git Content Repository
      ↓
Webhook or Git Event
      ↓
Build
      ↓
Deployment
```

The specific editing product is not part of NexusContent Core.

The next section explains how Git based CMS editing systems map onto the NexusContent Git provider.

---

# Git Based CMS Compatibility

NexusContent does not need a dedicated provider for every Git based CMS.

A Git based CMS is an editing layer.

The Git repository is the content source.

NexusContent reads the content repository through its Git provider.

```text
                Editing Layer

      Git CMS A   Git CMS B   Custom UI
          |           |           |
          +-----------+-----------+
                      |
                      v
                Git Repository
                      |
                      v
            NexusContent Git Provider
                      |
                      v
               NexusContent Core
                      |
                      v
              Consumer Application
```

Examples of Git based editing systems include Decap CMS and TinaCMS when they operate against repository files, and Git based workflows of other headless CMS platforms.

NexusContent does not claim complete compatibility with any particular product.

Compatibility depends on whether the editing system can maintain files in the NexusContent compatible repository structure and format.

## Editing Layer vs Content Source

Four distinct roles exist in this architecture:

```text
Editing Layer       Git based CMS, custom editorial UI
Content Source      Git content repository
Content Provider    NexusContent Git provider
Consumer            Astro, Node, future consumers
```

The editing layer and the content provider never interact directly.

The editing layer writes files.

The provider reads files.

The Git provider does not care which editor created or modified the files.

## The Compatibility Contract

A Git based CMS is compatible with the NexusContent Git provider when it can maintain files matching the content structure and file formats supported by that provider.

For the `0.1.x` milestones, the baseline contract is deliberately small:

```text
UTF-8 JSON
external content directories
pages
collections
individual collection items
stable file paths
normalized NexusContent output
```

## Supported Content Format

The NexusContent Git provider currently supports JSON content.

Parsing and serialization is isolated behind an internal format adapter so the provider never depends on how a file format is handled.

Git based CMS platforms are compatible when configured to maintain content using the supported NexusContent repository structure and file format.

Markdown with frontmatter, YAML, and MDX are future possibilities.

They are not supported in the `0.1.x` milestones.

Do not assume unsupported formats work.

## Git Is Versioning, Filesystem Is Retrieval

At build or runtime, the Git provider reads files from a filesystem.

Git itself provides version history, collaboration, change tracking, rollback, and content publishing workflows.

The provider does not execute Git commands merely to retrieve content.

Repository synchronization belongs to CI, deployment tooling, the editing system, or a future explicitly designed synchronization capability.

## External Content Repository

The content repository may be:

```text
a sibling Git repository
a CI checkout
a Git submodule
a mounted directory
another explicitly configured filesystem location
```

NexusContent does not require any particular Git hosting provider.

GitHub, GitLab, and Bitbucket are all hosted Git services.

None of them are hardcoded into the Git provider.

## CMS Metadata and Configuration Files

A Git based CMS may create its own files:

```text
admin/
CMS configuration
editor metadata
README files
CI configuration
```

The Git provider only reads convention based NexusContent locations:

```text
pages/
singletons/
navigation/
settings/
collections/
```

Everything else in the repository is ignored.

## Navigation and Settings

Navigation and settings are first-class provider-neutral content operations. Git stores them in dedicated directories while arbitrary singleton content remains available under `singletons/`:

```text
singletons/<key>.json
navigation/<key>.json
settings/<key>.json
```

Consumers configure logical navigation and settings names in separate maps and retrieve them through dedicated methods:

```ts
const nexus = new NexusContent({
  providers: {
    content: { type: "git", options: { contentPath: "../client-content" } }
  },
  content: {
    announcement: { provider: "content", key: "announcement" }
  },
  navigation: {
    primary: { provider: "content", key: "primary" }
  },
  settings: {
    site: { provider: "content", key: "site" }
  }
});

const announcement = await nexus.getSingleton("announcement");
const navigation = await nexus.getNavigation("primary");
const settings = await nexus.getSettings("site");
```

`NavigationContent` exposes a direct `items` array. Each `NavigationItem` requires `label` and `href` and may contain recursive `children`. `SettingsContent<TData>` keeps provider-neutral settings under generic `data` so consumers can apply project-level schemas.

## CMS Configuration vs NexusContent Configuration

A Git based CMS requires its own configuration:

```text
collection definitions
editor fields
authentication settings
Git backend settings
media paths
```

That configuration describes how editors edit content.

NexusContent configuration describes how applications consume content.

They are separate and must not be merged in the `0.1.x` milestones.

## Media

Media references may exist inside JSON content.

The actual media strategy varies by consumer:

```text
public repository assets
external CDN
object storage
CMS managed media
remote URLs
```

NexusContent may normalize media metadata where appropriate.

It does not provide image upload or Git media management.

## Publishing Workflow

```text
Editor
   |
   v
Git based CMS
   |
   v
Commit or pull request
   |
   v
Git content repository
   |
   v
Build trigger
   |
   v
Consumer build
   |
   v
NexusContent reads latest content
   |
   v
Website generated
   |
   v
Deployment
```

NexusContent itself does not create commits.

## Staging Compatibility

Git based content naturally supports staging workflows.

```text
Editor
   |
   v
CMS editing workflow
   |
   v
staging branch
   |
   v
staging build
   |
   v
review
   |
   v
merge to production branch
   |
   v
production build
```

Branch names are never hardcoded into Core.

Branch management belongs to Git and CI workflows.

NexusContent consumes whichever content checkout the build environment provides.

## Deployment Neutrality

Git CMS support does not assume a deployment platform.

The frontend may be deployed to cPanel, Vercel, Cloudflare, Netlify, or any other host.

Future consumers such as Next.js, TanStack, or plain Node applications may use the same Git content architecture.

The Git provider contains no deployment logic.

## When a Dedicated Provider Is Needed

```text
CMS stores content as supported Git files
        |
        v
Use the Git Provider


CMS requires proprietary API access
        |
        v
Consider a dedicated Provider
```

A dedicated provider is justified only when NexusContent must communicate with a CMS specific API or capability that cannot reasonably be represented through the Git content provider.

The existence of a different editing interface is not a justification.

---

# WordPress Provider

Version `0.2.0` includes a framework-neutral, read-only provider for the standard WordPress REST API. WordPress remains the editorial system and database owner; the provider fetches and normalizes source responses; Core coordinates and validates retrieval; consumers own routes, rendering, HTML trust decisions, and deployment.

```text
WordPress Admin -> WordPress Database -> WordPress REST API
                                            |
                                            v
                                NexusContent WordPress Provider
                                            |
                                            v
                                    NexusContent Core
                                            |
                                            v
                                  Consumer Application
```

## Plain TypeScript usage

Pass the complete REST API root, including `/wp-json/wp/v2`, then register the provider under the same name used by the content configuration:

```ts
import {
  NexusContent,
  WordPressProvider,
  type WordPressContentData
} from "@nexuscontent/core";

const wordpress = new WordPressProvider({
  baseUrl: "https://wordpress.example.com/wp-json/wp/v2"
});

const nexus = new NexusContent({
  providers: {
    wordpress: {
      type: "wordpress",
      options: {
        baseUrl: "https://wordpress.example.com/wp-json/wp/v2"
      }
    }
  },
  content: {
    home: { provider: "wordpress", key: "home" },
    posts: { provider: "wordpress", key: "posts" }
  }
});

nexus.register("wordpress", wordpress);

const home = await nexus.getPage<WordPressContentData>("home");
const posts = await nexus.getCollection<WordPressContentData>("posts");
const post = await nexus.getItem<WordPressContentData>("posts", "hello-world");
```

`providers` records architecture metadata; provider instances are registered explicitly. `getPage("home")` resolves the configured key `home` and queries the WordPress `pages` endpoint by slug. `getCollection("posts")` uses the built-in posts mapping, and `getItem("posts", "hello-world")` looks up one post by slug.

## Options and URL rules

```ts
export interface WordPressProviderOptions {
  baseUrl: string;
  name?: string; // default: "wordpress"
  headers?: Record<string, string>; // default: {}
  collections?: Record<string, { endpoint: string }>; // default: posts only
  perPage?: number; // default: 100; valid range: 1..100
  maxPages?: number; // default: 100; positive integer
  timeoutMs?: number; // default: 10000; positive integer
  editorMode?: "visual" | "code" | "blocks"; // default: "blocks"
  apiStrategy?: "rest-v2" | "rest-v1" | "application-password"; // default: "rest-v2"
  unknownContentPolicy?: "ignore" | "throw"; // default: "ignore"
  mediaResolution?: "embed" | "fetch" | "off"; // default: "embed"
  acf?: { enabled: boolean; fieldPrefix?: string }; // default: { enabled: true }
  fixedSections?: Partial<Record<string, { visible: boolean; background?: string; containerClass?: string }>>;
  customSections?: ReadonlyArray<SectionDefinition>;
  sectionRegistry?: SectionRegistry;
}
```

`baseUrl` must be a complete absolute `http:` or `https:` REST root such as `https://wordpress.example.com/wp-json/wp/v2`. A site homepage such as `https://wordpress.example.com` is not sufficient. Credentials, query strings, and fragments are rejected in `baseUrl`; HTTPS is recommended outside local development.

Custom collection endpoints are relative endpoint paths, not URLs. They may contain safe path segments such as `library/books`, but cannot be absolute, empty, traversing, or include query strings. The provider appends endpoints and owns query parameters.

## Pages, posts, and custom post types

Pages map through `GET pages?slug=<key>&per_page=1&status=publish`. A missing page returns `null`; more than one result is treated as an ambiguous provider error. The normalized page keeps the logical configured key while retaining the WordPress slug separately.

`posts` is available without extra configuration. Collections return `[]` when WordPress reports zero items, and individual missing items return `null`. Unknown collection names throw instead of guessing endpoints.

REST-exposed custom post types must be mapped explicitly:

```ts
const wordpress = new WordPressProvider({
  baseUrl: "https://wordpress.example.com/wp-json/wp/v2",
  collections: {
    books: { endpoint: "books" },
    library: { endpoint: "library/books" }
  }
});
```

The logical collection name maps to the configured REST endpoint. NexusContent does not discover custom post types.

## Pagination and failures

Collection retrieval requests page 1 and reads `X-WP-Total` and `X-WP-TotalPages`. It validates those totals against `perPage`, fetches remaining pages sequentially in page order, and verifies every page size and repeated total. Missing, malformed, changing, or inconsistent headers throw a `ProviderError`.

If WordPress reports more pages than `maxPages`, retrieval throws after the first request. It never returns a silently truncated collection. HTTP failures, network failures, timeouts, invalid JSON, invalid lookup shapes, and invalid published entry structures also produce actionable provider errors with provider, operation, and content context.

## Normalized WordPress data

The public `WordPressContentData` shape is:

```ts
interface WordPressContentData {
  content: string;
  excerpt?: string;
  publishedAt?: string;
  modifiedAt?: string;
  url?: string;
  authorId?: number;
  featuredMediaId?: number;
  categories?: number[];
  tags?: number[];
  fields?: Record<string, unknown>;
  featuredImage?: MediaAsset;
}
```

The normalized top-level `title` preserves `title.rendered` exactly, including HTML entities. `data.content` and `data.excerpt` likewise preserve WordPress rendered strings. NexusContent does not decode entities, convert shortcodes, interpret Gutenberg blocks, or sanitize rendered HTML. Rendered HTML is external input: a consumer using `set:html`, `innerHTML`, or an equivalent API must trust it or sanitize it according to the application's security policy.

When present as a plain object, ACF REST data is exposed as `data.fields`; ACF is not required by the base provider. Category, tag, and author relationships remain numeric IDs rather than expanded objects. The provider does not implement a taxonomy cache.

Every page, collection, and item REST request asks WordPress for `_embed=wp:featuredmedia`. Basic embedded media is normalized to `featuredImage` with string `id`, `url`, and available `alt`, `width`, and `height`; the original numeric `featured_media` is retained as `featuredMediaId`. Embedding increases response size and WordPress processing cost, and the provider does not synchronize media.

The base provider does not map Yoast, Rank Math, or other plugin SEO fields. Consumers can build deterministic baseline metadata from normalized title, excerpt, and featured image:

```ts
import { resolveSeo } from "@nexuscontent/core";

const seo = resolveSeo({
  title: post?.title,
  excerpt: post?.data.excerpt,
  featuredImage: post?.data.featuredImage
});
```

## Authentication and secrets

Authentication is supplied explicitly through `headers`, for example an `Authorization` header obtained by the consuming application from its secret store:

```ts
const wordpress = new WordPressProvider({
  baseUrl: "https://wordpress.example.com/wp-json/wp/v2",
  headers: { Authorization: `Bearer ${token}` }
});
```

The provider and Core do not read environment variables. Consumers decide how configuration is populated. Never put credentials in `baseUrl`, client-side bundles, committed files, logs, or public environment variables. Provider errors report status and endpoint context without printing request headers or their values.

## Unsupported operations and localisation

The base provider returns `null` from `getSingleton`, `getNavigation`, and `getSettings`. It accepts the shared `ProviderRetrievalOptions` contract but ignores locale options. It is plugin-neutral and does not require or integrate with WPML, Polylang, or another WordPress localisation plugin.

`examples/astro-wordpress/` demonstrates explicit `/`, `/blog/`, and `/blog/[slug]/` routes. Automated Astro builds exercise the example against a deterministic local REST server, and a plain Node compatibility test proves WordPress retrieval without Astro.

## Scope and limitations

The `0.2.0` provider supports public or header-authenticated reads of published pages, posts, and configured REST custom post types. It does not implement:

- draft preview or private-status workflows
- webhooks, synchronization, or mutations
- shortcode conversion or a Gutenberg block renderer
- taxonomy caching or media synchronization
- Yoast, Rank Math, or other plugin SEO mapping
- WPML, Polylang, or other WordPress localisation-plugin behavior
- custom post type or endpoint discovery
- WooCommerce-specific behavior
- verified WordPress multisite behavior
- retries or response caching

WordPress response objects stop at the provider boundary. Core remains unaware of WordPress, and framework rendering remains consumer-owned.

## Public exports

The package root exports `WordPressProvider` and the `WordPressProviderOptions`, `WordPressProviderFacingCapabilities`, and `WordPressContentData` types. Phase 1 adds configuration enums, section registry utilities, companion wire contract types and Zod validation schemas, typed error codes, and provider capabilities.

---

# Strapi Provider

Strapi will be treated as a first class structured CMS provider.

Expected architecture:

```text
Strapi
   ↓
REST API
   ↓
Strapi Provider
   ↓
NexusContent
   ↓
Consumer
```

The Strapi provider will be responsible for:

* API communication
* authentication
* collection retrieval
* single type retrieval
* media normalization
* pagination
* error handling
* Strapi specific normalization

---

# Future Providers

The architecture should make additional providers possible without changing NexusContent Core.

Potential future integrations include:

```text
Directus
Sanity
Contentful
Payload
DatoCMS
Storyblok
Custom APIs
Database providers
```

New providers must implement the NexusContent provider contract.

---

# Validation

Content must be validated before it is trusted by the application.

Validation has two levels.

## Provider Level Validation

Ensures the provider returned valid normalized NexusContent data.

## Project Level Validation

Ensures content matches the specific website schema.

For example, the About page may require:

```ts
{
  hero: {
    heading: string;
    intro: string;
  };

  story: {
    heading: string;
    content: string;
  };
}
```

A project should be able to validate this schema before rendering or deployment.

Invalid required content should fail clearly rather than silently generating a broken website.

---

# Error Handling

NexusContent must provide useful errors.

Errors should identify:

* provider
* requested content
* operation
* underlying reason

Example:

```text
NexusContentError

Provider: primary
Operation: getPage
Content: about
Reason: HTTP 401 from Strapi
```

Do not hide provider failures behind generic messages such as:

```text
Something went wrong.
```

Build logs must help developers find the problem quickly.

---

# Missing Content

Required content should normally fail the build.

For example:

```ts
const page = await nexus.getPage("about");

if (!page) {
  throw new Error(
    'Required content "about" was not found.'
  );
}
```

NexusContent should not silently publish incomplete websites.

Optional content should be handled explicitly by the application.

---

# Media

Media is part of content but requires normalization.

A normalized media object may look like:

```ts
interface MediaAsset {
  id?: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}
```

The source URL may originate from:

```text
WordPress
Strapi
Git content
CDN
Object storage
```

Astro components should not contain CMS specific media URL logic.

The same applies to components in any consumer framework.

Media CDN decisions should remain configurable by the consuming application.

---

# Content Workflow

NexusContent should support two broad content strategies.

## Direct Content Mode

Content remains in the CMS.

```text
Editor
   ↓
CMS
   ↓
Publish
   ↓
Webhook
   ↓
Build
   ↓
NexusContent fetches CMS
   ↓
Generate website
   ↓
Deploy
```

The CMS remains the canonical content store.

---

## Synchronized Content Mode

Content is synchronized into a Git content repository.

```text
Editor
   ↓
CMS or Editing UI
   ↓
Content Sync
   ↓
Git Content Repository
   ↓
Build
   ↓
Deploy
```

This provides Git based content history and rollback.

NexusContent must not force every project to use the same strategy.

---

# Preview

Preview is a future NexusContent capability.

The intended workflow is:

```text
Editor
   ↓
Draft
   ↓
Preview request
   ↓
NexusContent
   ↓
Consumer frontend
   ↓
Real website design
```

Preview must not require the CMS to own the presentation layer.

Preview implementation will be designed after the provider architecture is stable.

---

# Content Synchronization

Synchronization is also a future capability.

Expected operations include:

```text
check
pull
delete
status
reset
```

The synchronization engine should eventually detect:

* new content
* modified content
* deleted content
* synchronization failures
* source timestamps
* content identifiers

Incremental synchronization should be preferred over unnecessary full synchronization.

---

# Webhooks

CMS and Git events may trigger builds or synchronization.

Expected flow:

```text
Content change
      ↓
Webhook
      ↓
Authentication
      ↓
Determine affected content
      ↓
Synchronize if required
      ↓
Validate
      ↓
Build
      ↓
Deploy
```

Webhook endpoints must be authenticated.

Public unauthenticated rebuild endpoints are not acceptable.

Webhook implementation is not part of the first milestone.

---

# Deployment

NexusContent Core is deployment independent.

It should work regardless of whether the consuming application is deployed to:

```text
cPanel
Vercel
Cloudflare
Netlify
Other hosting
```

The normal static build is:

```bash
npm run build
```

which produces:

```text
dist/
```

The deployment system decides what happens to that artifact.

NexusContent does not.

---

# cPanel

A cPanel deployment may use:

```text
GitHub
   ↓
GitHub Actions
   ↓
Build
   ↓
dist/
   ↓
SFTP
   ↓
cPanel
```

This belongs to the website deployment workflow, not NexusContent Core.

---

# Vercel

A Vercel deployment may use:

```text
GitHub
   ↓
Vercel
   ↓
Build
   ↓
Deployment
```

Again, no NexusContent Core changes should be required.

---

# Forms

Form handling is not a responsibility of NexusContent Core.

A website may use:

```text
Form
    ↓
Form API
    ↓
PHP or Node service
    ↓
SMTP or Email Provider
```

The form service should remain hosting independent.

NexusContent should not become a general backend framework.

---

# Security

Never commit:

* API tokens
* CMS passwords
* webhook secrets
* deployment credentials
* SMTP credentials
* SSH keys
* private API keys

Secrets must be provided through environment variables or the deployment platform's secret management system.

Providers must not log sensitive credentials.

---

# Environment Variables

Initial Git provider example:

```env
NEXUS_GIT_CONTENT_PATH=
```

Future provider variables may include:

```env
WORDPRESS_API_URL=
WORDPRESS_API_TOKEN=

STRAPI_API_URL=
STRAPI_API_TOKEN=
```

`.env.example` should document variables without containing secrets.

---

# Development Workflow

The initial developer workflow should be:

```text
Create feature branch
       ↓
Implement change
       ↓
Run tests
       ↓
Run type checks
       ↓
Build example project
       ↓
Open pull request
       ↓
CI
       ↓
Review
       ↓
Merge
```

Direct unreviewed changes to the primary branch should be avoided.

---

# CI

The initial GitHub Actions workflow should perform:

```text
Install dependencies
      ↓
Type check
      ↓
Tests
      ↓
Build package
      ↓
Build Astro examples
      ↓
Run plain Node compatibility example
```

CI should fail if any stage fails.

Deployment automation should be developed separately from core CI.

---

# Testing

Tests are required for core architectural behaviour.

Initial test coverage should include:

## Core

* provider registration
* duplicate provider handling
* missing provider errors
* content configuration resolution
* page retrieval
* collection retrieval
* missing content handling

## Git Provider

* loading valid JSON
* missing files
* malformed JSON
* collection loading
* normalization
* content provenance

## Validation

* valid content
* missing required fields
* invalid field types
* useful validation errors

## Framework Neutrality

* Core and provider code contains no framework imports
* Core works without Astro
* runtime dependencies do not include Astro or any frontend framework

The project should test behaviour, not implementation details.

---

# Package Architecture

NexusContent may eventually become a package family.

Possible future structure:

```text
@nexuscontent/core
@nexuscontent/git
@nexuscontent/wordpress
@nexuscontent/strapi
@nexuscontent/astro
@nexuscontent/cli
```

Do not split the repository into multiple packages during the first implementation unless there is a concrete technical reason.

Prove the architecture first.

Extract packages second.

---

# Potential CLI

A NexusContent CLI may eventually provide commands such as:

```bash
nexuscontent init

nexuscontent provider add wordpress

nexuscontent provider add strapi

nexuscontent content check

nexuscontent content pull

nexuscontent content validate

nexuscontent content status
```

The CLI is not part of the first milestone.

Core APIs must be stable before CLI abstractions are introduced.

---

# Current Milestone

The current internal milestone, version `0.2.1`, extends the WordPress provider with Phase 1 contracts. The `0.2.0` WordPress provider base was released internally on 2026-08-18. Phase 1 adds configuration validation, section registry, companion wire protocols, provider capabilities, diagnostics, and typed error codes without changing runtime retrieval semantics. No public package release has been made.

## Required

### Core

* normalized content types
* `ContentProvider` interface
* provider registry
* NexusContent configuration
* content service
* structured errors
* optional locale configuration and fallback-chain resolution
* normalized SEO types and deterministic `resolveSeo`
* `ContentSection<TData>`, `SectionSettings`, and `PageStatus` types for structured page sections

### Git Provider

* external content directory
* page loading
* collection loading
* item loading
* JSON support
* normalization
* provenance
* locale variant directories with flat-file fallback

### WordPress Provider

* published page lookup by slug
* posts and explicitly configured custom post types
* sequential, validated pagination
* rendered content, ACF field, relationship ID, and featured-media normalization
* actionable provider errors and explicit header authentication
* Astro and plain Node compatibility coverage
* configuration enums with constructor validation (editorMode, apiStrategy, unknownContentPolicy, mediaResolution)
* runtime section registry with 13 built-in sections, custom section support, and deterministic merge
* companion wire contract types and Zod validation schemas (page, pages, schema, sections, health)
* provider capabilities() method returning capability report
* 32 typed WordPress error codes organized by category
* generic `code` field on NexusContentErrorDetails and NexusContentError

### Validation

* runtime schema validation
* clear validation errors
* normalized SEO and JSON-compatible structured-data validation

### Astro Example

* explicit Astro routes
* NexusContent integration
* home page
* about page
* collection example
* no direct provider calls from Astro components
* localised variant with locale-prefixed routes in English and French
* consumer-owned metadata rendering with safely escaped JSON-LD

### Plain Node Compatibility

* runs the NexusContent public API from a plain Node script
* proves Core does not require Astro

### Engineering

* TypeScript
* tests
* CI
* documentation
* example content repository

---

# Not Part of Version 0.2.1

Do not implement the following during the current milestone:

* Strapi provider
* CMS webhooks
* preview
* synchronization engine
* deployment adapters
* cPanel integration
* Vercel integration
* Redis
* SQLite
* queues
* admin dashboard
* authentication system
* form backend
* visual page builder
* universal section renderer
* CLI
* translation workflows and per-locale publishing
* automatic canonical URL construction
* sitemap, robots.txt, redirects, metadata scraping, keyword analysis, or analytics
* provider-specific SEO plugin behavior in Core
* framework SEO rendering components in the public package
* WordPress preview, webhooks, mutations, retries, caching, or companion wire endpoint implementation
* WordPress shortcode conversion, Gutenberg rendering, taxonomy caching, or media synchronization
* WordPress plugin SEO, localisation-plugin integration, discovery, WooCommerce, or verified multisite support

These features come later.

The purpose of `0.2.0` is to add a practical WordPress REST boundary without moving CMS-specific behavior into Core or rendering into the provider.

---

# Roadmap

Release sequencing and milestone exit criteria are maintained in [ROADMAP.md](ROADMAP.md). Current feature status belongs in [FEATURES.md](FEATURES.md), not in the roadmap.

---

# Architectural Rules

These rules are non negotiable unless there is a documented reason to change them.

### Rule 1

The consuming application owns website routes.

### Rule 2

NexusContent Core does not depend on Astro or any other frontend framework.

### Rule 3

Content providers do not depend on any frontend framework.

### Rule 4

CMS specific data structures never leak into the public content API.

### Rule 5

Content providers implement a shared contract.

### Rule 6

Editable business content should normally live outside the application repository.

### Rule 7

Developer configuration may remain with application code.

### Rule 8

NexusContent does not become a CMS.

### Rule 9

NexusContent does not become a deployment framework.

### Rule 10

NexusContent does not dictate the website component architecture.

### Rule 11

Static generation remains the default.

### Rule 12

Do not add infrastructure until a real requirement justifies it.

---

# Design Test

Every proposed NexusContent feature should pass this question:

> Does this feature improve the boundary between content sources and content consumers?

If not, it probably belongs somewhere else.

For example:

```text
WordPress normalization
```

belongs in NexusContent.

```text
Button styling
```

does not.

```text
Content validation
```

belongs in NexusContent.

```text
Contact form email delivery
```

does not.

```text
Strapi provider
```

belongs in NexusContent.

```text
cPanel SFTP deployment
```

does not belong in Core.

This boundary is critical to keeping the project useful.

---

# Long Term Goal

NexusContent should eventually make this possible:

```ts
const page = await nexus.getPage("about");
```

without the consumer caring whether the data came from:

```text
Git
WordPress
Strapi
Directus
Sanity
Contentful
Payload
Custom REST API
```

The frontend asks for content.

NexusContent resolves how to obtain it.

That is the platform.

---

# License

NexusContent is licensed under the MIT License. See `LICENSE` for the full license text.

---

# Contributing

NexusContent is in early development.

Contribution guidelines will evolve with the project.

Until the public API stabilizes, architectural consistency is more important than feature count.

New contributions should:

* preserve provider independence
* preserve framework independence in Core
* include appropriate tests
* include documentation
* avoid unnecessary dependencies
* avoid provider specific logic in Core
* avoid premature abstractions

See `CONTRIBUTING.md` for contribution requirements once available.

---

# Summary

NexusContent exists to maintain a clean boundary:

```text
CONTENT
   ↓
NexusContent
   ↓
APPLICATION
   ↓
BUILD
   ↓
INFRASTRUCTURE
```

Content can change.

CMS platforms can change.

Hosting can change.

The consuming application should not need to be rebuilt architecturally every time one of those choices changes.

That separation is the reason NexusContent exists.
