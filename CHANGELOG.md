# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Unified `schema.models` content configuration replacing the root `content`, `navigation`, and `settings` sections. Each model declares a `kind` (`singleton`, `collection`, `navigation`, `settings`) and a provider `source` (`key`, plus `mode: "page"` or `"singleton"` for singletons). `defineNexusConfig()` validates the shape and provider/source relationships.
- Declarative field schemas (`core.schema.fields`): `string`, `number`, `boolean`, `datetime`, `object`, `reference`, `media`, and `richText` types with `required`, `list`, `options`, nested `object.fields`, `reference.collection` targets, and `media` overrides. Model data is validated at retrieval time; a mismatch throws `SchemaError` with model and field issue paths. Undeclared data fields pass through.
- Provider-neutral media architecture: `MediaProvider` contract, `MediaReference`, `MediaProviderRegistry`, `ResolveMediaService`, and the `nexus.media` resolution entry point. `defineLocalMediaProvider` maps root-relative `src` references to `publicPath` web URLs with traversal protection; `defineRemoteMediaProvider` validates absolute http(s) URLs without fetching. Declared `local` and `remote` media providers are auto-built by Core and validated at configuration time.
- `WordPressMediaProvider` resolving id references through the WordPress `media` endpoint (404 becomes `null`), with src-only passthrough and configurable name for `nexus.registerMedia`.
- `ModelSchema` relational validation (`validateModelRelations`) covering provider existence, singleton-only `mode`, reference targets, and media overrides for both `defineNexusConfig` and direct `NexusContent` construction.
- Schema-driven TypeScript inference for model names and returned `data`, including kind-specific retrieval methods and explicit generic overrides where needed.
- Migrated `astro-basic`, `astro-basic-localised`, `astro-wordpress`, and `node-basic` consumers to `defineNexusConfig` with `schema.models`.
- Astro example type-checking with `@astrojs/check`, enforced in CI.

### Changed

- `MediaAsset` replaces `url` with `src` and adds `provider` and `sourceId`. `MediaSize` and `sizes` keep `url`. The companion wire contract and plugin keep `featuredImage.url`; the TypeScript boundary converts it to `src`.
- `NexusContentErrorDetails` and `NexusContentError` support an optional `model` field; `SchemaError` (extends `ValidationError`) carries `model` and field issues.
- Removed the root `content`, `navigation`, and `settings` configuration sections and the `resolveContentConfig` / `resolveNavigationConfig` / `resolveSettingsConfig` helpers. Consumers must migrate to `schema.models`.
- WordPress page retrieval routes through `getPage` when the model declares `source.mode: "page"`; `getSingleton` throws a `ProviderError` for page-routed models.
- Standard REST WordPress ACF fields are flattened onto `data`; reserved normalized keys cannot be replaced by colliding ACF fields. The WordPress Astro example uses the plugin-neutral `core` API strategy and explicit page composition.

- `ContentSection<TData>` and `SectionSettings` types for structured page sections in Core.
- `PageStatus` type (`"draft" | "published" | "archived"`) and optional `status`, `excerpt`, `featuredImage`, `modifiedAt`, and `sections` fields on `PageContent`.
- `contentSectionSchema`, `sectionSettingsSchema`, and `pageStatusSchema` Zod validation schemas for the new section contracts.
- Generic optional `code` field on `NexusContentErrorDetails` and `NexusContentError` for typed error classification.
- WordPress Phase 1 configuration options: `editorMode`, `apiStrategy`, `unknownContentPolicy`, `mediaResolution`, `acf`, `fixedSections`, `customSections`, and `sectionRegistry` on `WordPressProviderOptions`.
- WordPress Phase 1 section registry: `buildSectionRegistry`, `mergeSectionRegistry`, `lookupSectionSourceAlias`, `SectionDefinition`, `SectionRegistry`, and exactly 12 canonical short section names (`hero`, `intro`, `rich_text`, `image_text`, `features`, `statistics`, `testimonials`, `gallery`, `cta`, `faq`, `logo_grid`, `form_embed`).
- WordPress Phase 1 `capabilities()` method on `WordPressProvider` returning provider-facing capability report.
- WordPress Phase 1 companion wire contracts for pages, page by ID, page by slug, schema, and capabilities under `nexuscontent/v1`.
- Expanded typed WordPress errors for companion response, editor mode, block, ACF block/layout, fixed section, section source, media resolution, and conflicting-source failures.
- Canonical test fixtures for companion wire responses, source ACF sections, and invalid contract shapes.
- Contract validation tests for section schemas, config enums, registry operations, capabilities, wire contract structure, error codes, and public exports.
- WordPress companion plugin `0.1.0` source under `integrations/wordpress/nexuscontent`, isolated from Core and the standard REST provider.
- Native Gutenberg normalization, ACF Free fixed Hero/Introduction/Call to Action fields, ACF Pro flexible layouts for all 12 canonical sections, opt-in ACF Blocks, and page editor-mode controls.
- Server-side page, section, media, capability, and diagnostic normalization with secured read-only REST routes.
- Companion plugin unit, integration, contract, lint, static-analysis, asset, documentation, CI, and ZIP packaging infrastructure; the package artifact is `dist/nexuscontent-0.1.0.zip`.
- WordPress companion plugin admin page with plugin status dashboard (version, WordPress/PHP version, ACF detection, editor modes, page breakdown, section registry count) and settings (default editor mode, enabled section types, media resolution).
- Packaged static inserter and inspector illustrations for all 12 NexusContent blocks, plus editable Gutenberg layouts with inline primary content and additional section fields.
- Admin page card-based layout with status indicators, colored mode badges, and a responsive section-checkbox grid.
- Admin page CSS (`assets/build/admin.css`) using WordPress admin color scheme variables for theme compatibility.
- Admin page split into two separate pages: a focused Dashboard (plugin status + pages-by-editor-mode breakdown) and a dedicated Settings page (default editor mode, enabled sections, media resolution).
- Block preview rendering: removed server-side `getBlockType` bail-out check so client-side `registerBlockType()` always merges the `edit` function, enabling static SVG previews for all 12 blocks.
- Admin dashboard redesigned with five cards: Plugin Status, Pages by editor mode, Blocks overview (enabled/disabled count with shortcut to Settings), Recent pages (last 5 modified with mode badge), and Quick links.
- Admin Settings page now uses toggle switches for each of the 12 section types; disabled blocks are hidden from the Gutenberg block inserter both server-side (PHP) and client-side (JS).
- Admin About page with plugin info, requirements, 5-step getting started guide, documentation links, and feature highlights.
- Block loader reads the `nexuscontent_settings` option's `enabled_sections` array and passes it to the editor via `wp_localize_script`; disabled types are excluded from server-side registration and unregistered client-side.
- Phase 3 companion provider integration: provider discovery, companion calls, contract-version negotiation, caching, and fallback against the repaired contract. A live integration test (`tests/providers/wordpress-companion-live.test.ts`) runs the provider against a fresh Docker wp-env companion install in the `ts-integration` CI job; the suite passes, satisfying the enforced live-plugin gate.

### Changed

- Exposed Gutenberg eyebrow, section ID, variant, and theme controls in an Additional fields panel; generated section IDs now preserve manual overrides.
- Expanded Gutenberg Logo Grid items to accept a label, a logo image, or both while retaining the existing ACF `name` and `logo` storage keys.
- Extended `PageContent` with optional canonical fields for status, excerpt, featured image, modified date, and sections; all fields remain optional and do not break existing consumers.
- Updated `pageSchema` validation to accept the new optional fields without changing required field semantics.
- Repaired the unreleased contract v1 to use `{ contractVersion: 1, data, diagnostics? }`, editor modes `gutenberg` / `acf_flexible` / `acf_fixed`, the 12 canonical short section names, expanded media metadata, exact runtime capabilities, and the five `nexuscontent/v1` route contracts.
- Kept released `0.2.0` standard REST provider retrieval unchanged; it does not call the companion plugin.

### Fixed

- Admin page "Pages by editor mode" now counts all published pages, including those without an explicit `nexus_editor_mode` meta row. Pages without the meta value default to the Block editor count, matching the `Editor_Mode::get()` fallback behaviour.
- Block previews now render in the editor. Removed the `wp.blocks.getBlockType()` bail-out check that prevented client-side `registerBlockType()` from merging the `edit` function with SVG preview support.

### In Progress

- `core.schema.models` (the consolidated `schema.models` contract and media architecture) targets `0.2.2`.
- All `0.2.1` phases are implemented and pass CI, but version `0.2.1` and the companion plugin are unreleased; the root package is now `0.2.2`.

## [0.2.0] - 2026-08-18

WordPress provider release.

### Added

- Read-only, plugin-neutral `WordPressProvider` for published WordPress REST API v2 pages, posts, and explicitly configured custom post types.
- Page lookup by slug plus collection and individual item retrieval through the existing `NexusContent` service API.
- Sequential collection pagination using `X-WP-Total` and `X-WP-TotalPages`, with consistency checks and explicit `maxPages` failure instead of silent truncation.
- WordPress normalization for rendered title, content and excerpt, published and modified dates, source URL, provenance, author/category/tag IDs, ACF fields, and embedded featured media.
- Configurable provider name, request headers, custom collection endpoints, page size, maximum pages, and timeout.
- Actionable WordPress configuration, HTTP, network, timeout, JSON, payload, and pagination errors without exposing authentication header values.
- Public `WordPressProvider`, `WordPressProviderOptions`, `WordPressCollectionConfig`, and `WordPressContentData` exports.
- Deterministic WordPress provider tests and a plain Node compatibility test without Astro.
- `examples/astro-wordpress/` with static-build tests against a local REST fixture server.

### Changed

- Split the Git Astro reference into single-locale `examples/astro-basic/` and localised `examples/astro-basic-localised/`, expanded it to the complete five-page example, and separated configuration from service wiring.
- Added locale-aware navigation and settings, content-driven language switching, and a dependency-free design refresh to the Git Astro examples.
- Documented and verified the GitHub-hosted content repository clone, `NEXUS_GIT_CONTENT_PATH`, and build workflow.
- Established Strapi as the recommended next provider focus for `0.3.0`.

### Known limitations

- WordPress access is published-content-only and read-only; preview, webhooks, mutations, synchronization, retries, and caching are not implemented.
- The base provider does not implement shortcode conversion, Gutenberg rendering, taxonomy caching, media synchronization, plugin SEO, WordPress localisation plugins, endpoint discovery, WooCommerce, or verified multisite behavior.
- Locale retrieval options are ignored by the base provider; no localised WordPress Astro example is included.
- Rendered WordPress HTML must be trusted or sanitized by the consuming application.
- Embedded featured-media requests increase REST payload and processing cost.

## [0.1.4] - 2026-08-17

SEO foundations release.

### Added

- Public `SeoRobots`, `SeoOpenGraph`, and `SeoTwitter` types, plus JSON-compatible `JsonObject` and `JsonValue` types for structured data.
- Expanded `SeoData` with `canonicalUrl`, robots directives, Open Graph, Twitter, and `structuredData`; `PageContent.seo` remains optional.
- Pure `resolveSeo(input, defaults?)` resolution with deterministic title, description, image, Open Graph, Twitter, and legacy canonical fallbacks.
- Normalized SEO validation for canonical URLs, social metadata, media, robots directives, Twitter cards, and JSON-compatible structured data.
- Git provider coverage proving normalized SEO passes through the provider boundary and pages without SEO remain valid.
- Consumer-owned `NexusSeo.astro` components and complete page integration in both Astro examples.
- Safe JSON-LD serialization that escapes `<`, `>`, `&`, U+2028, and U+2029 before inline script rendering.
- Core, validation, provider, framework-boundary, Astro rendering, and structured-data safety tests for the SEO contract.

### Changed

- Deprecated `SeoData.canonical` in favor of `canonicalUrl`; `resolveSeo` continues to read `canonical` as a migration fallback without returning it.
- Clarified the SEO responsibility boundary: Core owns normalized data, validation, and resolution; providers map source fields; consumers own rendering and canonical URL construction.

### Excluded

- Automatic canonical URL inference, sitemap and robots.txt generation, keyword analysis, redirects, metadata scraping, analytics, and provider-specific SEO plugin integrations remain out of scope.

## [0.1.3] - 2026-08-16

Localisation foundations release.

### Added

- Optional `locales` configuration (`default`, `supported`, optional `fallback`) on `NexusConfig`.
- Central `LocaleResolver` with deterministic fallback chains, strict mode, duplicate and invalid tag detection, and circular chain rejection.
- Structured locale errors: `LocaleError`, `UnsupportedLocaleError`, and `MissingLocaleVariantError`, with `locale`, `supportedLocales`, and fallback `chain` details.
- Per-request retrieval options (`locale` and `fallback`) on `getPage`, `getSingleton`, `getNavigation`, `getSettings`, `getCollection`, and `getItem`.
- Git locale variant directories (`pages/<locale>/<key>.json` and equivalent layout for singletons, navigation, settings, collections, and items) with legacy flat-file fallback.
- Optional `meta.locale` provenance recorded from the resolved locale variant directory.
- Typed `TranslationState` and `LocaleVariantInfo` extension points for a future translation workflow.
- Tests for locale resolution, locale-aware service forwarding, Git variant loading, flat-file backward compatibility, strict missing-variant errors, and locale path-segment hardening.

### Changed

- The legacy flat retrieval path is preserved byte-identical when a project does not configure locales.
- The Astro example content helper functions accept and forward optional retrieval options.

## [0.1.2] - 2026-08-15

Internal architecture hardening release.

### Added

- Added dedicated navigation and settings retrieval to the 0.1.2 foundation while retaining generic singleton retrieval for arbitrary singleton content.
- Added coordinated project state tracking through `PROJECT_STATUS.md`, `FEATURES.md`, `ROADMAP.md`, and `project.state.json`.
- Added dependency-free project state validation to keep feature IDs, statuses, and package version metadata synchronized.
- Added provider-neutral singleton retrieval through `getSingleton`, with arbitrary Git singleton content stored under `singletons/<key>.json`.
- Added dedicated `getNavigation` and `getSettings` APIs, configuration sections, normalized public types, validation, and Git storage under `navigation/<key>.json` and `settings/<key>.json`.
- Updated the Astro and plain Node examples to consume the dedicated navigation and settings APIs.

### Changed

- Isolated Git content JSON parsing and serialization behind an internal format adapter (`src/formats/`) so providers read and write files without depending on how a format is handled.
- Hardened Git content-root containment against symlink escapes while preserving missing-content behavior.
- Preserved invalid provider `data` values through normalization so validation rejects malformed external content instead of receiving an empty object.
- Updated the Astro dynamic blog route to keep public slugs separate from provider item keys.
- Expanded Core and Git provider tests for provider failures, malformed data, and symlink escapes.
- Clarified that `0.1.2` is an internal private milestone and that the repository uses the MIT License.

## [0.1.1] - 2026-08-15

Architectural compatibility release that makes framework neutrality explicit.

### Added

- Plain Node compatibility example (`examples/node-basic`) proving NexusContent Core works without Astro installed.
- Framework neutrality tests (`tests/compat`) covering framework imports, framework specific globals, runtime dependencies, and plain Node consumption.
- CI stage that runs the plain Node compatibility example.
- Documented Git based CMS compatibility through the existing Git provider.
- Clarified the distinction between content editing systems and content providers.
- Documented JSON as the supported Git content format for the 0.1.1 workflow.
- Added compatibility tests for externally managed Git content repositories (unrelated CMS files are ignored).

### Changed

- Aligned README with the framework neutral architecture: Astro is documented as the first reference consumer rather than an architectural owner.
- Clarified in AGENTS.md that Core must not depend on Astro, Next.js, React, Vue, Svelte, or any other frontend framework.
- Aligned README examples with the implemented API (`new NexusContent`, `getPage`, `getCollection`, `getItem`, `register`).
- Added AGENTS.md agent engineering guide and aligned it with the v0.1.0 implementation.
- Hardened the Git provider against path traversal: content keys are now verified to resolve inside the configured content root before any filesystem access.
- Added the plain Node compatibility example to the npm workspaces.

## [0.1.0] - 2026-08-14

Initial milestone. Proves the core content architecture.

### Added

- Normalized content types (`PageContent`, `CollectionItem`, `ContentMeta`, `MediaAsset`, `SeoData`).
- `ContentProvider` contract (`getPage`, `getCollection`, `getItem`).
- Provider registry with duplicate and missing provider errors.
- NexusContent configuration and content-to-provider resolution.
- Content service pipeline: resolve → provider → normalize → validate.
- Structured errors (`NexusContentError`, `ConfigError`, `RegistryError`, `ProviderError`, `ValidationError`, `NotFoundError`).
- Git content provider with external content directory, JSON loading, normalization, and content provenance.
- Runtime validation using Zod with clear, field-level validation errors.
- Astro basic example (`examples/astro-basic`) with home, about, and blog collection pages.
- Example content repository with pages and a posts collection.
- Test suite for core, Git provider, and validation.
- GitHub Actions CI workflow.
- MIT license, contributing guidelines, and changelog.
