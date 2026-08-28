# Roadmap

This roadmap describes intended sequencing. It does not determine whether a feature is currently implemented. See [FEATURES.md](FEATURES.md) and [project.state.json](project.state.json) for current status, and [PROJECT_STATUS.md](PROJECT_STATUS.md) for immediate next work.

Versions after `0.2.0` are directional targets. Scope and ordering may change as integrations test the provider contract. A roadmap item remains `planned` or `deferred` until implementation and verification justify a status change.

## 0.1.x - Framework-Neutral Foundation

**State:** Released internally through `0.1.4`.

**Goal:** Prove a small, framework-neutral content provider architecture with Git content and both Astro and plain Node consumers.

**Required capabilities:**

- Normalized content types and shared provider contract.
- Provider registry, configuration resolution, and content service.
- Page, generic singleton, dedicated navigation, settings, collection, and item retrieval.
- Structured errors, normalization, provenance, and validation.
- Normalized SEO data, deterministic fallback resolution, provider mapping, and consumer-owned Astro rendering.
- External Git content directories with JSON pages, arbitrary singletons, navigation, settings, and collections.
- Path containment and editor-independent Git-based CMS compatibility.
- Astro reference example and plain Node compatibility proof.
- Type checking, tests, package build, examples, and CI.

**Explicit exclusions:**

- Remote CMS providers.
- Synchronization, webhooks, preview, and CLI.
- Additional content formats.
- Deployment integrations and CMS administration.

**Exit criteria:**

- Core and provider contracts pass their tests.
- Git content is normalized and validated through the public service API.
- Framework-neutrality tests pass without a frontend framework runtime dependency.
- Package, Astro example, and Node example build or execute in CI.

The exit criteria are satisfied by `0.1.4`.

## 0.1.3 - Localisation Foundations

**State:** Released internally.

**Goal:** Add locale-aware content resolution without coupling Core to any translation workflow.

**Required capabilities:**

- Optional `locales` configuration with a default locale, supported locales, and an optional explicit fallback map.
- Central `LocaleResolver` producing deterministic fallback chains with strict mode.
- Structured locale errors and per-request `locale` / `fallback` retrieval options.
- Git locale variant directories with legacy flat-file fallback and optional `meta.locale` provenance.
- Typed `TranslationState` and `LocaleVariantInfo` extension points.

**Explicit exclusions:**

- Translation workflows, publishing, completeness reporting, and outdated tracking.
- Per-locale validation policies.
- Per-item variant merging and full file-level multilingual content.
- Locale-specific routing in Core. The Astro example demonstrates per-locale routes by explicit user scope change.

**Exit criteria:**

- Locale resolution, Git variant loading, and flat-file backward compatibility pass their tests.
- Projects without locale configuration retain the legacy flat retrieval path.
- WordPress remained the recommended next focus milestone and was delivered in `0.2.0`.

## 0.1.4 - SEO Foundations

**State:** Released internally on 2026-08-17.

**Goal:** Provide provider-neutral SEO data and deterministic resolution while leaving framework rendering and deployment URL knowledge with consumers.

**Released capabilities:**

- Expanded normalized SEO contract for canonical URLs, robots, Open Graph, Twitter, media, and JSON-compatible structured data.
- Pure `resolveSeo` with documented content, social, and site-default fallback order.
- Normalized SEO validation and provider-boundary mapping, including Git JSON content.
- Consumer-owned Astro metadata rendering with safely escaped JSON-LD.
- Deprecated `canonical` migration fallback in favor of `canonicalUrl`.

**Explicit exclusions:**

- Automatic canonical URL construction, sitemaps, robots.txt, redirects, metadata scraping, keyword analysis, and analytics.
- Provider-specific SEO plugin behavior in Core.
- Framework rendering components in the NexusContent public package.

**Exit criteria:**

- Core, validation, provider, Astro, and framework-boundary SEO tests pass.
- Existing pages without SEO and legacy `canonical` input remain compatible.
- WordPress remained the recommended next milestone and was delivered in `0.2.0`.

## 0.2.0 - WordPress Provider

**State:** Completed and released internally on 2026-08-18.

**Goal:** Add a production-ready initial WordPress REST provider without leaking WordPress structures into Core or consumers.

**Released capabilities:**

- Public, read-only WordPress REST API v2 access with explicit headers, timeout, pagination, and custom provider names.
- Published page lookup by slug, built-in posts collection and item lookup, and explicit custom-post-type endpoint mapping.
- Sequential collection pagination validated against `X-WP-Total` and `X-WP-TotalPages`, with explicit failure when `maxPages` would truncate content.
- Normalized rendered title, content, excerpt, dates, URL, provenance, author/category/tag IDs, ACF data, and embedded featured media.
- Actionable configuration, HTTP, network, timeout, JSON, payload, and pagination errors that do not expose authentication header values.
- Public `WordPressProvider`, `WordPressProviderOptions`, `WordPressCollectionConfig`, and `WordPressContentData` exports.
- Deterministic provider and plain Node tests plus the `astro-wordpress` static-build example.

**Known limitations:**

- Published content only; no draft preview, webhooks, mutations, synchronization, retries, or caching.
- No shortcode conversion, Gutenberg block renderer, taxonomy cache, media synchronization, plugin SEO, WordPress localisation-plugin integration, endpoint discovery, WooCommerce support, or multisite verification.
- The base provider ignores locale retrieval options; there is no localised WordPress Astro example.
- Rendered WordPress HTML remains untrusted consumer input and must be trusted or sanitized by the application.
- Featured media uses `_embed`, increasing response payload and request processing cost.

**Exit criteria:**

- WordPress provider passes shared provider behavior and provider-specific tests.
- Native WordPress responses do not cross the provider boundary.
- Existing Git, Node, Astro, typecheck, test, and build gates remain green.
- Public behavior and project state documentation are updated.

The exit criteria are satisfied by `0.2.0`.

## 0.2.1 - WordPress Companion

**State:** Released on 2026-08-29 alongside `0.2.2`. Phases 1-3 are complete, pass CI, and ship with the companion plugin `0.1.0` artifact.

**Goal:** Establish a versioned companion boundary that gives WordPress editors Gutenberg and optional ACF authoring modes while preserving the released plugin-neutral standard REST provider.

### Phase 1 - Repaired Contracts

**State:** Implemented; released with `0.2.1`.

- Core structured-page types, WordPress configuration validation, section registry, diagnostics, capabilities, and typed errors are implemented.
- Contract v1 uses `{ contractVersion: 1, data, diagnostics? }` envelopes.
- Editor modes are exactly `gutenberg`, `acf_flexible`, and `acf_fixed`.
- Canonical section names are exactly `hero`, `intro`, `rich_text`, `image_text`, `features`, `statistics`, `testimonials`, `gallery`, `cta`, `faq`, `logo_grid`, and `form_embed`.
- The `nexuscontent/v1` contract covers `pages`, `pages/{id}`, `pages/slug/{slug}`, `schema`, and `capabilities`.
- Media supports caption, MIME type, and registered sizes in addition to baseline normalized fields; capability reporting reflects the exact runtime installation.
- Error codes include companion response, editor, block, ACF layout/block, fixed section, section-source, media-resolution, and conflicting-source failures.

This was a pre-release contract repair because the earlier committed definitions contradicted Phase 2. No released `0.2.0` retrieval behavior changed.

### Phase 2 - Companion Plugin

**State:** Implemented, passes CI, and ships with `0.2.1` (plugin artifact `dist/nexuscontent-0.1.0.zip`).

- Plugin `0.1.0` is isolated under `integrations/wordpress/nexuscontent/` and requires WordPress 6.6+ and PHP 8.1+.
- Native Gutenberg, ACF Free 6.2+ fixed Hero/Introduction/Call to Action fields, ACF Pro 6.2+ flexible layouts for all 12 sections, opt-in ACF Blocks, and page mode UI are implemented.
- Server-side source normalization, expanded media, exact capabilities, diagnostics, secured REST routes, tests, tooling, documentation, and packaging exist.
- Unit tests, PHP lint, PHPCS, PHPStan, contract tests, JavaScript build/lint/format, ZIP packaging, and WordPress integration tests pass in CI. The artifact is `dist/nexuscontent-0.1.0.zip`.

### Phase 3 - Companion Provider Integration

**State:** Implemented, passes CI, and ships with `0.2.1`.

- Provider discovery, companion calls, explicit contract-version negotiation, caching, and fallback are implemented.
- A live integration test runs the provider (auto and core strategies) against a fresh Docker wp-env companion install in the `ts-integration` CI job; it exercises page, collection, and item retrieval plus core fallback against the real plugin.
- Phase 3 consumes only the repaired contract.
- Released `0.2.0` standard REST retrieval remains unchanged and does not require or call the plugin.

**0.2.1 exclusions:**

- No preview, webhooks, mutations, synchronization, retries, plugin SEO, WordPress localisation-plugin integration, WooCommerce, or multisite verification.
- Milestone exit criteria were met and `0.2.1` was released with `0.2.2` on 2026-08-29 (`v0.2.1` and `v0.2.2` tags at the same commit).

## 0.2.2 - Core Content Contract and Media

**State:** Released on 2026-08-29 (root package `0.2.2`).

**Goal:** Consolidate logical content mapping into a unified `schema.models` contract and establish provider-neutral media, without changing provider semantics or leaked framework dependencies.

**Required capabilities:**

- `schema.models` with model kinds (`singleton`, `collection`, `navigation`, `settings`) and provider sources carrying `mode: "page"` or `"singleton"`.
- Declarative field schemas (`string`, `number`, `boolean`, `datetime`, `object`, `reference`, `media`, `richText`) with `required`, `list`, `options`, nested objects, reference targets, and media overrides; retrieval-time `SchemaError` validation with pass-through for undeclared fields.
- `defineNexusConfig()` validation of shape, provider/source relationships, and media declarations.
- Provider-neutral media: `MediaAsset.src` (with `provider` / `sourceId`), `MediaReference`, `MediaProviderRegistry`, `ResolveMediaService`, and the `nexus.media` entry point. `MediaSize` and `sizes` keep `url`.
- Built-in local (root-relative to `publicPath`, traversal-safe) and remote (absolute http(s), no fetching) media providers; a `WordPressMediaProvider` for id lookup through the WordPress media endpoint.
- Companion wire contract and plugin keep `featuredImage.url`; the TypeScript boundary converts it to `src`.

**Also shipped in the released milestone:**

- Section single-source synchronization: canonical `sections.json` feeds the PHP `Section_Registry` and generated TypeScript, enforced by `npm run check:sections`.
- Live `/schema` registry reconciliation, `validateWordPressComponents` component/block validation, the admin-only project-contract push with expected-vs-installed drift card, and plain-text excerpts.
- The dual-provider `astro-wordpress` reference consumer using canonical section components and `schema.models` + `nexus.media`.

**Explicit exclusions:**

- Content reference resolution (remains value-neutral; the consumer calls `nexus.media.resolve`). Cloudinary and additional CDN providers.
- Editor UI, uploads, media transforms, and renderers.
- Changing provider retrieval semantics or Core leakage of provider-specific structures.

**Exit criteria:**

- Core, media, contract, and example tests pass; plain Node and Astro examples build against `defineNexusConfig` + `schema.models`.
- `npm run validate:project-state` and all required CI gates pass.
- Public behavior, README, and project state documentation are updated.

## 0.2.3 - WordPress Companion Consumer

**State:** Current milestone (implemented, awaiting release).

**Goal:** Prove the Phase 3 companion path through the reference consumer and verify Git-vs-WordPress section parity.

**Required capabilities:**

- Surface normalized companion sections onto collection items (`data.sections`) so Git-sourced and companion-backed WordPress content reach pages through the same `blocks` shape.
- Flip the `astro-wordpress` example to `apiStrategy: "companion"` with fallback to the standard REST path when the plugin is absent.
- Verify section parity (hero, rich_text, faq, cta, gallery, and others) between Git content and companion WordPress content through the shared `PostSections` components, keeping the raw-HTML fallback.

**Explicit exclusions:**

- No new provider capabilities, wire-contract changes, plugin changes, or editor modes.
- No preview, webhooks, or synchronization.

**Exit criteria:**

- Companion item retrieval returns normalized sections with tests.
- The example builds and renders both sources with parity.
- Project state and documentation are updated; release gates stay green.

## 0.2.x - Localisation Continuation

**State:** Directional. These items remain `planned` after the `0.2.0` WordPress milestone and do not block the recommended `0.3.0` Strapi work.

**Goal:** Extend the localisation foundations from `0.1.3` into per-locale content, validation, and translation workflows as demonstrated needs require.

**Directional capabilities:**

- `localisation.file-level`: per-item variant merging and locale publishing for one file per language.
- `localisation.validation-policies`: per-locale consumer schemas and validation context.
- `translation.state-model`: a concrete workflow built on the `TranslationState` and `LocaleVariantInfo` extension points.
- `translation.publishing`: publish individual locale variants without publishing the whole collection.
- `translation.completeness`: report missing or partial locale variants.
- `translation.source-change-detection`: detect source changes that make a translation outdated.
- `translation.outdated-tracking`: track the `outdated` state and require review before republishing.
- `content.references`: stable `collection` + `entryId` references that are resolved locale-aware.

**Explicit exclusions:**

- CMS-owned locale routing and URL negotiation.
- Automatic machine translation.
- Translation workflow features in the `0.1.3` milestone.

**Exit criteria:**

- Each item ships with tests, documentation, and project state updates when implemented.
- Existing retrieval semantics and flat-file backward compatibility remain intact.

## 0.3.0 - Strapi Provider

**State:** Directional; planned after `0.2.3`.

**Goal:** Add structured Strapi REST content while preserving the Core contract proven by Git and WordPress.

**Required capabilities:**

- Single types and collections mapped deliberately to the provider contract.
- Authentication configuration without credential leakage.
- Pagination, relation handling within documented scope, and media normalization.
- Deterministic provider tests and actionable errors.
- Node and Astro consumption through the existing public API.

**Explicit exclusions:**

- GraphQL abstraction.
- CMS administration, preview, webhooks, and synchronization.
- Strapi-specific data structures in Core or consumers.

**Exit criteria:**

- Strapi passes provider behavior and provider-specific tests.
- Git and WordPress behavior remains compatible.
- Framework-neutrality and all required CI gates pass.

## 0.4.0 - Synchronization and Change Detection

**Goal:** Design content synchronization as a capability separate from ordinary provider retrieval.

**Required capabilities:**

- Explicit source and destination semantics.
- Deterministic change detection for new, modified, and deleted content.
- Actionable status and failure reporting.
- Safe handling of provenance and source identifiers.
- A reviewed API that does not expand `ContentProvider` casually.

**Explicit exclusions:**

- Background worker infrastructure without a demonstrated need.
- Redis, queues, or databases by default.
- Deployment automation.

**Exit criteria:**

- Synchronization boundaries and failure semantics are documented and tested.
- Existing retrieval APIs retain their behavior.
- No synchronization commands run during ordinary content reads.

## 0.5.0 - Webhooks and Rebuild Workflows

**Goal:** Support authenticated content-change triggers while keeping deployment ownership outside Core.

**Required capabilities:**

- Signed request verification where providers support it.
- Rejection of invalid or unauthenticated requests.
- Clear mapping from events to affected content or synchronization work.
- Consumer- or infrastructure-owned rebuild integration examples.

**Explicit exclusions:**

- Unauthenticated public rebuild endpoints.
- Hosting-specific deployment SDKs in Core.
- Provider retrieval methods that process webhook requests.

**Exit criteria:**

- Authentication and event handling are tested.
- Deployment remains replaceable and outside Core.
- Required CI and compatibility gates pass.

## 0.6.0 - Draft Preview

**Goal:** Enable explicit, authenticated draft content access rendered through the real consumer frontend.

**Required capabilities:**

- Explicit preview context and draft access.
- Authentication where the source requires it.
- Isolation that prevents draft content entering production builds accidentally.
- At least one end-to-end provider and consumer preview workflow.

**Explicit exclusions:**

- A NexusContent page builder or visual editor.
- Implicit draft flags added to every API without a reviewed contract.
- CMS ownership of consumer presentation.

**Exit criteria:**

- Preview behavior and production isolation are tested.
- Normal published-content behavior remains unchanged.
- Security assumptions are documented.

## 0.7.0 - CLI and Developer Tooling

**Goal:** Wrap stable programmatic APIs with focused developer commands.

**Required capabilities:**

- Commands selected from demonstrated workflows rather than speculative breadth.
- Clear exit codes and actionable errors.
- Programmatic APIs remain independently usable.
- Documentation and tests for supported commands.

**Explicit exclusions:**

- CLI ownership of Core behavior.
- Plugin marketplace or broad project scaffolding without evidence.
- Hidden synchronization or deployment side effects.

**Exit criteria:**

- CLI commands wrap stable APIs and pass deterministic tests.
- Core and providers do not depend on the CLI.
- Package and compatibility gates remain green.

## 1.0.0 - Stable Public Contracts

**Goal:** Publish stable, production-tested contracts for consumers and provider authors.

**Required capabilities:**

- Stable provider interface and normalized content contracts.
- Documented extension model and compatibility policy.
- Production evidence from multiple providers and consumers.
- Clear packaging strategy based on proven dependency boundaries.
- Complete release, migration, security, and contribution documentation.

**Explicit exclusions:**

- Stability promises for unimplemented or experimental capabilities.
- Package extraction performed only for appearance.
- Framework, CMS, or hosting ownership by Core.

**Exit criteria:**

- Public contracts have documented compatibility guarantees.
- Supported providers and consumers meet production readiness criteria.
- Required tests, builds, examples, and release checks pass.

## Deferred or Under Evaluation

These capabilities have no assigned release target:

- Additional CMS and custom API providers beyond WordPress and Strapi.
- Markdown, MDX, YAML, TOML, and CSV Git formats.
- Framework-specific adapter packages.
- Multi-package extraction.
- Deployment workflow examples.

The following remain outside NexusContent Core rather than roadmap commitments:

- Deployment adapters and hosting SDKs.
- Form processing.
- CMS administration and visual editing.
- Authentication systems unrelated to provider access or secured workflows.
- Databases, queues, and complex caching without demonstrated requirements.
