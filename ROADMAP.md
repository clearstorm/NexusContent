# Roadmap

This roadmap describes intended sequencing. It does not determine whether a feature is currently implemented. See [FEATURES.md](FEATURES.md) and [project.state.json](project.state.json) for current status, and [PROJECT_STATUS.md](PROJECT_STATUS.md) for immediate next work.

Versions after `0.1.3` are directional targets. Scope and ordering may change as integrations test the provider contract. A roadmap item remains `planned` or `deferred` until implementation and verification justify a status change.

## 0.1.x - Framework-Neutral Foundation

**State:** Released internally through `0.1.3`.

**Goal:** Prove a small, framework-neutral content provider architecture with Git content and both Astro and plain Node consumers.

**Required capabilities:**

- Normalized content types and shared provider contract.
- Provider registry, configuration resolution, and content service.
- Page, generic singleton, dedicated navigation, settings, collection, and item retrieval.
- Structured errors, normalization, provenance, and validation.
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

The exit criteria are satisfied by `0.1.3`.

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
- WordPress remains the recommended next focus milestone.

## 0.2.0 - WordPress Provider

**Goal:** Add a production-ready initial WordPress REST provider without leaking WordPress structures into Core or consumers.

**Required capabilities:**

- Provider scope and endpoint mapping confirmed before implementation.
- REST API communication and actionable WordPress-specific errors.
- Page and post retrieval mapped to the existing provider contract.
- Pagination where collection retrieval requires it.
- Media and SEO normalization where supported by reliable source data.
- Provider contract tests with deterministic fixtures or mocked responses.
- Consumption through the existing public API in Node and Astro examples.

**Explicit exclusions:**

- WordPress bridge plugins.
- Webhooks, preview, and synchronization.
- WordPress-specific logic in Core or consumer components.

**Exit criteria:**

- WordPress provider passes shared provider behavior and provider-specific tests.
- Native WordPress responses do not cross the provider boundary.
- Existing Git, Node, Astro, typecheck, test, and build gates remain green.
- Public behavior and project state documentation are updated.

## 0.2.x - Localisation Continuation

**State:** Directional. These items are `planned` and may land after or alongside the `0.2.0` WordPress milestone. They do not block the WordPress provider.

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
