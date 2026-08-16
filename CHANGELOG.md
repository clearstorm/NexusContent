# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added coordinated project state tracking through `PROJECT_STATUS.md`, `FEATURES.md`, `ROADMAP.md`, and `project.state.json`.
- Added dependency-free project state validation to keep feature IDs, statuses, and package version metadata synchronized.
- Added provider-neutral singleton retrieval through `getSingleton`, with arbitrary Git singleton content stored under `singletons/<key>.json`.
- Added dedicated `getNavigation` and `getSettings` APIs, configuration sections, normalized public types, validation, and Git storage under `navigation/<key>.json` and `settings/<key>.json`.
- Updated the Astro and plain Node examples to consume the dedicated navigation and settings APIs.

## [0.1.2] - 2026-08-15

Internal architecture hardening release.

### Added

- Added dedicated navigation and settings retrieval to the 0.1.2 foundation while retaining generic singleton retrieval for arbitrary singleton content.

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
