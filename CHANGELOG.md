# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- The companion plugin now emits the post's rendered body as `rawFields.content` (the same HTML the WordPress core REST API exposes as `content.rendered`) on every normalized page and post, alongside the existing `rawFields.editorMode`. Posts that yield no structured sections (for example content not authored with the provided section blocks, or posts read in an empty ACF editor mode) previously reached consumers with no body at all; the astro-wordpress consumer's raw-HTML fallback now renders them end-to-end. Rendered HTML remains untrusted external content owned by the consumer.

### Changed

- The astro-wordpress example keeps Gutenberg's own styling on raw-HTML fallback post bodies: `npm run build` vendors WordPress' `wp-includes/css/dist/block-library/style.min.css` and `theme.min.css` from the `WORDPRESS_API_URL` origin into `public/gutenberg/` (build artifact, gitignored), so the static `dist/` stays self-contained. A consumer-owned prose layer in `[slug].astro` covers typography, image scaling, tables, and confines Gutenberg `alignwide`/`alignfull` to the post column. If the WordPress origin is unreachable the build warns and fallback bodies render unstyled.

## [0.2.5] - 2026-08-29

NexusContent CLI and consumer custom-section scaffolding release.

### Added

- The `nexus-contract` npm bin ships with `@nexuscontent/core` (`scripts/nexus-contract.mjs`, declared under `bin`): `generate` and `push` subcommands derive a `{ components, sectionTypes }` contract from the consumer's own field schema (`--schema`, imported at runtime and passed through `projectComponentContract`) or read it directly (`--contract`).
  - `generate` classifies the contract against the installed section vocabulary, flags missing and unused declared types, and scaffolds a WordPress mu-plugin of ACF layouts for consumer custom sections (deterministic PHP, both the `nexuscontent_section_definitions` and `nexuscontent_block_implementations` filters). With `--api-root` it fetches the live companion `/schema` route (contract v1 envelope); otherwise it falls back to the bundled vocabulary.
  - `push` posts the consumer contract to the admin-only `nexuscontent/v1/project-contract` route using an Application Password (`--api-root`, `--username`, `--app-password`, or `WORDPRESS_API_URL`, `WORDPRESS_USERNAME`, `WORDPRESS_APP_PASSWORD`).
- Bundled offline vocabulary: `scripts/generate-sections.mjs` now also writes `scripts/sections.json`, an exact copy of the canonical `integrations/wordpress/nexuscontent/sections.json`, so classification runs without network access; `npm run check:sections` verifies the copy matches.
- The astro-wordpress example now drives both flows through the shipped CLI: `sections:contract` scaffolds layouts and `push:project-contract` posts its schema (`sections.custom.json` declares no custom sections out of the box). The example-owned `push-project-contract.mjs` was removed; installed consumers use `npx @nexuscontent/core nexus-contract …`.
- `AcfFeatureDoubleIntegrationTest` proves the ACF field factory registers the canonical section field groups (fixed Hero/Intro/CTA and flexible layouts for the other sections).

The CLI is a deliberate, user-approved scope exception to the planned `0.7.0` CLI milestone because the WordPress companion contract is the first capability to genuinely need one; the general-purpose CLI remains planned.

## [0.2.4] - 2026-08-29

### Fixed

- The companion plugin now registers dedicated `posts`, `posts/{id}`, and `posts/slug/{slug}` routes under `nexuscontent/v1`, fixing the reversed routing that served navigation pages as blog posts: `get_pages`/`get_page`/`get_page_by_slug` are post-type-aware, individual lookups reject the wrong post type, and permission checks use `read_private_posts`/`edit_posts` for posts. The plugin artifact is now `dist/nexuscontent-0.1.1.zip`.
- The WordPress provider now maps the built-in `posts` collection to the companion `posts` routes (`WordPressCollectionConfig.companionRoute: "pages" | "posts"`, default `"posts"` for the built-in collection). Custom collections without a `companionRoute` fall back to standard REST under `auto` or throw an actionable error under strict `companion`.
- Companion section media is normalized recursively: wire media (`image.url` with size/metadata fields) becomes `MediaAsset src` inside section `data`, fixing image parity so companion-backed sections render through the same components as Git galleries. Item `data` now also surfaces the companion `excerpt` and `featuredImage`.
- The astro-wordpress reference example (and its CI mock) now serves blog posts from the `posts` routes, so the built blog index shows the actual posts instead of navigation pages.

## [0.2.3] - 2026-08-29

WordPress companion consumer release.

### Added

- Companion collection items now carry normalized sections as `data.sections`, the same canonical `{ type, data }` shape Git blog posts author, so companion-backed WordPress content renders through the identical consumer components as Git content. Posts with no sections keep the raw-HTML fallback.
- The astro-wordpress reference example now consumes WordPress through the Phase 3 companion path (`apiStrategy: "companion"`): its blog collection builds against a local companion API in CI (capabilities, schema, pages, and page-by-slug routes), and Git- and companion-sourced sections render with parity through the shared `PostSections` components. `auto` and `core` remain available for fallback or plugin-free retrieval.

## [0.2.2] - 2026-08-29

Core content contract and media release.

### Added

- Unified `schema.models` content configuration replacing the root `content`, `navigation`, and `settings` sections. Each model declares a `kind` (`singleton`, `collection`, `navigation`, `settings`) and a provider `source` (`key`, plus `mode: "page"` or `"singleton"` for singletons). `defineNexusConfig()` validates the shape and provider/source relationships.
- Declarative field schemas (`core.schema.fields`): `string`, `number`, `boolean`, `datetime`, `object`, `reference`, `media`, `richText`, `component`, and `blocks` types with `required`, `list`, `options`, nested `object.fields`, `reference.collection` targets, and `media` overrides. `component` fields reference declared `schema.components`; `blocks` fields validate a discriminated `_type` list against `allowedComponents`. Model data is validated at retrieval time; a mismatch throws `SchemaError` with model and field issue paths. Undeclared data fields pass through.
- Provider-neutral media architecture: `MediaProvider` contract, `MediaReference`, `MediaProviderRegistry`, `ResolveMediaService`, and the `nexus.media` resolution entry point. `defineLocalMediaProvider` maps root-relative `src` references to `publicPath` web URLs with traversal protection; `defineRemoteMediaProvider` validates absolute http(s) URLs without fetching. Declared `local` and `remote` media providers are auto-built by Core and validated at configuration time.
- `WordPressMediaProvider` resolving id references through the WordPress `media` endpoint (404 becomes `null`), with src-only passthrough and configurable name for `nexus.registerMedia`.
- `ModelSchema` relational validation (`validateModelRelations`) covering provider existence, singleton-only `mode`, reference targets, and media overrides for both `defineNexusConfig` and direct `NexusContent` construction.
- Schema-driven TypeScript inference for model names and returned `data`, including kind-specific retrieval methods and explicit generic overrides where needed.
- Migrated `astro-basic`, `astro-basic-localised`, `astro-wordpress`, and `node-basic` consumers to `defineNexusConfig` with `schema.models`.
- Git content examples: pages declare named `component` fields (`hero`, `servicesList`, `testimonialsList`, ...) and compose components directly in the page template; the blog collection keeps a `body` `blocks` list rendered through a small example-owned block renderer. Media embedded in either path resolves through `nexus.media` (default `local`, `remote` override on one reference). The localised example follows the same structure per locale.
- Astro example type-checking with `@astrojs/check`, enforced in CI.
- WordPress section registry reconciliation: the provider merges live companion `/schema` section definitions into its effective registry during auto/companion discovery, reports install-only, registry-only, and conflict deltas as structured diagnostics, and throws an actionable error in strict companion mode. Reconcile transport failures are advisory at build time; only drift throws in strict mode.
- WordPress component validation: `validateWordPressComponents` throws `wordpress/unknown-component` for unresolvable declared component names and reports canonical-field deltas as `wordpress/field-delta` warnings with an optional `strictFields` promotion; `componentTypeMap` bridges renamed consumer components. `projectComponentContract(schema)` derives the serializable `{ components, sectionTypes }` contract.
- WordPress/companion section single source: `integrations/wordpress/nexuscontent/sections.json` is canonical for all 12 sections (type, fixed flag, label, fields); the PHP `Section_Registry` loads it (deriving labels and fixed field keys), `npm run generate:sections` emits the committed `sections.generated.ts`, and `npm run check:sections` enforces freshness in CI.
- Secured project-contract push: `POST /nexuscontent/v1/project-contract` (manage_options only; WordPress core enforces the REST nonce for cookie-authenticated requests while Application Passwords work without one, outside the content wire contract) stores sanitized, deduplicated component/`sectionTypes` arrays as `project_components` inside `nexuscontent_settings`. The plugin admin Dashboard gains a read-only "Project contract" card showing expected vs install-available vs enabled drift.
- The astro-wordpress reference example gains its own `push:project-contract` npm script (`examples/astro-wordpress/scripts/push-project-contract.mjs`, run inside the example, loading its `.env`) that pushes the consumer schema to the companion route via an Application Password. After installation, consumers push through the public `projectComponentContract()` API plus their own POST or curl.
- The astro-wordpress reference example becomes a dual-provider consumer: every `schema.models` entry declares its own `source.provider` (Git by default, `"wordpress"` per model to flip), the schema declares all twelve canonical sections as components (no `button`; action fields such as `primary_action_label`/`primary_action_url`), pages compose the canonical components, and blog posts carry a `sections` object list in the `{ type, data }` wire shape rendered by a consumer-owned `PostSections` dispatcher. Base `gutenberg`/`acf_flexible` retrieval emits `data.sections` from `content.rendered`/ACF layouts, with normalized `MediaAsset` media in section image fields.
- Companion plugin hygiene: canonical labels/fixed flags/field keys derive from the registry everywhere; dead `panel_available()` hook and its filter removed; `Block_Loader::block_types()` is registry-derived; canonical repo URL single-sourced via `Admin_Page::repo_url()`; stale Phase 3 / "Tested up to" docs corrected.
- Companion plugin post support: the editor-mode selector, ACF section field groups (fixed and flexible), meta boxes, block-editor panels, and the admin Dashboard breakdown/recent-content cards now cover standard posts as well as pages. Posts normalize to `data.sections` in `gutenberg` and `acf_flexible` modes; the provider and wire contract were already post-agnostic, so no TypeScript contract changes were required.

### Changed

- `MediaAsset` replaces `url` with `src` and adds `provider` and `sourceId`. `MediaSize` and `sizes` keep `url`. The companion wire contract and plugin keep `featuredImage.url`; the TypeScript boundary converts it to `src`.
- `NexusContentErrorDetails` and `NexusContentError` support an optional `model` field; `SchemaError` (extends `ValidationError`) carries `model` and field issues.
- Removed the root `content`, `navigation`, and `settings` configuration sections and the `resolveContentConfig` / `resolveNavigationConfig` / `resolveSettingsConfig` helpers. Consumers must migrate to `schema.models`.
- WordPress page retrieval routes through `getPage` when the model declares `source.mode: "page"`; `getSingleton` throws a `ProviderError` for page-routed models.
- Standard REST WordPress ACF fields are flattened onto `data`; reserved normalized keys cannot be replaced by colliding ACF fields. The WordPress Astro example uses the plugin-neutral `core` API strategy and explicit page composition.
- WordPress standard REST excerpts are normalized to plain text: the `excerpt.rendered` `<p>` wrapper and inline tags are stripped and whitespace collapsed, so cards and SEO descriptions no longer render literal markup. The companion plugin already returned plain-text excerpts.

## [0.2.1] - 2026-08-29

WordPress companion release: Phase 1 repaired contracts, Phase 2 plugin, and Phase 3 provider integration.

### Added

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
