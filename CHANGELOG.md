# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `ContentSection<TData>` and `SectionSettings` types for structured page sections in Core.
- `PageStatus` type (`"draft" | "published" | "archived"`) and optional `status`, `excerpt`, `featuredImage`, `modifiedAt`, and `sections` fields on `PageContent`.
- `contentSectionSchema`, `sectionSettingsSchema`, and `pageStatusSchema` Zod validation schemas for the new section contracts.
- Generic optional `code` field on `NexusContentErrorDetails` and `NexusContentError` for typed error classification.
- WordPress Phase 1 configuration options: `editorMode`, `apiStrategy`, `unknownContentPolicy`, `mediaResolution`, `acf`, `fixedSections`, `customSections`, and `sectionRegistry` on `WordPressProviderOptions`.
- WordPress Phase 1 section registry: `buildSectionRegistry`, `mergeSectionRegistry`, `lookupSectionSourceAlias`, `SectionDefinition`, `SectionRegistry`, and all 13 built-in fixed section types.
- WordPress Phase 1 `capabilities()` method on `WordPressProvider` returning provider-facing capability report.
- WordPress Phase 1 companion wire contracts: `WordPressPageResponse`, `WordPressPagesResponse`, `WordPressSchemaResponse`, `WordPressSectionsResponse`, `WordPressHealthResponse`, `WordPressDiagnostic`, `WordPressCapabilities`, and `WordPressProviderFacingCapabilities` with contract version 1 and reserved `companion/` namespace.
- WordPress Phase 1 error codes: 32 typed error codes under `WORDPRESS_ERROR_CODES` covering config, HTTP, network, JSON, pagination, section, content, media, and ACF categories.
- Canonical test fixtures for companion wire responses, source ACF sections, and invalid contract shapes.
- Contract validation tests for section schemas, config enums, registry operations, capabilities, wire contract structure, error codes, and public exports.

### Changed

- Extended `PageContent` with optional canonical fields for status, excerpt, featured image, modified date, and sections; all fields remain optional and do not break existing consumers.
- Updated `pageSchema` validation to accept the new optional fields without changing required field semantics.

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
- Locale retrieval options are ignored by the base provider; the localised Astro example intentionally renders the same WordPress source content under English and French consumer-owned routes.
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
