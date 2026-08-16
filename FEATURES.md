# Features

This file is the authoritative human-readable feature matrix for NexusContent. [project.state.json](project.state.json) is the synchronized machine-readable representation of the same current state.

A feature status change must update both files in the same pull request. Roadmap placement is maintained separately in [ROADMAP.md](ROADMAP.md).

## Status Legend

| Display | Formal status | Meaning |
|---|---|---|
| Implemented | `implemented` | The stated scope is complete and verified. |
| In progress | `in_progress` | Implementation has started but does not yet meet the definition of implemented. |
| Planned | `planned` | The project intends to implement the feature. |
| Blocked | `blocked` | Progress is prevented by an identified blocker recorded in Notes. |
| Deferred | `deferred` | Deliberately outside the current foreseeable milestone; not permanently rejected. |

Blank Introduced values mean the feature is not implemented. `TBD` means no reliable target version is assigned. Version targets after `0.2.0` are directional and may change as provider work tests the architecture.

## Core

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `core.normalized-types` Normalized content types | implemented | 0.1.0 | - | Public page, collection, metadata, media, and SEO types. |
| `core.provider-interface` Provider interface | implemented | 0.1.0 | - | Framework-neutral `getPage`, `getCollection`, and `getItem` contract. |
| `core.registry` Provider registry | implemented | 0.1.0 | - | Registration, duplicate detection, and provider lookup. |
| `core.configuration` Content configuration | implemented | 0.1.0 | - | Maps logical content names to provider names and keys. |
| `core.service` Content service | implemented | 0.1.0 | - | Coordinates resolution, retrieval, normalization, and validation. |
| `core.normalization` Service normalization | implemented | 0.1.0 | - | Applies normalized defaults without hiding invalid provider data. |
| `core.errors` Structured errors | implemented | 0.1.0 | - | Contextual configuration, registry, provider, validation, and missing-content errors. |
| `core.provenance` Content provenance | implemented | 0.1.0 | - | Normalized source, source identifier, and optional update timestamp. |
| `core.public-api` Public exports | implemented | 0.1.0 | - | Small package entry point for supported consumer APIs. |

## Providers

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `provider.git` Git filesystem provider | implemented | 0.1.0 | - | Reads configured external content directories; retrieval does not run Git commands. |
| `provider.git.path-security` Git path containment | implemented | 0.1.1 | - | Rejects traversal; symlink escape hardening completed in 0.1.2. |
| `provider.git.editor-independence` Git editor independence | implemented | 0.1.1 | - | Ignores unrelated CMS files and does not depend on editor identity. |
| `provider.wordpress` WordPress provider | planned | - | 0.2.0 | Directional next milestone; REST API first. |
| `provider.strapi` Strapi provider | planned | - | 0.3.0 | Directional target after WordPress validates the provider contract. |
| `provider.additional` Additional CMS and API providers | deferred | - | TBD | Directus, Sanity, Contentful, Payload, Storyblok, DatoCMS, and custom APIs require separate scope. |

## Content Formats

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `format.adapter` Internal format adapter contract | implemented | 0.1.2 | - | Keeps parsing and serialization details out of providers. |
| `provider.git.json` Git JSON content | implemented | 0.1.0 | - | UTF-8 JSON pages and collection items. Parsing was isolated behind the format adapter in 0.1.2. |
| `provider.git.markdown` Git Markdown and frontmatter | deferred | - | TBD | Not supported; no target assigned. |
| `provider.git.additional-formats` Additional Git formats | deferred | - | TBD | MDX, YAML, TOML, and CSV are not supported. |

## Consumers and Framework Compatibility

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `consumer.node` Plain Node compatibility | implemented | 0.1.1 | - | Example and automated public API compatibility test without Astro. |
| `consumer.astro` Astro reference consumer | implemented | 0.1.0 | - | Static example with explicit home, about, services, contact, and blog routes generated in English and French under `/en/` and `/fr/`; Astro is not a Core dependency. |
| `consumer.framework-neutrality` Framework-neutral source boundary | implemented | 0.1.1 | - | Tests prohibit framework imports, framework globals, and frontend runtime dependencies in library source. |
| `consumer.framework-adapters` Framework-specific adapter packages | deferred | - | TBD | Integrations remain consumer-owned until package extraction has a demonstrated need. |

## Validation

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `validation.normalized` Normalized content validation | implemented | 0.1.0 | - | Zod validates provider output after service normalization. |
| `validation.consumer-schema` Consumer schema validation | implemented | 0.1.0 | - | Public helper validates untrusted content against consumer-owned Zod schemas. |
| `validation.errors` Field-level validation errors | implemented | 0.1.0 | - | Reports issue paths and messages with provider and content context. |

## Content Operations

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `core.page` Page retrieval | implemented | 0.1.0 | - | Returns normalized page content or `null` when absent. |
| `core.singleton` Singleton retrieval | implemented | 0.1.2 | - | Provider-neutral `getSingleton` returns arbitrary normalized singleton content or `null` when absent. |
| `core.collection` Collection retrieval | implemented | 0.1.0 | - | Returns normalized collection items or an empty collection when absent. |
| `core.item` Individual item retrieval | implemented | 0.1.0 | - | Returns a normalized item or `null` when absent. |
| `content.navigation` Dedicated navigation retrieval | implemented | 0.1.2 | - | `getNavigation` resolves a dedicated navigation configuration section and Git reads `navigation/<key>.json` into validated recursive `NavigationContent`. |
| `content.settings` Dedicated settings retrieval | implemented | 0.1.2 | - | `getSettings` resolves a dedicated settings configuration section and Git reads `settings/<key>.json` into validated generic `SettingsContent`. |
| `content.references` Stable content references | planned | - | 0.2.x | References must target `collection` + `entryId` and never locale filenames; locale-aware reference resolution is deferred. |

## Localisation

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `localisation.foundations` Locale-aware core | implemented | 0.1.3 | - | Optional `locales` configuration, central `LocaleResolver` with fallback chains and strict mode, structured locale errors, optional `meta.locale` provenance, and per-request `locale` / `fallback` options on every retrieval method. |
| `localisation.git-variants` Git locale variant directories | implemented | 0.1.3 | - | Reads `pages/<locale>/<key>.json` and equivalent variant directories for pages, singletons, navigation, settings, collections, and items, with legacy flat-file fallback; strict mode throws `MissingLocaleVariantError` when a variant is absent. |
| `localisation.file-level` Full file-level multilingual content | planned | - | 0.2.x | Per-item variant merging and locale publishing for one file per language. |
| `localisation.validation-policies` Per-locale validation policies | planned | - | 0.2.x | Locale-specific consumer schemas and validation context. |
| `translation.state-model` Translation state workflow | planned | - | 0.2.x | `TranslationState` and `LocaleVariantInfo` extension points are established in 0.1.3; the workflow is not implemented. |
| `translation.publishing` Locale-specific publishing | planned | - | 0.2.x | Publish individual locale variants without publishing the whole collection. |
| `translation.completeness` Translation completeness reporting | planned | - | 0.2.x | Report which locales are missing or partial variants. |
| `translation.source-change-detection` Source change detection for translations | planned | - | 0.2.x | Detect when a source variant changes and a translation becomes outdated. |
| `translation.outdated-tracking` Outdated translation tracking | planned | - | 0.2.x | Track the `outdated` state and require review before republishing. |

## CMS Workflows

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `workflow.git-cms` Git-based CMS compatibility | implemented | 0.1.1 | - | Editing layers are compatible when they write the supported repository structure and JSON format. |
| `content.sync` Content synchronization and change detection | planned | - | 0.4.0 | Directional target; must remain separate from provider retrieval. |
| `content.webhooks` Authenticated webhook workflows | planned | - | 0.5.0 | Directional target; webhook handling stays outside provider read logic. |
| `content.preview` Draft preview | planned | - | 0.6.0 | Directional target; draft access and production isolation require explicit design. |
| `cms.admin` CMS administration UI | deferred | - | TBD | NexusContent is not a CMS. |

## Developer Tooling

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `tooling.typescript` Strict TypeScript project | implemented | 0.1.0 | - | Strict checking with NodeNext modules. |
| `tooling.build` Package build | implemented | 0.1.0 | - | Emits the package distribution with TypeScript. |
| `tooling.project-state` Coordinated project tracking | implemented | 0.1.2 | - | Human and machine-readable state files with synchronized stable feature IDs. |
| `tooling.project-state-validation` Project state validation | implemented | 0.1.2 | - | Dependency-free structural, version, feature-ID, and status consistency check. |
| `tooling.cli` NexusContent CLI | planned | - | 0.7.0 | Directional target after programmatic APIs stabilize. |
| `tooling.package-extraction` Multi-package extraction | deferred | - | TBD | Requires proven boundaries and a concrete versioning or dependency-isolation need. |

## Testing and CI

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `testing.core` Core behavior tests | implemented | 0.1.0 | - | Covers registry, configuration, retrieval, missing content, validation, and provider failures. |
| `testing.git` Git provider tests | implemented | 0.1.0 | - | Covers JSON, normalization, provenance, missing content, unrelated files, and path security. |
| `testing.validation` Validation tests | implemented | 0.1.0 | - | Covers valid and invalid normalized and consumer-schema content. |
| `testing.compatibility` Framework-neutrality tests | implemented | 0.1.1 | - | Covers source boundaries, dependencies, and plain Node use. |
| `testing.ci` Required CI quality gates | implemented | 0.1.0 | - | Type check, state validation, tests, package build, Astro build, and Node example. State validation added in 0.1.2. |

## Documentation

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `docs.readme` Project and usage documentation | implemented | 0.1.0 | - | Defines purpose, architecture, public API, and examples. |
| `docs.agent-guide` Agent engineering guide | implemented | 0.1.1 | - | Defines mandatory architectural and contribution rules. |
| `docs.changelog` Released change history | implemented | 0.1.0 | - | Keep a Changelog format. |
| `docs.contributing` Contribution guide | implemented | 0.1.0 | - | Development and pull request expectations. |
| `docs.roadmap` Sequenced roadmap | implemented | 0.1.2 | - | Separates directional release sequencing from current status. |

## Deployment Related Examples

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `deployment.adapters` Deployment adapters | deferred | - | TBD | Deployment remains outside Core. |
| `deployment.examples` Deployment workflow examples | deferred | - | TBD | May be documented separately when a concrete consumer need exists. |

## Current Empty Statuses

- `in_progress`: none.
- `blocked`: none.

No feature should enter `implemented` until its stated scope meets the definition of implemented in [AGENTS.md](AGENTS.md).
