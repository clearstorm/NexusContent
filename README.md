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

NexusContent is currently in early development.

The first milestone is deliberately small.

The initial version establishes:

1. NexusContent Core
2. A stable provider contract
3. Normalized content types
4. Provider registration
5. Project configuration
6. A framework neutral content service
7. A Git based content provider
8. Content validation
9. A working Astro reference example
10. A plain Node compatibility proof
11. Automated tests

WordPress, Strapi, preview workflows, CMS webhooks, synchronization, and deployment integrations will be added after the core architecture is proven.

The project must not become over engineered before the core contract is stable.

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

The consuming project determines the page specific schema.

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

It does not create application routes.

---

# Content Service

Consumers should normally interact with NexusContent through the content service.

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

* `examples/astro-basic/` proves consumption inside an Astro static build.
* `examples/node-basic/` proves consumption from a plain Node process.

---

# Astro Example

The Astro reference example under `examples/astro-basic/` proves NexusContent consumption inside an Astro static build.

Astro routes remain explicit:

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

The page controls composition.

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

For `0.1.2`, the baseline contract is deliberately small:

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

They are not supported in `0.1.2`.

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
collections/
```

Everything else in the repository is ignored.

## Navigation and Settings

The recommended content repository structure includes:

```text
navigation/
settings/
```

These are documented conventions for future use.

They are not exposed through the public API in `0.1.2`.

Do not expect `nexus.navigation()` or `nexus.settings()` to exist.

If a consumer needs a site wide singleton in `0.1.2`, place it under `pages/` and read it with `getPage`.

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

They are separate and must not be merged in `0.1.2`.

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
Consumer
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
Build Astro example
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

# Initial Milestone

The current milestone, version `0.1.2`, proves the core architecture and its framework neutrality.

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
* no direct provider calls from Astro components

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

# Not Part of Version 0.1.2

Do not implement the following during the current milestone:

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

The purpose of `0.1.2` is to prove the content architecture and its framework neutrality.

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

The consuming application should not need to be rebuilt architecturally every time one of those choices changes.

That separation is the reason NexusContent exists.