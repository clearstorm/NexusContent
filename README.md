# NexusContent

> An open source content architecture for Astro that separates frontend code, content management, and deployment infrastructure.

NexusContent provides a consistent content layer between Astro websites and external content sources such as Git managed content, WordPress, Strapi, and future headless CMS providers.

It is designed around a simple principle:

**Astro owns the website. Content providers own the content. Deployment infrastructure owns delivery.**

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
 NexusContent
      │
      ├── Provider Interface
      ├── Normalization
      ├── Validation
      ├── Content Services
      └── Content Provenance
      │
      ▼
     Astro
      │
      ├── Routes
      ├── Pages
      ├── Layouts
      └── Components
      │
      ▼
     Build
      │
      ├── cPanel
      ├── Vercel
      ├── Cloudflare
      ├── Netlify
      └── Other Hosts
```

---

# Project Status

NexusContent is currently in early development.

The first milestone is deliberately small.

The initial version will establish:

1. NexusContent Core
2. A stable provider contract
3. Normalized content types
4. Provider registration
5. Project configuration
6. An Astro facing content service
7. A Git based content provider
8. Content validation
9. A working Astro example
10. Automated tests

WordPress, Strapi, preview workflows, CMS webhooks, synchronization, and deployment integrations will be added after the core architecture is proven.

The project must not become over engineered before the core contract is stable.

---

# Why NexusContent Exists

Astro is excellent at building fast websites, but real client websites have a content management problem.

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

These concerns should not be tightly coupled.

NexusContent provides the boundary between them.

---

# Core Philosophy

NexusContent follows five major principles.

## 1. Astro owns routing

Primary website routes belong inside the Astro project.

For example:

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

Astro determines how that content is presented.

Dynamic routes are still valid where appropriate.

For example, a blog may use:

```text
src/pages/blog/[slug].astro
```

with entries supplied by WordPress, Strapi, Git content, or another provider.

---

## 2. Editable content should be separated from application code

NexusContent does not treat `src/data/*.json` as the primary content management strategy.

Files bundled directly inside the application repository are appropriate for developer owned configuration, but they are weak as a client content management system.

Editable business content should normally live outside the Astro application.

Examples include:

* Git based content repository
* WordPress
* Strapi
* another headless CMS
* another external content service

This provides a clearer separation between application code and content.

---

## 3. Astro must not know which CMS is being used

Astro pages and components should consume normalized NexusContent data.

They should not consume WordPress or Strapi response objects directly.

Bad:

```text
Astro Page
    ↓
WordPress REST API
```

Correct:

```text
Astro Page
    ↓
NexusContent Service
    ↓
Provider
    ↓
WordPress
```

The same Astro page should be capable of changing content providers without requiring a complete frontend rewrite.

---

## 4. Deployment is independent

NexusContent does not require a particular hosting platform.

Static Astro output should be deployable to any suitable host.

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
Astro Build
   ↓
dist/
   ↓
Deployment
```

A Node runtime should only be introduced when the project actually requires server side functionality.

---

# What NexusContent Is

NexusContent is:

* a content abstraction layer
* a provider architecture
* a normalization layer
* a validation layer
* a consistent API for Astro
* a foundation for CMS integrations
* a foundation for content synchronization
* a foundation for preview workflows
* open source infrastructure

---

# What NexusContent Is Not

NexusContent is not:

* a CMS
* a page builder
* a WordPress replacement
* a Strapi replacement
* an Astro theme
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
                            ▼
                          Astro
                            │
              ┌─────────────┼─────────────┐
              │             │             │
            Pages        Layouts      Components
                            │
                            ▼
                       Astro Build
                            │
                            ▼
                          dist/
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
        cPanel            Vercel          Cloudflare
```

---

# Separation of Responsibilities

NexusContent uses a separation similar in spirit to MVC, although Astro itself is not being forced into a traditional MVC framework.

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

Astro presentation.

```text
Pages
Layouts
Components
Styles
```

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
│   └── astro-basic/
│       ├── src/
│       │   ├── components/
│       │   ├── layouts/
│       │   └── pages/
│       ├── public/
│       ├── astro.config.mjs
│       ├── package.json
│       └── tsconfig.json
│
├── tests/
│   ├── core/
│   ├── providers/
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

---

# Normalized Content

Every provider returns normalized NexusContent objects.

A provider must never expose its native API response as the public NexusContent API.

Initial types may look similar to:

```ts
export type ContentSource = string;

export interface SeoData {
  title?: string;
  description?: string;
  canonical?: string;
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

The Astro project determines the page specific schema.

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
    key: string
  ): Promise<PageContent<TData> | null>;

  getCollection<TData = Record<string, unknown>>(
    collection: string
  ): Promise<CollectionItem<TData>[]>;

  getItem<TData = Record<string, unknown>>(
    collection: string,
    key: string
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

It does not create Astro routes.

---

# Content Service

Astro should normally interact with NexusContent through the content service.

Example:

```ts
const page = await nexus.getPage("about");
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

Astro should not need to know whether `about` came from Git, WordPress, Strapi, or another provider.

---

# Astro Integration

NexusContent Core must not depend on Astro.

This is a strict architectural boundary.

Bad:

```ts
import { Astro } from "astro";
```

inside NexusContent Core or a content provider.

Core deals with content.

Astro deals with presentation.

The Astro application imports NexusContent.

NexusContent does not import Astro.

This separation should eventually allow NexusContent Core to be used outside Astro if there is a legitimate reason.

---

# Astro Page Example

An Astro route remains explicit:

```text
src/pages/about.astro
```

Example:

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

The page controls composition.

NexusContent supplies data.

---

# No Generic Section Renderer by Default

NexusContent does not require a universal section renderer.

For normal websites, explicit Astro composition is preferred.

Example:

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
    Astro application

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

The Astro application must not assume the content repository exists inside `src`.

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
Astro Build
      ↓
Deployment
```

The specific editing product is not part of NexusContent Core.

Possible integrations may be documented separately.

---

# WordPress Provider

WordPress support will be implemented after NexusContent Core and the Git provider are stable.

Expected architecture:

```text
WordPress
    ↓
REST API
    ↓
WordPress Provider
    ↓
NexusContent
    ↓
Astro
```

The WordPress provider will be responsible for:

* API communication
* pagination
* authentication where required
* page retrieval
* post retrieval
* media normalization
* SEO normalization
* error handling
* WordPress specific normalization

WordPress response objects must not leak beyond the provider.

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
Astro
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
Astro Build
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
Astro Build
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
Astro frontend
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

It should work regardless of whether the Astro application is deployed to:

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
Astro Build
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
Astro Build
   ↓
Deployment
```

Again, no NexusContent Core changes should be required.

---

# Forms

Form handling is not a responsibility of NexusContent Core.

A website may use:

```text
Astro Form
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
Build Astro example
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

# Initial Milestone

Version `0.1.0` should focus only on proving the core architecture.

## Required

### Core

* normalized content types
* `ContentProvider` interface
* provider registry
* NexusContent configuration
* content service
* structured errors

### Git Provider

* external content directory
* page loading
* collection loading
* item loading
* JSON support
* normalization
* provenance

### Validation

* runtime schema validation
* clear validation errors

### Astro Example

* explicit Astro routes
* NexusContent integration
* home page
* about page
* collection example

### Engineering

* TypeScript
* tests
* CI
* documentation
* example content repository

---

# Not Part of Version 0.1.0

Do not implement the following during the first milestone:

* WordPress provider
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

These features come later.

The purpose of `0.1.0` is to prove the content architecture.

---

# Version Roadmap

## 0.1

NexusContent Core and Git provider.

## 0.2

WordPress provider.

## 0.3

Strapi provider.

## 0.4

Content synchronization and change detection.

## 0.5

Webhooks and automated rebuild workflows.

## 0.6

Draft preview.

## 0.7

CLI and developer tooling.

## 1.0

Stable provider API, documented extension model, production tested integrations, and stable public package contracts.

The roadmap may change as the architecture is tested against real projects.

---

# Architectural Rules

These rules are non negotiable unless there is a documented reason to change them.

### Rule 1

Astro owns website routes.

### Rule 2

NexusContent Core does not depend on Astro.

### Rule 3

Content providers do not depend on Astro.

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

NexusContent is intended to be released as open source.

The final open source license should be selected before the first public release.

A permissive license such as MIT or Apache 2.0 should be considered.

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

The Astro application should not need to be rebuilt architecturally every time one of those choices changes.

That separation is the reason NexusContent exists.