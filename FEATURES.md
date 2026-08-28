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

Blank Introduced values mean the feature is not implemented. `TBD` means no reliable target version is assigned. Version targets after `0.3.0` are directional and may change as provider work tests the architecture.

## Core

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `core.normalized-types` Normalized content types | implemented | 0.1.0 | - | Public page, collection, metadata, media, and baseline SEO types. |
| `core.section-types` Content section types | implemented | 0.2.1 | - | `ContentSection`, `SectionSettings`, and `PageStatus` types for structured page sections. |
| `core.provider-interface` Provider interface | implemented | 0.1.0 | - | Framework-neutral `getPage`, `getCollection`, and `getItem` contract. |
| `core.registry` Provider registry | implemented | 0.1.0 | - | Registration, duplicate detection, and provider lookup. |
| `core.configuration` Content configuration | implemented | 0.1.0 | - | Maps logical content names to provider names and keys. |
| `core.service` Content service | implemented | 0.1.0 | - | Coordinates resolution, retrieval, normalization, and validation. |
| `core.normalization` Service normalization | implemented | 0.1.0 | - | Applies normalized defaults without hiding invalid provider data. |
| `core.errors` Structured errors | implemented | 0.1.0 | - | Contextual configuration, registry, provider, validation, and missing-content errors. |
| `core.provenance` Content provenance | implemented | 0.1.0 | - | Normalized source, source identifier, and optional update timestamp. |
| `core.public-api` Public exports | implemented | 0.1.0 | - | Small package entry point for supported consumer APIs. |
| `core.schema.models` Model schema contract | in_progress | 0.2.2 | 0.2.2 | `schema.models` maps logical models to `kind`, provider `source`, and optional field schemas; retrieval routes through the declared kind and `source.mode`. Replaces root `content` / `navigation` / `settings` configuration. |
| `core.schema.fields` Declarative field schemas | implemented | 0.2.2 | - | String, number, boolean, datetime, object, reference, media, richText, component, and blocks fields with `required`, `list`, `options`, nested `object.fields`, `reference.collection`, `media` overrides, `component` references into `schema.components`, and `blocks` validation of a discriminated `_type` list against `allowedComponents`; validated at retrieval time with a `SchemaError`. |

## Providers

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `provider.git` Git filesystem provider | implemented | 0.1.0 | - | Reads configured external content directories; retrieval does not run Git commands. |
| `provider.git.path-security` Git path containment | implemented | 0.1.1 | - | Rejects traversal; symlink escape hardening completed in 0.1.2. |
| `provider.git.editor-independence` Git editor independence | implemented | 0.1.1 | - | Ignores unrelated CMS files and does not depend on editor identity. |
| `provider.wordpress` WordPress provider | implemented | 0.2.0 | - | Read-only, plugin-neutral WordPress REST API provider for published content. |
| `provider.wordpress.pages` WordPress pages | implemented | 0.2.0 | - | Resolves published pages by slug through the `pages` endpoint. |
| `provider.wordpress.posts` WordPress posts | implemented | 0.2.0 | - | Retrieves the built-in `posts` collection and individual posts by slug. |
| `provider.wordpress.custom-post-types` WordPress custom post types | implemented | 0.2.0 | - | Explicit collection-to-endpoint configuration supports REST-exposed custom post types. |
| `provider.wordpress.pagination` WordPress pagination | implemented | 0.2.0 | - | Loads collection pages sequentially, verifies WordPress total headers, and throws rather than truncating at `maxPages`. |
| `provider.wordpress.errors` WordPress errors | implemented | 0.2.0 | - | Actionable configuration, HTTP, network, timeout, JSON, payload, and pagination errors without header secret leakage. |
| `provider.wordpress.media` WordPress featured media | implemented | 0.2.0 | - | Requests embedded featured media and maps its basic fields to `MediaAsset` (`src` since `0.2.2`). |
| `provider.wordpress.phase1.config` WordPress Phase 1 configuration | implemented | 0.2.1 | - | Editor modes `gutenberg`, `acf_flexible`, and `acf_fixed`, plus API strategy, unknown content policy, media resolution, ACF, and fixed section options. |
| `provider.wordpress.phase1.sections` WordPress Phase 1 section registry | implemented | 0.2.1 | - | Exactly 12 canonical short names: `hero`, `intro`, `rich_text`, `image_text`, `features`, `statistics`, `testimonials`, `gallery`, `cta`, `faq`, `logo_grid`, and `form_embed`. |
| `provider.wordpress.phase1.capabilities` WordPress Phase 1 provider capabilities | implemented | 0.2.1 | - | Provider-facing capabilities cover editor mode, Gutenberg, ACF flexible/fixed/fields, media library, custom post types, sections, locale awareness, preview, and webhooks. |
| `provider.wordpress.phase1.companion` WordPress Phase 1 companion wire contracts | implemented | 0.2.1 | - | Repaired pre-release contract v1 envelopes use `{ contractVersion: 1, data, diagnostics? }`; namespace `nexuscontent/v1` exposes pages, page by ID, page by slug, schema, and capabilities contracts. |
| `provider.wordpress.phase1.diagnostics` WordPress Phase 1 diagnostic contracts | implemented | 0.2.1 | - | Structured diagnostic entries with severity, code, message, and optional path for companion wire responses. |
| `provider.wordpress.phase1.error-codes` WordPress Phase 1 error codes | implemented | 0.2.1 | - | Expanded typed codes cover provider failures plus companion, editor, block, ACF layout/block, section-source, and media-resolution failures. |
| `provider.wordpress.companion-plugin` WordPress companion plugin | implemented | 0.2.1 | - | Phase 2 plugin `0.1.0` at `integrations/wordpress/nexuscontent`; local unit, static-analysis, contract, asset, packaging, and integration tests pass; WordPress integration suite passes in CI. Editor-mode selector, section field groups, meta boxes, and block-editor panels cover standard pages and posts as well as pages. |
| `provider.wordpress.companion-admin-page` WordPress companion admin page | implemented | 0.2.1 | - | Three WordPress admin pages: a Dashboard (Plugin Status, Content by editor mode, Blocks overview with enabled/disabled count and shortcut to Settings, Recent content with mode badges, Quick links) covering published pages and posts, a Settings page (toggle switches for each of the 12 section types, default editor mode, media resolution, save button), and an About page (plugin info, requirements, 5-step getting started guide, documentation links, feature highlights). Card-based layout with status indicators, colored mode badges, responsive grids, and toggle switches. Disabled blocks are hidden from the Gutenberg block inserter server-side and client-side. Admin CSS uses WordPress admin color scheme variables. Dashboard and About require admin; Settings accessible to editors. Integration tests pass in CI. |
| `provider.wordpress.companion-block-previews` WordPress companion block previews | implemented | 0.2.1 | - | All 12 section types have packaged static inserter and inspector illustrations. Removed the `getBlockType` bail-out check so client-side `registerBlockType()` always merges the `edit` function with SVG preview support. Integration tests pass in CI. |
| `provider.wordpress.companion-integration` WordPress companion provider integration | implemented | 0.2.1 | - | Phase 3 provider discovery, contract-version negotiation, companion calls, caching, and fallback are implemented with tests against the repaired contract. A live integration test (`tests/providers/wordpress-companion-live.test.ts`) runs the provider against a fresh Docker wp-env companion install; the `ts-integration` CI job passes, so the enforced live-plugin gate is satisfied. |
| `provider.wordpress.media-provider` WordPress media provider | implemented | 0.2.2 | - | `WordPressMediaProvider` resolves `id` references through the WordPress `media` endpoint and src-only references pass through; 404 becomes `null`. |
| `provider.wordpress.section-sync` WordPress section registry reconciliation | implemented | 0.2.2 | - | The provider reconciles its effective registry against a live companion `/schema` during auto/companion discovery, surfaces install-only/registry-only/conflict deltas as structured diagnostics, and throws an actionable error in strict companion mode. Build-time reconciliation swallows schema transport errors; only drift throws in strict mode. |
| `provider.wordpress.component-validation` WordPress component validation | implemented | 0.2.2 | - | `validateWordPressComponents` resolves declared `component` and `blocks.allowedComponents` names against the reconciled registry, throws `wordpress/unknown-component` for unresolvable names, and reports canonical-field deltas as `wordpress/field-delta` warnings with an optional `strictFields` promotion. `componentTypeMap` bridges renamed consumer components; `projectComponentContract(schema)` derives the serializable `{ components, sectionTypes }` contract. |
| `provider.wordpress.section-single-source` WordPress section single source | implemented | 0.2.2 | - | `integrations/wordpress/nexuscontent/sections.json` is the canonical 12-section definitions file (type, fixed flag, label, fields). The PHP `Section_Registry` loads it at runtime (labels and fixed field keys derive from it), `scripts/generate-sections.mjs` emits the committed `sections.generated.ts`, and `npm run check:sections` fails CI on drift. Parity tests assert JSON <-> generated TS <-> contract fixture equality. |
| `provider.wordpress.project-contract` WordPress project contract push | implemented | 0.2.2 | - | `POST /nexuscontent/v1/project-contract` (manage_options only; WordPress core enforces the REST nonce for cookie auth while Application Passwords work without one) stores sanitized, deduplicated `components`/`sectionTypes` arrays as `project_components` inside `nexuscontent_settings`. The admin "Project contract" dashboard card shows expected vs install-available vs enabled drift (missing/disused/disabled), read-only. The route lives outside the content wire contract: no credentials stored, no `contractVersion` negotiation. The astro-wordpress example's `push:project-contract` npm script pushes its consumer schema; installed users push via the public `projectComponentContract()` plus their own POST or curl. |
| `media.provider.local` Local media provider | implemented | 0.2.2 | - | `defineLocalMediaProvider` maps root-relative `src` references to `publicPath` web URLs with path traversal protection. |
| `media.provider.remote` Remote media provider | implemented | 0.2.2 | - | `defineRemoteMediaProvider` validates absolute http(s) URLs and passes them through without fetching (no SSRF). |
| `core.error-code` Generic error code field | implemented | 0.2.1 | - | Optional `code` field on `NexusContentErrorDetails` and `NexusContentError` for typed error classification. |
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
| `consumer.node` Plain Node compatibility | implemented | 0.1.1 | - | Example plus automated Git and WordPress public API compatibility tests without Astro. |
| `consumer.astro` Astro reference consumer | implemented | 0.1.0 | - | Git and WordPress each have static-build examples with explicit consumer-owned routes. Astro is not a Core dependency. |
| `consumer.framework-neutrality` Framework-neutral source boundary | implemented | 0.1.1 | - | Tests prohibit framework imports, framework globals, and frontend runtime dependencies in library source. |
| `consumer.framework-adapters` Framework-specific adapter packages | deferred | - | TBD | Integrations remain consumer-owned until package extraction has a demonstrated need. |

## Validation

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `validation.normalized` Normalized content validation | implemented | 0.1.0 | - | Zod validates provider output after service normalization. |
| `validation.consumer-schema` Consumer schema validation | implemented | 0.1.0 | - | Public helper validates untrusted content against consumer-owned Zod schemas. |
| `validation.errors` Field-level validation errors | implemented | 0.1.0 | - | Reports issue paths and messages with provider and content context. |

## SEO

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `seo.normalized-contract` Normalized SEO contract | implemented | 0.1.4 | - | Public robots, Open Graph, Twitter, canonical URL, JSON-compatible structured data, and media types; `PageContent.seo` remains optional and legacy `canonical` is deprecated. |
| `seo.resolution` Deterministic SEO resolution | implemented | 0.1.4 | - | Pure `resolveSeo` applies documented content and site-default fallback chains without mutating input. |
| `seo.validation-provider-mapping` SEO validation and provider mapping | implemented | 0.1.4 | - | Zod validates normalized SEO at the provider boundary; providers map source-specific fields and the Git provider accepts normalized JSON SEO. |
| `seo.astro-rendering` Astro SEO rendering | implemented | 0.1.4 | - | Consumer-owned reference components render metadata and safely escaped JSON-LD across the Astro examples. |
| `seo.automation` Advanced SEO automation | deferred | - | TBD | Automatic canonical URL construction, sitemaps, robots.txt, metadata scraping, keyword analysis, redirects, and provider-specific SEO plugin behavior require separate scope. |

## Content Operations

| Feature | Status | Introduced | Target | Notes |
|---|---|---|---|---|
| `core.page` Page retrieval | implemented | 0.1.0 | - | Returns normalized page content or `null` when absent. |
| `core.singleton` Singleton retrieval | implemented | 0.1.2 | - | Provider-neutral `getSingleton` returns arbitrary normalized singleton content or `null` when absent. |
| `core.collection` Collection retrieval | implemented | 0.1.0 | - | Returns normalized collection items or an empty collection when absent. |
| `core.item` Individual item retrieval | implemented | 0.1.0 | - | Returns a normalized item or `null` when absent. |
| `content.navigation` Dedicated navigation retrieval | implemented | 0.1.2 | - | `getNavigation` resolves a dedicated navigation configuration section and Git reads `navigation/<key>.json` into validated recursive `NavigationContent`. |
| `content.settings` Dedicated settings retrieval | implemented | 0.1.2 | - | `getSettings` resolves a dedicated settings configuration section and Git reads `settings/<key>.json` into validated generic `SettingsContent`. |
| `content.media` Provider-neutral media references | implemented | 0.2.2 | - | `MediaReference`, `MediaProvider`, `MediaProviderRegistry`, and `ResolveMediaService`; `MediaAsset` uses `src` (with `provider` and `sourceId`) instead of the legacy `url`. Declared local/remote media providers are auto-built by Core; WordPress media registers via `nexus.registerMedia`. |
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

- `blocked`: none.

No feature should enter `implemented` until its stated scope meets the definition of implemented in [AGENTS.md](AGENTS.md).
