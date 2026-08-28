# NexusContent Agent Engineering Guide

This file contains mandatory instructions for AI coding agents working on the NexusContent repository.

Read this file completely before creating, modifying, moving, or deleting code.

The project README explains what NexusContent is and how it is intended to be used.

This file defines how NexusContent must be engineered.

If implementation convenience conflicts with the architectural rules in this file, preserve the architecture unless the user explicitly instructs otherwise.

---

# 0. Project State Awareness

The root project tracking files are a coordinated system. They must remain concise, consistent, and synchronized with implementation reality.

## 0.1 Mandatory Agent Startup Sequence

Before modifying code, every coding agent must read, in order:

1. `PROJECT_STATUS.md`.
2. `FEATURES.md`.
3. `project.state.json`.
4. `AGENTS.md` completely.
5. The relevant section of `ROADMAP.md`.
6. `README.md` when project usage, identity, or public API is relevant.
7. Relevant implementation and tests only after understanding the documented state.

For substantial tasks, continue to read `package.json`, `tsconfig.json`, and the implementation, tests, examples, and CI files required by the change.

Do not infer implementation status solely from roadmap or README text. Verify current status using `FEATURES.md`, `project.state.json`, and the implementation and tests when necessary.

## 0.2 Documentation Responsibilities and Precedence

Use each file for its assigned responsibility:

- `README.md`: what NexusContent is and how it is used.
- `AGENTS.md`: how humans and AI agents must modify the project.
- `FEATURES.md`: authoritative human-readable feature status.
- `project.state.json`: authoritative machine-readable project state.
- `PROJECT_STATUS.md`: current focus, immediate next work, decisions, and constraints.
- `ROADMAP.md`: planned sequencing and milestone intent.
- `CHANGELOG.md`: historical released changes and current unreleased changes.

For disputes about whether a capability is actually implemented, tests and implementation are the final technical evidence. Correct the tracking files in the same pull request when they disagree with that evidence.

`FEATURES.md` and `project.state.json` must remain synchronized. Neither is generated; both are maintained deliberately.

## 0.3 Project State Synchronization

The project tracking system must be updated in the same pull request that changes feature status. State documentation is part of the implementation, not a later administrative task.

Apply these rules:

```text
Feature implemented:
    update FEATURES.md
    update project.state.json
    update PROJECT_STATUS.md if the current summary changes

Milestone changed:
    update PROJECT_STATUS.md
    update ROADMAP.md
    update project.state.json

Released:
    update CHANGELOG.md
    update package version
    update FEATURES.md introduced versions
    update project.state.json

Feature deferred or blocked:
    update FEATURES.md
    update project.state.json
    update ROADMAP.md if sequencing changes
```

Not every task requires every state file. Update only the documents whose assigned responsibility changed.

## 0.4 Status Vocabulary and Transitions

Formal feature statuses are exactly:

```text
implemented
in_progress
planned
blocked
deferred
```

Do not substitute informal terms such as `done`, `complete`, `coming soon`, or `later` as status values.

Typical transition:

```text
planned -> in_progress -> implemented
```

Other allowed transitions:

```text
planned -> deferred
planned -> blocked
in_progress -> blocked
blocked -> in_progress
deferred -> planned
```

A direct `planned -> implemented` transition is valid only when the implementation and all required verification were completed in the same change. Never mark a feature `implemented` merely because it appears in `README.md`, `ROADMAP.md`, an issue, a prototype, or incomplete code.

Use `blocked` only when an identifiable blocker is documented in the feature Notes. Low-priority work remains `planned` or becomes `deferred`.

Use `deferred` when the project deliberately excludes a feature from the current foreseeable milestone. Deferred does not mean permanently rejected.

## 0.5 Definition of Implemented

A feature may be marked `implemented` only when:

1. Required code exists.
2. Applicable tests exist.
3. Tests pass.
4. Type checking passes where applicable.
5. Public API documentation is updated when required.
6. Examples are updated when required.
7. The feature satisfies its stated scope and applicable definition of done.

A partially complete feature is `in_progress`, not `implemented`.

Before completing a state-changing task, run `npm run validate:project-state` in addition to the applicable engineering checks.

---

# 1. Project Identity

- **Project name:** NexusContent
- **Current development stage:** Early development
- **Current milestone:** 0.2.2-core-contract
- **Primary implementation language:** TypeScript
- **Primary initial consumer:** Astro (reference consumer only)

NexusContent Core must remain framework independent.

---

# 2. Project Purpose

NexusContent is an open source content abstraction and integration layer.

It provides a consistent interface between frontend applications and external content sources.

Initial content sources include:

1. Git managed content
2. WordPress
3. Strapi

Future providers may include:

1. Directus
2. Sanity
3. Contentful
4. Payload
5. Storyblok
6. DatoCMS
7. custom REST APIs
8. custom GraphQL APIs
9. database backed providers

NexusContent must allow frontend applications to consume normalized content without depending directly on the source CMS or storage mechanism.

The fundamental flow is:

```text
Content Source
→ Provider
→ NexusContent Core
→ Normalization
→ Validation
→ Content Service
→ Consumer
```

For the initial Astro integration:

```text
Content Source
→ NexusContent
→ Astro
→ Static Build
→ Deployment Target
```

Astro is the first reference consumer.

The same Core code must also work for other consumers, including plain Node scripts, without modification.

---

# 3. Core Architectural Principle

The most important architectural rule is:

Content, application code, and deployment infrastructure are separate concerns.

NexusContent sits between content sources and applications.

NexusContent does not own the website.

NexusContent does not own deployment.

NexusContent does not own the CMS.

NexusContent provides a controlled interface between these systems.

---

# 4. Architectural Boundaries

The architecture must preserve these boundaries.

## 4.1 Content Source

Examples:

- Git content repository
- WordPress
- Strapi
- Future CMS providers

The content source owns editable content.

---

## 4.2 NexusContent

NexusContent owns:

- Provider contracts
- Provider registration
- Provider resolution
- Content retrieval
- Normalization
- Content provenance
- Validation infrastructure
- Structured errors
- Common content types
- Content access services

NexusContent does not own presentation.

---

## 4.3 Frontend Application

The frontend application owns:

- Routes
- Pages
- Layouts
- Components
- Presentation
- Styles
- Frontend interactions
- SEO rendering
- Page composition

For Astro projects, Astro owns these responsibilities.

---

## 4.4 Deployment

Deployment infrastructure owns:

- Build execution
- Hosting
- Environment variables
- Secrets
- Artifact publishing
- Cache invalidation
- Production deployment
- Staging deployment

NexusContent Core must not contain deployment logic.

---

# 5. Framework Independence

NexusContent Core MUST NOT depend on any frontend framework.

This includes, but is not limited to:

- Astro
- Next.js
- React
- Vue
- Svelte
- Nuxt
- Remix
- Solid
- Vite

Do not import any framework into:

- src/core/
- src/providers/
- src/validation/

Core code must not assume:

- Astro routing
- Astro components
- Astro environment APIs
- Astro middleware
- Astro server runtime
- Astro adapters
- Astro Content Collections
- Next.js routing
- Next.js server components
- Next.js edge runtime
- React components
- React hooks
- Vue components
- Svelte components
- Vite plugins

Core code must not use framework specific globals such as:

- Astro
- process.env
- import.meta.env
- React
- next
- window / document where a runtime cannot guarantee them

Astro may consume NexusContent.

Next.js may consume NexusContent.

A plain Node script may consume NexusContent.

NexusContent Core must not consume any framework.

Bad:

```ts
import { Astro } from "astro";
```

inside Core or a provider.

Also bad:

```ts
import { useRouter } from "next/navigation";
```

inside Core or a provider.

Good:

```ts
const page = await nexus.getPage("about");
```

The consumer decides what to do with the returned content.

Provider specific runtimes (such as the Git provider's use of Node filesystem APIs) are isolated inside the provider that requires them.

They are never imposed on Core.

---

# 6. Consumer Integration

Astro is the first and primary frontend integration, used as a reference consumer.

Framework specific integration code must remain outside Core.

A consumer integration for a new framework belongs in the consuming application.

Future package architecture may include:

- @nexuscontent/core
- @nexuscontent/git
- @nexuscontent/wordpress
- @nexuscontent/strapi
- @nexuscontent/astro
- @nexuscontent/cli

Do not create these packages prematurely.

During the pre-1.0 milestones, prove the architecture before extracting multiple packages.

The Astro examples belong under:

```text
examples/astro-basic/
examples/astro-basic-localised/
```

They exist to prove that NexusContent can be consumed cleanly by Astro.

`examples/astro-basic/` is the single-locale reference. It uses declarative `component` field schemas: pages with known structure declare named component fields and compose components directly in the page template, while blog post bodies use a `blocks` field rendered through a small example-owned block renderer. It uses no locale configuration. Media in either path is resolved through `nexus.media`.

`examples/astro-basic-localised/` is the localised reference. It uses locale-prefixed routes and the same site content in English and French.

The implemented WordPress provider follows the same progression with:

```text
examples/astro-wordpress/
```

The example remains a consumer and must not become an implementation location for the WordPress provider.

There is no localised WordPress Astro example. Do not describe `examples/astro-wordpress/` as a locale-aware consumer.

The Astro examples must not become the implementation location for NexusContent Core.

The plain Node compatibility example belongs under:

```text
examples/node-basic/
```

It proves that NexusContent Core works without Astro installed.

Core and its tests must never assume the Astro example exists.

---

# 7. Consumers Own Routes

NexusContent does not generate the primary information architecture of a website.

The consuming application owns routes.

For Astro consumers, routes belong in:

```text
src/pages/
```

inside the consuming Astro application.

Example:

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

NexusContent supplies content to these routes.

A CMS must not automatically determine the primary route structure.

Dynamic routes are allowed where the application explicitly defines them.

Example:

```text
src/pages/blog/[slug].astro
```

may use NexusContent to obtain the blog collection.

The consumer application still owns the route.

---

# 8. Page Composition

Consumer pages should explicitly compose components when the page structure is known.

Preferred:

```tsx
<Hero {...content.hero} />
<Services {...content.services} />
<Testimonials {...content.testimonials} />
<CTA {...content.cta} />
```

Do not introduce a universal section renderer by default.

Do not introduce:

- SectionRenderer
- BlockRenderer
- UniversalPageRenderer
- DynamicPageBuilder

unless the project explicitly requires CMS controlled section ordering.

NexusContent supplies data.

It does not dictate page composition.

Composition is a consumer concern.

---

# 9. Editable Content Must Be Separate From Application Code

Editable client content should normally live outside the application source tree.

Do not treat:

```text
src/data/
```

as the default client content management strategy.

Files inside the application repository are acceptable for developer owned configuration such as:

- Site configuration
- Feature configuration
- Mappings
- Redirect configuration
- Integration configuration
- Technical defaults

They should not be the default location for client editable business content such as:

- Homepage copy
- About copy
- Services
- Team members
- Testimonials
- FAQs
- Blog content
- Contact details
- Company information

The preferred model is:

```text
Application Repository
+
External Content Source
```

---

# 10. Git Content Provider

The first provider implemented in the 0.1.x milestones is the Git content provider.

The recommended production architecture uses a separate content repository.

Example:

```text
GitHub

client-website/
    application code

client-content/
    editable content
```

The content repository may contain:

```text
client-content/
├── pages/
│   ├── home.json
│   ├── about.json
│   ├── services.json
│   └── contact.json
├── collections/
│   ├── team/
│   ├── testimonials/
│   └── faqs/
├── navigation/
│   └── main.json
└── settings/
    └── site.json
```

The Git provider reads content from a configured external path.

Example:

```env
NEXUS_GIT_CONTENT_PATH=../client-content
```

Do not hardcode filesystem paths.

Do not assume the content repository exists inside the application repository.

---

# 11. Git Does Not Mean Manual JSON Editing

Git is a storage and versioning mechanism.

It is not necessarily the content editor interface.

Non developer users may eventually edit Git managed content through a Git backed CMS or other editorial interface.

Expected workflow:

```text
Editor
→ Editing UI
→ Content Repository
→ Git Event
→ Build
→ Deployment
```

NexusContent Core must not require content editors to understand Git.

The editing interface itself is outside Core.

NexusContent integrates with the content source, not necessarily the editing interface.

## 11.1 Git Based CMS Products Are Editing Layers

Git based CMS products are treated as editing layers when their authoritative content is stored as repository files.

Examples include Decap CMS and TinaCMS when operating against repository files.

The Git repository remains the content source.

NexusContent reads the repository through its Git provider.

## 11.2 No Dedicated Provider for Editing Interfaces

Do not create a provider for a Git based CMS merely because it has a different editing interface.

Do not create providers such as:

- DecapProvider
- TinaProvider
- KeystaticProvider
- GitCMSProvider

A Git based CMS should interact with NexusContent through the existing Git content provider.

## 11.3 Dedicated Provider Justification

A dedicated CMS provider is justified only when NexusContent must communicate with a CMS specific API or capability that cannot reasonably be represented through the Git content provider.

Proprietary API access may justify a dedicated provider.

A different editing interface does not.

## 11.4 Editor Independence

The Git provider must remain editor independent.

The provider must behave the same whether a content file was created by:

- a developer
- a Git based CMS
- an AI coding agent
- a custom editor
- a script
- a hosted Git editing interface

Do not inspect or depend on editor identity during ordinary content retrieval.

## 11.5 Git Operations Stay Out of Retrieval

Ordinary content retrieval must not execute Git commands.

Do not introduce:

- git clone
- git pull
- git commit
- git push

inside content retrieval.

Repository synchronization belongs to CI, deployment tooling, the editing system, or a future explicitly designed synchronization capability.

## 11.6 Supported Formats

Only documented file formats are supported.

The Git provider currently supports JSON.

Parsing and serialization is isolated behind an internal format adapter so the Git provider reads and writes files without knowing how a format is handled.

Do not silently attempt to parse unsupported formats.

Do not add Markdown, MDX, YAML, TOML, or CSV parsing during the 0.1.x milestones without explicit scope approval.

The Git provider must not attempt to parse every file in the repository.

It only reads configured or convention based NexusContent content locations.

CMS metadata, configuration, README files, and media are ignored.

---

# 12. Provider Architecture

Every content provider must implement a shared provider contract.

Initial conceptual interface:

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

`ProviderRetrievalOptions` carries per-request `locale`, the resolved `fallbackLocales` chain, and `strict` mode. Providers that do not support locale resolution may ignore it; projects without locale configuration never receive provider options.

The exact API may evolve during the 0.1.x milestones if testing exposes a better design.

Any change to the provider contract must be deliberate.

Do not casually add provider methods.

Before adding a method, determine whether it belongs to:

- Core
- Provider implementation
- Consumer application
- Future synchronization layer

---

# 13. Provider Responsibilities

A provider may be responsible for:

- Connecting to the content source
- Authentication
- Fetching content
- Pagination
- Filesystem access
- API communication
- Provider specific parsing
- Provider specific normalization
- Provider specific error translation
- Provider specific media normalization

Providers must return NexusContent normalized objects.

Providers must not expose native CMS response structures as the public API.

---

# 14. Provider Independence

Core must not contain provider specific branching such as:

```ts
if (provider === "wordpress") {
  // ...
}

if (provider === "strapi") {
  // ...
}
```

Provider specific behaviour belongs in provider implementations.

Core interacts through the shared provider contract.

The provider registry resolves provider instances.

---

# 15. Multiple Provider Instances

NexusContent must support multiple instances of the same provider type.

Example:

```text
primaryWordPress
newsWordPress
legacyWordPress
```

Therefore distinguish between:

- Provider type

and:

- Provider instance name

Do not assume there can only be one WordPress or Strapi instance.

---

# 16. Normalized Content

Provider specific data must be normalized before leaving the provider boundary.

Initial normalized types may resemble:

```ts
export type ContentSource = string;

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

export interface MediaAsset {
  id?: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface ContentMeta {
  source: ContentSource;
  sourceId?: string;
  updatedAt?: string;
  locale?: string;
}

export interface PageContent<
  TData = Record<string, unknown>
> {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  seo?: SeoData;
  data: TData;
  meta: ContentMeta;
}

export interface CollectionItem<
  TData = Record<string, unknown>
> {
  id: string;
  key: string;
  slug?: string;
  title?: string;
  data: TData;
  meta: ContentMeta;
}
```

Do not force every page into one rigid content schema.

The generic data property is intentional.

Different pages have different structures.

---

# 17. Content Provenance

Normalized content should retain useful information about its origin.

Example:

```json
{
  "meta": {
    "source": "wordpress",
    "sourceId": "184",
    "updatedAt": "2026-08-15T01:00:00Z"
  }
}
```

Git example:

```json
{
  "meta": {
    "source": "git",
    "sourceId": "pages/about.json"
  }
}
```

Locale variant example:

```json
{
  "meta": {
    "source": "git",
    "sourceId": "pages/en-ZA/home.json",
    "locale": "en-ZA"
  }
}
```

`meta.locale` records the locale variant actually resolved when locale-aware retrieval is in use. Flat-file fallbacks carry no locale.

Provenance exists to support:

- Debugging
- Logging
- Synchronization
- Auditing
- Cache invalidation
- Preview
- Future migration tooling

Do not expose sensitive provider credentials in provenance.

---

# 18. Content Service

Consumers should normally access NexusContent through a small content service.

Target usage:

```ts
const page = await nexus.getPage("about");
```

Collections:

```ts
const projects = await nexus.getCollection("projects");
```

Individual collection item:

```ts
const project = await nexus.getItem(
  "projects",
  "project-one"
);
```

Internally:

```text
Consumer Request
→ Configuration
→ Provider Resolution
→ Provider
→ Normalization
→ Validation
→ Result
```

Keep the public API small.

Do not expose internal registry mechanics to normal consumers unless necessary.

---

# 19. Configuration

Projects should explicitly configure their content architecture.

Conceptual example:

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
  }
};
```

Configuration maps logical content names to provider content.

It does not create frontend routes.

---

# 20. Validation

Content must not be trusted simply because a provider returned it.

NexusContent should support two levels of validation.

## Provider Level

Checks whether a provider returned a valid normalized NexusContent object.

## Consumer Level

Checks whether content matches the schema expected by a particular website.

For example:

```ts
const AboutSchema = z.object({
  hero: z.object({
    heading: z.string(),
    intro: z.string()
  }),

  story: z.object({
    heading: z.string(),
    content: z.string()
  })
});
```

Runtime validation is encouraged where external content enters the system.

Do not silently coerce clearly invalid content into valid looking data.

---

# 21. Validation Library

Before adding a validation dependency, inspect the existing project dependencies.

If no runtime schema validation library exists and one is genuinely required, prefer a mature, TypeScript friendly solution.

Zod has been selected as the validation library.

Do not add multiple validation libraries.

Do not introduce dependencies without a concrete need.

Use Zod consistently.

---

# 22. Error Handling

Errors must be actionable.

NexusContent should eventually expose a structured error such as:

```text
NexusContentError

Provider: primary
Operation: getPage
Content: about
Reason: HTTP 401 from Strapi
```

Errors should identify where practical:

- Provider
- Operation
- Content key
- Underlying reason
- Source path or endpoint where safe

Do not expose:

- API tokens
- Passwords
- Authorization headers
- Private keys
- Webhook secrets

Do not replace useful errors with:

```text
Something went wrong.
```

---

# 23. Missing Required Content

Required content should normally fail clearly.

Bad:

```ts
return {};
```

when the required page does not exist.

Better:

```ts
throw new NexusContentError(...);
```

or return `null` where the API contract explicitly expects the consumer to decide.

The distinction between missing content and provider failure must remain clear.

---

# 24. Media

Media is content and should be normalized.

Providers may return a common media representation such as:

```ts
export interface MediaAsset {
  id?: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}
```

Provider specific media structures must not leak into application components.

Do not put WordPress media URL logic inside Astro components.

Do not put Strapi media URL logic inside Astro components.

Media CDN decisions should remain configurable.

---

# 25. WordPress

The base WordPress provider was implemented in `0.2.0`. It belongs outside Core:

```text
src/providers/wordpress/
```

Possible future extracted package:

```text
@nexuscontent/wordpress
```

The provider owns WordPress-specific REST communication, endpoint mapping, pagination, normalization, media mapping, authentication headers, and actionable errors. WordPress response objects must stop at the provider boundary; Core and consumers must never branch on native WordPress structures.

Preserve these permanent boundaries:

- Core must remain unaware of WordPress and must not contain WordPress-specific branching.
- The provider must communicate through the WordPress REST API and must not depend on WordPress PHP internals or database access.
- The provider must remain framework neutral; Astro and other consumers own routes and rendering.
- Base provider retrieval is read-only and published-content-only. Mutations, preview, webhooks, and synchronization require separate reviewed designs.
- The base provider must not require ACF, Yoast, Rank Math, WooCommerce, WPML, Polylang, or any other plugin. Optional ACF data exposed by the REST response may be normalized without making ACF a requirement.
- Provider-specific SEO plugin mapping must not enter Core. The base provider may support normalized source data only when explicitly scoped and tested.
- Locale handling remains plugin-neutral. The base provider ignores locale retrieval options rather than assuming a WordPress localisation plugin contract.
- Custom post types require explicit logical collection-to-endpoint mapping; do not add speculative endpoint discovery.
- Collection pagination must remain sequential and validate `X-WP-Total` and `X-WP-TotalPages`. Exceeding `maxPages` or receiving inconsistent totals must throw, never silently truncate.
- Authentication belongs in explicit request headers supplied by the consumer. The provider and Core must not read environment variables or expose credentials, authorization headers, or header values in errors.
- Rendered WordPress HTML remains untrusted external content. The consumer owns trust and sanitization decisions.

## 25.1 WordPress Companion Plugin Boundary

The optional companion plugin is isolated at:

```text
integrations/wordpress/nexuscontent/
```

It is WordPress integration code, not Core code and not the standard REST provider implementation. The plugin owns WordPress editor modes, Gutenberg and optional ACF registration, server-side source normalization, companion capabilities and diagnostics, secured companion REST routes, a WordPress admin status/settings page, and layout-aware Gutenberg block previews. The TypeScript provider owns NexusContent-facing discovery, transport, contract validation, fallback, and normalized retrieval when Phase 3 is implemented.

Preserve these rules:

- Released `0.2.0` standard REST retrieval remains plugin-neutral and must not require or call the companion plugin.
- Plugin PHP, JavaScript, WordPress tooling, and packaging stay under the integration directory; do not move them into `src/core/`, `src/providers/`, or consumer examples.
- Contract v1 responses use `{ contractVersion: 1, data, diagnostics? }` under `nexuscontent/v1` routes for pages, page by ID, page by slug, schema, and capabilities.
- Canonical editor modes are exactly `gutenberg`, `acf_flexible`, and `acf_fixed`.
- Canonical section names are exactly `hero`, `intro`, `rich_text`, `image_text`, `features`, `statistics`, `testimonials`, `gallery`, `cta`, `faq`, `logo_grid`, and `form_embed`. Do not restore `content/*` names or a thirteenth section.
- ACF is optional. ACF Free supports fixed Hero, Introduction, and Call to Action fields; legally supplied ACF Pro may enable flexible layouts and opt-in ACF Blocks. Never download or distribute ACF Pro.
- Public and privileged companion routes must preserve WordPress REST permission boundaries and must not introduce custom credential storage.
- The canonical 12-section vocabulary (type, fixed flag, label, fields) lives in `integrations/wordpress/nexuscontent/sections.json`; the PHP `Section_Registry` and the generated `src/providers/wordpress/sections.generated.ts` both derive from it. `npm run check:sections` enforces freshness; never hand-edit the generated file.
- The admin-only `POST /nexuscontent/v1/project-contract` route stores the consumer's sanitized `components`/`sectionTypes` arrays as `project_components` inside `nexuscontent_settings`. It lives outside the content wire contract (no `contractVersion` negotiation), requires `manage_options` (WordPress core enforces the REST nonce for cookie-authenticated requests; non-cookie auth such as Application Passwords works without one), and never reconfigures editor settings automatically. Its admin Dashboard card is read-only drift comparison.
- Contract changes before release must update TypeScript and plugin definitions together. After release, use explicit contract-version negotiation rather than silent shape drift.
- Phase 3 must consume only the repaired contract and must not begin treating the plugin as verified until WordPress integration passes in CI.

---

# 26. Strapi

Strapi is the directional provider milestone for `0.3.0`, after the `0.2.1` companion work.

Do not expand its scope beyond the reviewed milestone merely because adjacent capabilities might be useful.

When implemented, it belongs outside Core.

Conceptual location:

```text
src/providers/strapi/
```

Future extracted package:

```text
@nexuscontent/strapi
```

The provider will be responsible for:

- REST API access
- Authentication
- Single types
- Collections
- Pagination
- Relations where supported
- Media
- Strapi specific normalization

Strapi response objects must stop at the provider boundary.

---

# 27. Deployment Independence

NexusContent Core does not know where the consuming application is hosted.

Valid deployment targets may include:

- cPanel
- Vercel
- Cloudflare
- Netlify
- Traditional servers
- Static object storage
- Other hosts

Do not put deployment code in:

```text
src/core/
```

Do not add:

- SFTP
- FTP
- Vercel SDK
- Cloudflare deployment SDK
- cPanel API
- Netlify deployment API

to Core.

Deployment belongs to the consuming application's CI and infrastructure.

---

# 28. Static First

NexusContent must work well with static builds.

Typical workflow:

```text
Build starts
→ Consumer calls NexusContent
→ NexusContent fetches content
→ Consumer generates pages
→ dist generated
→ dist deployed
```

Static generation is a consumer execution mode.

NexusContent Core must not assume it is running inside an Astro build or any other framework build.

NexusContent must not require a persistent production Node process for normal static builds.

Do not introduce server runtime requirements unless a feature genuinely requires them.

---

# 29. Forms Are Out of Scope

NexusContent Core is not responsible for contact form processing.

Do not add:

- SMTP
- PHP mailer integrations
- Form APIs
- Spam protection
- Email templates
- Contact form endpoints

to NexusContent Core.

These belong to the consuming application or another service.

---

# 30. Deployment Is Out of Scope

Do not implement:

- cPanel deployment
- SFTP deployment
- Vercel deployment
- Cloudflare deployment
- Netlify deployment

inside NexusContent Core.

The repository may eventually provide examples or documentation.

That is separate from the content abstraction layer.

---

# 31. CMS Administration Is Out of Scope

NexusContent is not a CMS.

Do not build:

- Admin dashboards
- Rich text editors
- Media libraries
- User management
- CMS authentication
- Page builders
- Visual editors

The project may integrate with existing systems that provide these capabilities.

---

# 32. Current Milestone

**CURRENT MILESTONE:** 0.2.2-core-contract

The WordPress provider `0.2.0` release was completed internally on 2026-08-18. The unreleased `0.2.1` companion work (repaired Phase 1 contracts, Phase 2 plugin, Phase 3 integration) is implemented and passes CI. The current unreleased `0.2.2` milestone is the core content contract: a unified `schema.models` configuration (model kinds, provider sources, declarative field schemas) and a provider-neutral media architecture (`MediaAsset.src`, local/remote/WordPress media providers, `nexus.media` resolution).

The recommended next focus after `0.2.2` is the directional `0.3.0` Strapi provider.

---

# 33. Required Scope for 0.2.0 and 0.2.1

## 0.2.0 WordPress Provider (Released)

The released milestone includes:

## WordPress Provider

- Complete WordPress REST API v2 root configuration with validated URL, request headers, provider name, timeout, page size, and page limit.
- Published page lookup by slug.
- Built-in posts collection and item retrieval by slug.
- Explicit custom post type collection-to-endpoint mapping.
- Sequential pagination with required, consistent `X-WP-Total` and `X-WP-TotalPages` headers and no silent `maxPages` truncation.
- Normalized rendered title, content, excerpt, dates, URL, provenance, ACF fields, relationship IDs, and embedded featured media.
- Actionable configuration, HTTP, network, timeout, JSON, payload, and pagination errors without secret leakage.
- Unsupported singleton, navigation, and settings operations return `null`; locale retrieval options are ignored by the plugin-neutral base provider.
- Public `WordPressProvider`, `WordPressProviderOptions`, `WordPressCollectionConfig`, and `WordPressContentData` exports.

## Consumers and Verification

- Plain Node compatibility coverage through the package public API.
- `examples/astro-wordpress/` for pages and posts.
- Deterministic provider tests and local REST fixture builds.

## 0.2.1 WordPress Phase 1 Contracts (Implemented, Unreleased)

### Core Section Types

- `ContentSection<TData>` with optional `settings` and required `data`.
- `SectionSettings` as JSON-compatible key-value settings.
- `PageStatus` union type for draft, published, and archived statuses.
- Optional `status`, `excerpt`, `featuredImage`, `modifiedAt`, and `sections` fields on `PageContent`.

### WordPress Configuration

- `WordPressEditorMode`, `WordPressApiStrategy`, `WordPressUnknownContentPolicy`, `WordPressMediaResolution` enums with predicate helpers and defaults.
- `WordPressAcfConfig` and `WordPressFixedSectionConfig` configuration types.
- Constructor validation rejecting invalid enum values for `editorMode`, `apiStrategy`, `unknownContentPolicy`, and `mediaResolution`.

### Section Registry

- Exactly 12 built-in canonical short names: `hero`, `intro`, `rich_text`, `image_text`, `features`, `statistics`, `testimonials`, `gallery`, `cta`, `faq`, `logo_grid`, and `form_embed`.
- `sourceKey` field mapping to WordPress ACF field group identifiers.
- `SectionDefinition`, `SectionRegistryEntry`, `SectionRegistry`, and `SectionRegistryOptions` types.
- `buildSectionRegistry()` with custom section support and deterministic fixed section merge.
- `mergeSectionRegistry()` overlaying custom definitions on built-in ones.
- `lookupSectionSourceAlias()` resolving ACF field group keys to canonical section types.

### Companion Wire Contracts

- Contract v1 envelopes shaped as `{ contractVersion: 1, data, diagnostics? }`.
- TypeScript interfaces and Zod schemas for pages, page by ID, page by slug, schema, and capabilities responses.
- `COMPANION_CONTRACT_VERSION`, `COMPANION_WIRE_NAMESPACE`, `COMPANION_WIRE_ENDPOINTS` constants.
- `buildCompanionContractVersion()` and `isValidCompanionContractVersion()` helpers.
- Reserved `nc-` and `nexus-` companion prefixes.
- Structured diagnostic entries with severity, code, message, and optional path.
- `WordPressCapabilities` type for companion schema responses.

### Provider Capabilities

- `WordPressProviderFacingCapabilities` type with `editorMode`, `gutenberg`, `acfFlexible`, `acfFixed`, `acfFields`, `mediaLibrary`, `customPostTypes`, `sections`, `localeAware`, `previewSupport`, and `webhookSupport` fields.
- `capabilities()` method on `WordPressProvider` returning current provider capability report.

### Error Codes

- `WORDPRESS_ERROR_CODES` includes provider categories plus companion response, editor, block, ACF layout/block, fixed section, section-source, media-resolution, and conflicting-source codes.
- `WordPressErrorCode` type and `isWordPressErrorCode()` predicate.
- Optional generic `code` field on `NexusContentErrorDetails` and `NexusContentError`.

### Verification

- JSON fixture-based contract tests for all companion wire response shapes.
- Zod schema validation tests for valid and invalid fixtures.
- Provider config validation tests for invalid enum values.
- Public export verification for all new types, schemas, and predicates.

## 0.2.1 WordPress Phase 2 Companion Plugin (Implemented, Unreleased)

- Plugin `0.1.0` source is isolated under `integrations/wordpress/nexuscontent/` and requires WordPress 6.6+ and PHP 8.1+.
- Native Gutenberg, optional ACF Free 6.2+ fixed fields, optional ACF Pro 6.2+ flexible layouts for all 12 sections, and opt-in ACF Blocks are implemented.
- Page mode UI, server-side source normalization, expanded media metadata, exact capability reporting, diagnostics, secured REST routes, tests, tooling, documentation, and ZIP packaging exist.
- Unit tests, PHP lint, PHPCS, PHPStan, contract tests, JavaScript build/lint/format, and packaging pass; `dist/nexuscontent-0.1.0.zip` is the current artifact.
- WordPress integration passes in CI (tests and the escaping gate satisfied). `0.2.1` itself remains unreleased; the feature is `implemented` and the milestone awaits release alongside `0.2.2`.

## 0.2.1 WordPress Phase 3 Companion Integration (Implemented, Unreleased)

- Provider discovery, companion calls, contract-version negotiation, caching, and fallback are implemented with tests.
- Phase 3 must consume only the repaired contract after plugin integration verification; the `ts-integration` CI job runs the live integration gate against a fresh Docker wp-env companion install and passes.
- Released `0.2.0` standard REST retrieval remains unchanged and does not call the plugin.

## Explicit Scope Boundaries

- Published-content-only, read-only retrieval.
- No preview, webhooks, mutations, synchronization, or retries. Released base-provider retrieval has no cache; the scoped companion cache belongs to implemented Phase 3.
- No shortcode conversion, Gutenberg renderer, taxonomy cache, media synchronization, plugin SEO, WordPress localisation plugins, endpoint discovery, WooCommerce, or multisite verification.
- Rendered HTML remains untrusted and consumer-owned.

The existing SEO, localisation, Git provider, Core, validation, and framework-neutrality foundations remain implemented; historical release details belong in `CHANGELOG.md` and `ROADMAP.md`.

The established foundation includes:

## Core

- Normalized content types
- ContentProvider interface
- Provider registry
- Provider resolution
- NexusContent configuration
- Optional locale configuration, fallback-chain resolution, and strict mode
- Per-request retrieval options (`locale`, `fallback`)
- Content service
- Structured errors
- Public exports

## Git Provider

- External content directory support
- JSON page loading
- JSON singleton loading from `singletons/<key>.json`
- JSON navigation loading from `navigation/<key>.json`
- JSON settings loading from `settings/<key>.json`
- JSON collection loading
- Individual collection item loading
- Locale variant directories with legacy flat-file fallback
- Normalization
- Content provenance including optional `meta.locale`
- Useful errors
- Git based CMS compatibility documentation
- Unrelated repository files are ignored

## Validation

- Normalized content validation
- Project content schema support where practical
- Useful validation errors

## Astro Examples

- Explicit Astro routes
- NexusContent integration
- At least one page
- At least one collection
- Locale-aware pages and content-driven language switching
- Static build
- No direct provider calls from Astro components
- Separate WordPress single-locale consumer

## Plain Node Compatibility

- Automated framework neutrality tests
- A plain Node example under `examples/node-basic/`
- Proof that Core works without Astro installed

## Engineering

- TypeScript
- Tests
- CI
- README
- AGENTS.md
- License
- Basic contribution documentation

## 0.2.2 Core Content Contract and Media (In Progress, Unreleased)

- Root `content`, `navigation`, and `settings` configuration sections are replaced by a unified `schema.models` contract. Each model declares a `kind` (`singleton`, `collection`, `navigation`, `settings`) and a provider `source` (`provider`, `key`, and `mode: "page"` or `"singleton"` for singletons).
- `defineNexusConfig()` validates the model shape and provider/source/media relationships and returns a `NexusConfig`. `validateNexusConfig` and `resolveBuiltinMediaProviders` back it. Relational checks also run for direct `NexusContent` construction.
- Declarative field schemas (`core.schema.fields`) cover `string`, `number`, `boolean`, `datetime`, `object`, `reference`, `media`, `richText`, `component`, and `blocks` with `required`, `list`, `options`, nested `object.fields`, `reference.collection`, `media` overrides, `component` references into `schema.components`, and `blocks` validation of a discriminated `_type` list against `allowedComponents`. Model data is validated at retrieval time; mismatches throw `SchemaError` (with `model` and field issue paths). Undeclared data fields pass through. Models without declared fields skip validation.
- Media is provider-neutral. `MediaAsset` uses `src` plus optional `provider` and `sourceId` (legacy `url` is removed; `MediaSize`/`sizes` keep `url`). Local and remote media providers are declared in `media.providers` and auto-built by Core; WordPress media is registered manually via `nexus.registerMedia`. Resolution order is reference provider (carrying any field `media` override), per-request `defaultProvider`, then the configured project default.
- `nexus.media.resolve(reference, options?)` is the media resolution entry point; Core never fetches media. Local resolution is traversal-safe; remote resolution validates absolute http(s) URLs only.
- The companion wire contract and plugin keep `featuredImage.url`; the TypeScript boundary converts it to `src`.
- Cloudinary and other CDN providers, editor UI, uploads, media transforms, and renderers are not part of `0.2.2`.

---

# 34. Historical 0.1.x Scope Exclusions

This section records the exclusions that constrained the completed `0.1.x` foundation milestones. WordPress was subsequently implemented in `0.2.0`; current and future scope is governed by the current milestone, roadmap, and permanent architectural rules above.

During `0.1.x`, unless the user explicitly changed scope, agents did not implement:

- Strapi provider
- Directus provider
- Sanity provider
- Contentful provider
- Git CMS specific providers (Decap, Tina, Keystatic, and similar)
- CLI
- Admin UI
- Webhooks
- Draft preview
- Synchronization engine
- Content change tracking
- SQLite
- Redis
- Queues
- Background workers
- Deployment adapters
- cPanel integration
- Vercel integration
- Cloudflare integration
- Netlify integration
- Form backend
- Authentication system
- Universal section renderer
- Visual page builder
- Database abstraction layer
- GraphQL abstraction
- Plugin marketplace
- Complex caching infrastructure
- Translation workflows, per-locale publishing, completeness reporting, and outdated tracking
- Automatic canonical URL construction or deployment URL inference
- Sitemap, robots.txt, redirect, keyword-analysis, metadata-scraping, or analytics systems
- Provider-specific SEO plugin logic in Core
- Framework SEO rendering components in the public package

Do not build future roadmap features because they "might be useful."

---

# 35. Repository Structure for 0.1.x

Use a deliberately small structure.

```text
nexuscontent/
│
├── src/
│   ├── core/
│   │   ├── config.ts
│   │   ├── types.ts
│   │   ├── provider.ts
│   │   ├── registry.ts
│   │   ├── service.ts
│   │   ├── errors.ts
│   │   ├── normalize.ts
│   │   └── index.ts
│   │
│   ├── formats/
│   │   ├── types.ts
│   │   ├── json.ts
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
├── .env.example
├── .gitignore
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── package.json
└── tsconfig.json
```

Do not create dozens of empty future directories.

Add directories when capabilities are implemented.

---

# 36. File Responsibility

## src/core/types.ts

Contains public normalized content types.

Do not place provider specific types here unless they are genuinely universal.

## src/core/provider.ts

Contains the provider contract.

Keep this interface small.

Changes here affect every provider.

Treat modifications as architectural changes.

## src/core/registry.ts

Handles provider registration and lookup.

It must not contain provider specific implementation logic.

## src/core/config.ts

Contains NexusContent configuration types and configuration handling.

It must not contain secrets.

## src/core/service.ts

Provides the primary content access API.

It coordinates configuration and providers.

It should not implement provider specific fetching.

## src/core/normalize.ts

Contains normalization defaults applied by the content service pipeline.

## src/core/errors.ts

Contains structured NexusContent errors.

Preserve underlying causes where practical.

Never leak credentials.

## src/formats/

Contains format adapter contracts and implementations (currently JSON only).

Providers use format adapters to parse and serialize content without knowing how a format is handled.

This module is internal and must not become part of the public API surface unless intentionally exposed as an extension API.

## src/providers/git/

Contains all Git or filesystem content provider behaviour.

Core must not know how JSON files are loaded.

## src/validation/

Contains shared validation infrastructure.

Do not turn this directory into business specific page schemas for example projects.

Example specific schemas belong in the example application.

## examples/astro-basic/

Demonstrates consumption of NexusContent inside an Astro static build for a single locale.

It uses flat content and no locale configuration.

It must not become a hidden dependency of Core.

Deleting the example must not break the library.

## examples/astro-basic-localised/

Demonstrates the same Astro consumption with locale-prefixed routes in English and French.

It proves the localisation progression on top of the single-locale example.

It must not become a hidden dependency of Core.

Deleting the example must not break the library.

## examples/node-basic/

Demonstrates consumption of NexusContent from a plain Node process.

It proves that Core does not require Astro.

It must not become a hidden dependency of Core.

Deleting the example must not break the library.

## tests/compat/

Contains framework neutrality tests.

These tests must run without Astro or any frontend framework installed.

---

# 37. TypeScript Rules

Use strict TypeScript.

Avoid `any`.

Prefer `unknown` at untrusted boundaries.

Validate or narrow unknown before use.

Bad:

```ts
function normalize(data: any) {
  return data.title;
}
```

Better:

```ts
function normalize(data: unknown) {
  // validate and narrow first
}
```

Use generics only where they improve type safety.

Do not introduce complex generic machinery merely to appear type safe.

Readable types are preferred over clever types.

---

# 38. Public API Rules

Keep the public API small.

Prefer a consumer experience similar to:

```ts
const nexus = new NexusContent(config);

const about = await nexus.getPage("about");

const projects = await nexus.getCollection("projects");

const project = await nexus.getItem(
  "projects",
  "project-one"
);
```

Do not expose internal registries, loaders, parsers, and normalization functions unless they are intentionally part of the public extension API.

Every new public export becomes a compatibility responsibility.

Be conservative.

---

# 39. Dependency Rules

Minimize runtime dependencies.

Before adding a dependency:

- Check whether the platform already provides the capability.
- Check whether the repository already has an appropriate dependency.
- Determine whether the dependency belongs in Core or only a provider.
- Consider package size and maintenance burden.
- Add it only when it materially improves correctness or maintainability.

Do not add large utility libraries for trivial operations.

Do not add frontend frameworks to Core.

Do not add Astro, Next.js, React, Vue, Svelte, or TanStack to Core runtime dependencies.

---

# 40. Node Compatibility

The Git provider may require Node filesystem APIs.

Keep Node specific behaviour isolated to providers that require it.

Do not make every NexusContent provider depend on Node filesystem APIs.

The architecture should leave room for providers that work in other JavaScript runtimes.

Do not claim runtime compatibility that has not been tested.

---

# 41. Testing Requirements

New behaviour requires tests.

Tests should focus on externally observable behaviour.

Do not test implementation details unless necessary.

## Minimum Core tests

- Provider registration
- Provider lookup
- Unknown provider errors
- Configuration resolution
- Page retrieval
- Collection retrieval
- Item retrieval
- Missing content behaviour
- Provider error propagation

## Minimum Git provider tests

- Valid page JSON
- Missing page
- Malformed JSON
- Valid collection
- Missing collection
- Valid collection item
- Missing collection item
- Normalization
- Content provenance
- Path handling
- Unrelated CMS files are ignored
- Editor independence

## Minimum validation tests

- Valid content
- Invalid normalized content
- Missing required fields
- Incorrect field types
- Useful error output

## Minimum framework neutrality tests

- Core and provider sources contain no framework imports
- The public API works from plain Node code without Astro installed
- Runtime dependencies do not include Astro or any frontend framework

---

# 42. Test Fixtures

Use explicit fixtures.

Do not depend on production CMS services during unit tests.

Git provider tests should use temporary fixture directories or dedicated test fixtures.

Tests must be deterministic.

Do not require network access for Core tests.

---

# 43. CI Requirements

The CI workflow should initially perform:

```text
Install
→ Type Check
→ Tests
→ Package Build
→ Astro Example Build
→ Plain Node Compatibility Example
```

CI must fail when any required stage fails.

Do not silently ignore failed tests.

Do not use:

```text
continue-on-error: true
```

for required quality gates.

---

# 44. Formatting and Style

Follow the repository's configured formatter and linter.

If none exists, do not introduce several competing tools without discussion.

Prefer:

- Small functions
- Explicit names
- Early returns
- Clear error messages
- Minimal nesting
- Readable control flow

Avoid:

- Huge utility files
- Magic strings scattered across the repository
- Deep inheritance
- Global mutable state
- Clever metaprogramming
- Unnecessary factories
- Premature plugin systems

---

# 45. Comments

Comments should explain:

- Why a decision exists
- Non obvious constraints
- Important provider behaviour
- Security assumptions
- Compatibility requirements

Do not write comments that merely repeat the code.

Bad:

```ts
// Get page
const page = await getPage();
```

Useful:

```ts
// Missing content is returned as null rather than thrown here
// because the consumer decides whether this content is optional.
```

---

# 46. Security Rules

Never commit:

- API tokens
- Passwords
- Private keys
- SSH credentials
- SMTP credentials
- CMS credentials
- Webhook secrets
- Deployment credentials

Never print secrets in:

- Errors
- Logs
- Test snapshots
- CI output
- Example configuration

Use environment variables for secrets.

`.env.example` contains names and safe examples only.

---

# 47. File Access Security

The Git provider reads external content paths.

Treat configured paths as untrusted configuration.

Prevent accidental path traversal where appropriate.

A content key must not allow arbitrary access outside the configured content root.

For example, a malicious key such as:

```text
../../../../etc/passwd
```

must not allow arbitrary filesystem access.

Resolve and verify paths against the configured content root.

Add tests for path traversal protection.

---

# 48. External Content Is Untrusted

CMS and Git content should be treated as external input.

Do not assume:

- JSON is valid
- Required fields exist
- URLs are safe
- HTML is safe
- Media exists
- Slugs are valid

Validate at appropriate boundaries.

Do not silently execute content as code.

---

# 49. Performance Rules

Avoid unnecessary repeated provider calls during a single operation.

Do not introduce caching during the 0.1.x milestones unless testing demonstrates a concrete need.

When caching is eventually added:

- It must not change provider semantics.
- It must support invalidation.
- It must not hide stale content errors.

Do not add Redis in 0.1.x.

---

# 50. Logging

Keep logging minimal in Core.

Libraries should not flood consumer output.

Errors should contain enough context for debugging.

Future structured logging may be added through an injectable logger if there is a demonstrated requirement.

Do not add a logging framework during 0.1.x without a concrete need.

---

# 51. Backwards Compatibility

Before 1.0, the API may evolve.

Even so, avoid unnecessary churn.

Changes to these areas require particular care:

- ContentProvider interface
- Normalized content types
- Configuration format
- Public exports
- Error types

Document significant public API changes in CHANGELOG.md.

---

# 52. Documentation Requirements

When adding or changing public behaviour:

- Update README.md where relevant.
- Update code examples.
- Update type documentation where useful.
- Update CHANGELOG.md for meaningful changes.
- Do not leave documentation describing APIs that no longer exist.

---

# 53. Documentation Responsibility Conflicts

`README.md` explains what NexusContent is and how developers use it. `AGENTS.md` defines modification rules. Current status and sequencing belong in the dedicated state files described in section 0.

Do not duplicate large amounts of documentation unnecessarily.

If documentation conflicts on engineering constraints, follow `AGENTS.md` and flag the conflict before making a major architectural change. If documentation conflicts on implementation status, inspect tests and implementation, then synchronize `FEATURES.md`, `project.state.json`, and any affected summary documents.

---

# 54. CONTRIBUTING.md

CONTRIBUTING.md should eventually explain:

- Development setup
- Branching
- Testing
- Pull requests
- Commit expectations
- Issue reporting
- Provider contribution requirements

Do not put agent specific behavioural instructions there.

Those belong here.

---

# 55. Git Practices

Make focused changes.

Do not mix unrelated refactoring with feature work.

Do not delete existing user work merely because another implementation appears cleaner.

Do not rewrite the repository structure without explicit justification.

Before modifying architecture:

- Inspect existing files.
- Understand current implementation.
- Check tests.
- Check README.md.
- Check this file.

Preserve working behaviour unless the task requires a breaking change.

---

# 56. AI Agent Workflow

For every substantial task:

### Step 1

Complete the mandatory startup sequence in section 0, then read `package.json`, `tsconfig.json`, and relevant implementation, test, example, and CI files.

### Step 2

Determine which architectural layer owns the requested behaviour.

Ask:

- Core?
- Provider?
- Validation?
- Astro example?
- Consumer application?
- Infrastructure?

If it does not belong in NexusContent, do not force it into NexusContent.

### Step 3

Inspect existing tests before implementation.

### Step 4

Implement the smallest coherent change.

### Step 5

Add or update tests.

### Step 6

Run:

- Type checks
- Relevant tests
- Full tests where practical
- Build
- Astro example build where relevant
- Plain Node compatibility example where relevant

### Step 7

Review the diff for architectural leakage.

### Step 8

Update documentation if public behaviour changed.

---

# 57. Do Not Guess Existing Code

Before creating a new:

- Utility
- Type
- Provider abstraction
- Validation helper
- Error class
- Configuration mechanism

search the repository for an existing implementation.

Do not create duplicate concepts under different names.

---

# 58. Avoid Premature Abstraction

A repeated pattern is not automatically an abstraction opportunity.

Do not introduce:

- Plugin systems
- Dependency injection containers
- Event buses
- Complex factories
- Service locators
- Abstract base classes
- Generic repositories

unless the project has a demonstrated requirement.

Prefer simple composition.

---

# 59. No Architecture Theatre

A file or layer must earn its existence.

Do not create:

- managers/
- handlers/
- controllers/
- repositories/
- factories/
- adapters/
- strategies/

simply because those names sound architectural.

Create a layer only when it owns a clear responsibility.

NexusContent should remain understandable to a competent TypeScript developer without requiring a diagram for every function call.

---

# 60. Naming

Use descriptive names.

Preferred concepts:

- ContentProvider
- PageContent
- CollectionItem
- ContentMeta
- NexusContentError
- NexusContent
- getPage
- getCollection
- getItem

Avoid vague names such as:

- Manager
- Processor
- Engine
- Thing
- Helper
- Common
- Misc
- BaseService

unless the concept genuinely warrants the term.

---

# 61. Provider Naming

Provider implementations should follow a predictable structure.

Example:

```text
providers/
└── git/
    ├── provider.ts
    ├── loader.ts
    ├── normalize.ts
    └── index.ts
```

Do not name provider files after arbitrary implementation details unless needed.

---

# 62. Environment Variables

Environment variables should use predictable names.

Examples:

```text
NEXUS_GIT_CONTENT_PATH
WORDPRESS_API_URL
WORDPRESS_API_TOKEN
STRAPI_API_URL
STRAPI_API_TOKEN
```

Core should not directly read every provider environment variable.

Provider configuration should be explicit.

The consuming application decides how environment variables populate configuration.

This keeps Core testable.

---

# 63. Configuration vs Environment

Do not tightly couple configuration to process.env.

Preferred:

```ts
const nexus = new NexusContent({
  providers: {
    content: {
      type: "git",
      options: {
        root: process.env.NEXUS_GIT_CONTENT_PATH
      }
    }
  }
});
```

Core receives configuration.

The application decides where configuration values originate.

This improves:

- Testing
- Runtime portability
- Predictability
- Framework independence

---

# 64. Build Time vs Runtime

NexusContent must not assume all consumers operate at runtime.

The primary Astro use case is build time, but the same Core must also work at runtime in other consumers.

Therefore provider APIs must work cleanly during:

- Local development
- CI
- Static generation

Do not require persistent application state for ordinary reads.

---

# 65. Future Synchronization

Synchronization is intentionally not part of the 0.1.x milestones.

When eventually implemented, it should remain conceptually separate from content reading.

Reading:

```text
Source
→ Provider
→ NexusContent
→ Consumer
```

Synchronization:

```text
Source A
→ Sync
→ Source B
```

Do not contaminate the provider read interface with synchronization methods before the sync architecture is designed.

---

# 66. Future Preview

Preview is intentionally not part of the 0.1.x milestones.

When eventually implemented, preserve these principles:

- Draft access must be explicit.
- Preview must be authenticated where necessary.
- Preview content must not accidentally enter production builds.
- CMS preview must render through the real frontend where practical.

Do not add draft flags to every Core API during the 0.1.x milestones merely because preview may exist later.

---

# 67. Future Webhooks

Webhooks are intentionally not part of the 0.1.x milestones.

When eventually implemented:

- Authenticate requests.
- Use signed payloads where supported.
- Reject invalid signatures.
- Avoid unauthenticated public rebuild endpoints.
- Keep webhook processing outside provider read logic.

---

# 68. Future CLI

The CLI is intentionally not part of the 0.1.x milestones.

Do not create CLI commands until the underlying programmatic APIs are stable.

The CLI should wrap stable Core behaviour.

Core must never depend on the CLI.

---

# 69. Future Package Extraction

Do not begin with an unnecessary monorepo.

Start with a coherent repository.

Extract packages when:

- Provider boundaries are proven.
- Independent versioning is useful.
- Dependency isolation matters.
- Consumers benefit from smaller installations.

Possible future packages:

```text
@nexuscontent/core
@nexuscontent/git
@nexuscontent/wordpress
@nexuscontent/strapi
@nexuscontent/astro
@nexuscontent/cli
```

Package extraction must follow proven architecture rather than define it prematurely.

---

# 70. Definition of Done

A task is not complete merely because the code compiles.

For code changes, verify where applicable:

- Implementation satisfies the requested behaviour.
- Architecture boundaries remain intact.
- TypeScript passes.
- Tests pass.
- New behaviour has tests.
- Example application still builds.
- Errors remain useful.
- No secrets were introduced.
- No unnecessary dependency was added.
- Documentation reflects public changes.
- No unrelated files were modified.

---

# 71. Architecture Review Checklist

Before completing substantial work, ask:

- Does Core now know something provider specific?
  - If yes, reconsider.
- Does Core now assume a specific consumer framework?
  - If yes, reconsider.
- Does a provider now know something framework specific?
  - If yes, reconsider.
- Does NexusContent now know where the website is hosted?
  - If yes, reconsider.
- Does the Astro example call a CMS directly?
  - If yes, fix it.
- Are native CMS response objects leaking into components?
  - If yes, normalize them.
- Did editable business content get placed inside application source code?
  - If yes, verify that this was intentional.
- Was a future feature implemented without being requested?
  - If yes, remove it.
- Was a dependency added where native functionality was sufficient?
  - If yes, reconsider.
- Does the new abstraction solve an actual problem?
  - If no, remove it.
- Can the behaviour be tested independently?
  - If no, inspect the design.

---

# 72. Core Design Test

Every feature proposed for NexusContent should answer:

> Does this improve the boundary between content sources and content consumers?

Examples:

- WordPress normalization: YES.
- Strapi provider: YES.
- Content validation: YES.
- Provider registry: YES.
- Content provenance: YES.
- Button styling: NO.
- Contact form email delivery: NO.
- cPanel SFTP deployment: NO.
- Astro navigation component: NO.
- CMS admin dashboard: NO.

If the answer is no, the feature probably belongs outside NexusContent.

---

# 73. Long Term Public Experience

The desired consumer experience should remain simple.

Conceptually:

```ts
const nexus = new NexusContent(config);

const about = await nexus.getPage("about");

const projects = await nexus.getCollection("projects");

const project = await nexus.getItem(
  "projects",
  "project-one"
);
```

The consumer should not need to care whether content originated from:

- Git
- WordPress
- Strapi
- Directus
- Sanity
- Contentful
- Payload
- Custom APIs

That abstraction is the central value of NexusContent.

---

# 74. Final Rule

NexusContent should remain boring at its core.

- Simple contracts.
- Clear boundaries.
- Predictable data.
- Useful errors.
- Strong validation.
- Replaceable providers.
- Minimal dependencies.

Do not sacrifice those qualities for feature count.

When uncertain, choose the smaller implementation that preserves the architecture.
