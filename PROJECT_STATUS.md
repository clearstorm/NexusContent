# Project Status

## Project Identity

| Field | Value |
|---|---|
| Project name | NexusContent |
| Current version | `0.2.6` |
| Current milestone | `0.3.0-strapi` |
| Project status | Active, early development; internal private package |
| Current focus | `0.2.6` WordPress companion preview in progress; directional `0.3.0` Strapi provider next |

The `0.2.0` WordPress provider milestone was released internally on 2026-08-18. The `0.2.1` WordPress companion milestone (Phases 1-3, admin page, and post section support) and the `0.2.2` core content contract milestone (`schema.models`, declarative field schemas, provider-neutral media, section single-source, component validation, and the dual-provider reference example) were released together on 2026-08-29. The `0.2.3` companion consumer milestone shipped V1 companion section parity, and `0.2.4` fixed the companion posts routing (dedicated posts routes, `companionRoute`, recursive media normalization). The `0.2.5` release adds the `nexus-contract` CLI: `generate` derives a consumer contract from the developer's own field schema and scaffolds ACF layouts for consumer custom sections (offline via the bundled `scripts/sections.json` vocabulary or against the live companion `/schema`), while `push` stores the contract through the admin-only project-contract route with an Application Password. The example's section/push scripts now drive the shipped CLI instead of example-owned scripts. The `0.2.6` release adds WordPress companion preview: the plugin mints short-lived post-scoped preview tokens, serves draft/scheduled content through the public `preview/{token}/{id}` route (the token is the auth), a Gutenberg "Open frontend preview" button opens the configured `preview_frontend_url`, and the astro-wordpress reference consumer fetches the tokenized route from a static `preview.astro` page.

## Current Architecture

```text
Content Source
      |
      v
Provider
      |
      v
NexusContent Core
      |
      v
Consumer Application
```

NexusContent Core is framework neutral. Providers normalize source-specific content behind a shared contract. Consumer applications own routes, presentation, and deployment decisions. The Git provider is Node-specific because it uses filesystem APIs; that runtime requirement is isolated from Core.

## Implemented

- Framework-neutral normalized content types and public exports.
- `ContentSection`, `SectionSettings`, and `PageStatus` types for structured page sections.
- Optional `status`, `excerpt`, `featuredImage`, `modifiedAt`, and `sections` fields on `PageContent`.
- Zod validation schemas for sections, section settings, and page status.
- Generic optional `code` field on `NexusContentErrorDetails` for typed error classification.
- Shared `ContentProvider` interface.
- Provider registration, duplicate detection, and resolution.
- Explicit content-to-provider configuration.
- Page, generic singleton, dedicated navigation, dedicated settings, collection, and individual item retrieval through `NexusContent`.
- Normalization, content provenance, and structured errors.
- Zod-based normalized content validation and consumer schema validation support.
- Normalized SEO contract for robots, canonical URLs, Open Graph, Twitter, media, and JSON-compatible structured data.
- Pure deterministic `resolveSeo` fallback resolution with site title and default image defaults.
- Provider-boundary SEO validation and mapping, with normalized SEO accepted from Git JSON content.
- Consumer-owned Astro SEO rendering with safely escaped JSON-LD.
- Git provider with external content directories and JSON format support.
- Read-only WordPress REST provider for published pages, posts, and explicitly configured custom post types.
- Sequential WordPress collection pagination with verified total headers and explicit `maxPages` failure instead of silent truncation.
- WordPress normalization for rendered content, excerpts, dates, provenance, ACF fields, taxonomy and author IDs, and embedded featured media.
- Actionable WordPress configuration, HTTP, network, timeout, JSON, payload, and pagination errors without exposing authentication headers.
- WordPress Phase 1 configuration: editor mode, API strategy, unknown content policy, media resolution, ACF toggle, and fixed section configuration.
- WordPress Phase 1 section registry with exactly 12 canonical short names: `hero`, `intro`, `rich_text`, `image_text`, `features`, `statistics`, `testimonials`, `gallery`, `cta`, `faq`, `logo_grid`, and `form_embed`.
- WordPress Phase 1 `capabilities()` method returning provider-facing capability report.
- Repaired pre-release companion contract v1 envelopes shaped as `{ contractVersion: 1, data, diagnostics? }` for `nexuscontent/v1` pages, page-by-ID, page-by-slug, posts, post-by-ID, post-by-slug, schema, and capabilities routes.
- WordPress Phase 1 structured diagnostics with severity, code, message, and optional path.
- Expanded WordPress typed error codes covering provider, companion, editor, block, ACF, section, and media failures.
- Missing-content behavior, malformed JSON errors, path traversal protection, and symlink escape protection.
- Provider-neutral singleton retrieval from `singletons/<key>.json` for arbitrary singleton content.
- Dedicated navigation and settings retrieval from `navigation/<key>.json` and `settings/<key>.json`, with recursive navigation validation and generic settings data.
- Git-based CMS compatibility through editor-independent repository files.
- Localisation foundations: optional `locales` configuration, central fallback-chain resolution, strict mode, structured locale errors, and per-request retrieval options.
- Git locale variant directories with legacy flat-file fallback and optional `meta.locale` provenance.
- Astro static-build reference consumers: single-locale and localised Git examples plus a separate single-locale WordPress example, all with explicit consumer-owned routes.
- Plain Node compatibility example and framework-neutrality tests.
- Companion plugin admin page with card-based status dashboard, colored mode badges, responsive section-checkbox grid, and WordPress color scheme variable compatibility. The editor-mode selector, ACF section field groups (fixed and flexible), meta boxes, and block-editor panels cover standard posts as well as pages.
- Fixed admin page "Content by editor mode" to count all published pages and posts, including those without an explicit `nexus_editor_mode` meta row.
- Companion plugin WordPress integration tests passing in CI (84 unit tests, 449 assertions; 13 integration tests, 125 assertions).
- Type checking, tests, package build, Astro example build, and Node example execution in CI.
- Unified `schema.models` configuration with model kinds and provider sources; `source.mode: "page"` vs `"singleton"` selects the provider operation.
- Declarative field schemas with required/list/options/nested-object/reference/media/richText/component/blocks support, `schema.components` references, and retrieval-time `SchemaError` validation.
- Provider-neutral media: `MediaAsset.src`, `MediaReference`, `MediaProviderRegistry`, `ResolveMediaService`, declared-and-auto-built local/remote providers, and a `WordPressMediaProvider` for id lookup.
- Migrated astro-basic, astro-basic-localised, astro-wordpress, and node-basic consumers to `defineNexusConfig` with `schema.models`.
- Companion collection items surface normalized sections as `data.sections`, so Git- and companion-sourced content render through the same consumer components; the astro-wordpress example builds against a local companion API with `apiStrategy: "companion"` and shows Git-vs-WordPress section parity. The built-in `posts` collection routes to the companion `posts` routes (`companionRoute`), section media normalizes `image.url` → `src`, and item `data` surfaces `excerpt`/`featuredImage`.

See the authoritative feature-level status in [FEATURES.md](FEATURES.md).

## Current Work

The `0.2.1` WordPress companion and `0.2.2` core content contract milestones were released together, and the `0.2.3` WordPress companion consumer milestone plus the `0.2.4` posts-routing fix are now released:

- Companion collection items carry normalized sections as `data.sections` (the same `{ type, data }` shape Git blog posts author), verified against a live WordPress companion install; section-less posts keep the raw-HTML fallback.
- The built-in `posts` collection now routes to dedicated companion `posts` routes (plugin `0.1.1`, `companionRoute: "pages" | "posts"`), so the reference consumer's blog shows the actual posts instead of navigation pages; custom collections without a companion route fall back (`auto`) or throw (`companion`). The live wp-env gate verifies the posts route serves the seeded post and rejects page slugs.
- Companion section media is normalized recursively at the TypeScript boundary (`wire image.url` → `MediaAsset src`), and item `data` surfaces the companion `excerpt` and `featuredImage`.
- The astro-wordpress reference example consumes WordPress through `apiStrategy: "companion"` and builds in CI against a local companion API (capabilities, schema, posts, and `posts/slug/{slug}` routes), rendering Git- and companion-sourced sections with parity through the shared `PostSections` components.
- The `nexus-contract` bin (shipped in `@nexuscontent/core` 0.2.5) derives the consumer `{ components, sectionTypes }` contract from the developer's own field schema (`--schema`) and scaffolds a deterministic ACF-layout mu-plugin for consumer custom sections, classifying against the live companion `/schema` or the bundled offline vocabulary. Its `push` subcommand posts the contract to the admin-only project-contract route with an Application Password. This is a user-approved scope exception to the planned `0.7.0` CLI.
- The example's `sections:contract` and `push:project-contract` scripts drive the shipped CLI (`--schema src/schema/schema.ts`, env via `.env`); the example-owned push script was removed.
- The `0.2.6` release adds WordPress companion preview: `POST /nexuscontent/v1/preview-token` (requires `edit_posts`) mints a short-lived, post-scoped token stored in a transient with a filterable TTL; the public `GET /nexuscontent/v1/preview/{token}/{id}` route serves the draft/scheduled normalized content where the token is the auth (invalid/expired/mismatched tokens return 401 and are revoked on use). A Gutenberg "Open frontend preview" button (`assets/src/preview.js`) mints a token and opens the configured `preview_frontend_url` with `?token=...&id=...`. The astro-wordpress reference consumer adds a static `preview.astro` route that resolves the companion namespace from `WORDPRESS_API_URL`, fetches the tokenized route, and renders through the shared `PostSections` components (or the raw-HTML fallback).
- The directional `0.3.0` Strapi provider is the recommended next focus, followed by the `0.2.7` WordPress companion webhooks release within the same 0.2.x consolidation.

## Next

1. Finish the `0.2.6` WordPress companion preview release (integration tests pending against wp-env; then release).
2. Follow with the `0.2.7` WordPress companion webhooks release (outbound HMAC-signed change dispatcher).
3. Begin the directional `0.3.0` Strapi provider; confirm its minimum REST API scope and contract test strategy.

## Not Implementing Yet

- Strapi and other remote CMS providers beyond WordPress (directional `0.3.0`).
- Content synchronization and change detection.
- Webhooks (WordPress companion webhooks are scheduled in `0.2.7`; generic workflows remain directional).
- General-purpose CLI and expanded developer tooling beyond the scoped `nexus-contract` bin (`tooling.nexus-contract-cli` ships from 0.2.5; `tooling.cli` remains planned for 0.7.0).
- Markdown, MDX, YAML, TOML, and CSV Git content formats.
- Framework-specific adapter packages.
- Deployment integrations.
- Admin UI, authentication, forms, databases, queues, and complex caching.
- Translation workflows (state model, locale-specific publishing, completeness reporting, outdated tracking, and source change detection).
- Advanced SEO automation including canonical URL inference, sitemaps, robots.txt, metadata scraping, keyword analysis, redirects, and provider-specific plugin behavior.

## Known Architectural Decisions

- Core is framework neutral.
- Providers do not depend on frontend frameworks.
- Consumers own routes, page composition, presentation, and framework integration.
- Git-based CMS products use the Git provider when repository files are authoritative.
- JSON is the only currently supported Git content format.
- Ordinary Git provider retrieval performs filesystem reads, not Git synchronization commands.
- Deployment is outside Core.
- Astro is a reference consumer, not a Core dependency.
- Provider-specific response structures stop at the provider boundary.
- Multiple instances of the same provider type must remain possible.
- Generic singleton retrieval is provider-neutral; Git stores arbitrary singleton content under `singletons/<key>.json`.
- Navigation and settings remain dedicated provider operations and Git directories, declared as distinct model kinds under `schema.models`.
- Locale resolution is centralized in Core; providers implement variant file resolution; format adapters and validators implement no locale logic.
- Locale requests fall back through an explicit chain to the configured default; projects without locale configuration keep the legacy flat retrieval path unchanged.
- Core owns normalized SEO data, validation, and deterministic fallback resolution; providers map source-specific fields and consumers render metadata.
- The base WordPress provider uses the public REST API directly, remains plugin-neutral, and does not add WordPress behavior to Core.
- WordPress collection pages are loaded sequentially and inconsistent or excessive pagination fails explicitly.
- The companion plugin is isolated under `integrations/wordpress/nexuscontent`; it owns WordPress editor integration and companion REST transport, while the TypeScript provider owns consumer-facing retrieval and normalization.
- The repaired contract is pre-release. It does not alter released `0.2.0` retrieval behavior, and Phase 3 must not consume it until plugin integration verification passes.
- The `0.2.2` `schema.models` contract consolidates logical content mapping; media references and fields are value-neutral until resolved through `nexus.media`.
- Media reference resolution order is the reference provider (carrying any field `media` override), then the per-request `defaultProvider`, then the configured project default.

## Known Issues or Constraints

- The Git provider requires Node filesystem APIs.
- Git content supports JSON only.
- Generic singleton content remains separate from dedicated navigation and settings content and APIs.
- Localisation covers locale configuration, fallback resolution, and Git variant directories; translation workflows are not implemented.
- WordPress support is published-content-only and read-only; preview, webhooks, mutations, retries, and caching are not implemented.
- The companion plugin normalizes supported Gutenberg content; the released base provider still does not render Gutenberg blocks or call the plugin.
- The base WordPress provider has no plugin SEO, locale-plugin, WooCommerce, discovery, or multisite-specific integration.
- WordPress localisation options are ignored, and there is no localised WordPress Astro example.
- Embedded featured media increases REST response payload; media synchronization and taxonomy caching are not implemented.
- No synchronization, webhook, or preview workflow is implemented.
- Canonical URLs are supplied by content or consumers because Core does not know deployment URLs.
- The package remains private while the pre-1.0 architecture is proven.
- The companion plugin is implemented, passes CI, and ships in the `0.2.1` release (`dist/nexuscontent-0.1.1.zip`).
- Phase 3 provider discovery, calls, version negotiation, caching, and fallback are implemented with tests; the `ts-integration` CI job passes a live integration test against a fresh Docker wp-env companion install.
- The `0.2.2` field schema validates data at retrieval time; models without declared fields skip validation so provider-owned shapes (WordPress, arbitrary fixtures) remain unconstrained.
- The `0.2.5` `nexus-contract` CLI executes `--schema` derivation against a placeholder WordPress root when run offline (no `effectiveRegistry()` network call at `core` strategy); the live `/schema` fetch and `push` require network and credentials.
- Example-owned contracts are not committed: `sections.custom.json` declares no custom sections, `generate` warns about unused custom declarations, and pushed contracts are stored only on the plugin side as `project_components`.

## Project State Authority

- [README.md](README.md): project identity and usage.
- [AGENTS.md](AGENTS.md): architectural modification rules.
- [FEATURES.md](FEATURES.md) and [project.state.json](project.state.json): current implementation status.
- [PROJECT_STATUS.md](PROJECT_STATUS.md): current focus and immediate next work.
- [ROADMAP.md](ROADMAP.md): planned sequencing.
- [CHANGELOG.md](CHANGELOG.md): released history.
- Tests and implementation: final technical evidence when documented status is disputed.

`FEATURES.md` is the primary human-readable feature matrix. `project.state.json` is the primary machine-readable state representation. A feature status change must update both in the same pull request.

## Links

- [README.md](README.md)
- [FEATURES.md](FEATURES.md)
- [ROADMAP.md](ROADMAP.md)
- [CHANGELOG.md](CHANGELOG.md)
- [AGENTS.md](AGENTS.md)
