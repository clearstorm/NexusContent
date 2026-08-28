# Project Status

## Project Identity

| Field | Value |
|---|---|
| Project name | NexusContent |
| Current version | `0.2.2` |
| Current milestone | `0.2.3-wordpress-companion-consumer` |
| Project status | Active, early development; internal private package |
| Current focus | Released `0.2.1` + `0.2.2`; `0.2.3` companion consumption in the reference example is next |

The `0.2.0` WordPress provider milestone was released internally on 2026-08-18. The `0.2.1` WordPress companion milestone (Phases 1-3, admin page, and post section support) and the `0.2.2` core content contract milestone (`schema.models`, declarative field schemas, provider-neutral media, section single-source, component validation, and the dual-provider reference example) were released together on 2026-08-29. The `0.2.2` release closes the `core.schema.models` contract: a unified `schema.models` configuration (model kinds, provider sources, field schemas) and a provider-neutral media architecture (`MediaAsset.src`, local/remote/WordPress media providers, and a `nexus.media` resolution entry point), plus WordPress section synchronisation (`sections.json` single source with generated TS and `npm run check:sections`, live `/schema` registry reconciliation, `validateWordPressComponents`, and a secured admin-only project-contract push whose Dashboard card shows expected-vs-installed drift) and companion plugin hygiene and post support.

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
- Repaired pre-release companion contract v1 envelopes shaped as `{ contractVersion: 1, data, diagnostics? }` for `nexuscontent/v1` pages, page-by-ID, page-by-slug, schema, and capabilities routes.
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

See the authoritative feature-level status in [FEATURES.md](FEATURES.md).

## Current Work

The `0.2.1` WordPress companion and `0.2.2` core content contract milestones are released. The next milestone is `0.2.3-wordpress-companion-consumer`:

- Make the reference consumer prove the Phase 3 companion path: surface normalized companion sections onto collection items (`data.sections`), flip the astro-wordpress example to `apiStrategy: "companion"`, and verify Git-vs-WordPress section parity (including gallery posts) through the shared `PostSections` components.
- The directional `0.3.0` Strapi provider remains the long-term next provider after `0.2.3`.

## Next

1. Release `0.2.1` + `0.2.2` is cut; the `0.2.3` milestone consumes the companion from the reference example (companion item sections, example `apiStrategy` flip, Git-vs-WordPress section parity).
2. Confirm the Strapi provider's minimum REST API scope and contract test strategy for the directional `0.3.0`.
3. Consider the directional localisation continuation once provider breadth is proven.

## Not Implementing Yet

- Strapi and other remote CMS providers beyond WordPress.
- Content synchronization and change detection.
- Webhooks and automated rebuild workflows.
- Draft preview.
- CLI and expanded developer tooling.
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
- The companion plugin is implemented, passes CI, and ships in the `0.2.1` release (`dist/nexuscontent-0.1.0.zip`).
- Phase 3 provider discovery, calls, version negotiation, caching, and fallback are implemented with tests; the `ts-integration` CI job passes a live integration test against a fresh Docker wp-env companion install.
- The `0.2.2` field schema validates data at retrieval time; models without declared fields skip validation so provider-owned shapes (WordPress, arbitrary fixtures) remain unconstrained.

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
