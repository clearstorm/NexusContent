# Project Status

## Project Identity

| Field | Value |
|---|---|
| Project name | NexusContent |
| Current version | `0.1.3` |
| Current milestone | `0.1.3` - localisation foundations |
| Project status | Active, early development; internal private package |
| Current focus | Unassigned |

The `0.1.3` milestone is implemented and released internally. No active feature implementation is identified in the repository. The recommended next focus is the directional `0.2.0` WordPress provider milestone after its provider scope and contract expectations are confirmed.

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
- Shared `ContentProvider` interface.
- Provider registration, duplicate detection, and resolution.
- Explicit content-to-provider configuration.
- Page, generic singleton, dedicated navigation, dedicated settings, collection, and individual item retrieval through `NexusContent`.
- Normalization, content provenance, and structured errors.
- Zod-based normalized content validation and consumer schema validation support.
- Git provider with external content directories and JSON format support.
- Missing-content behavior, malformed JSON errors, path traversal protection, and symlink escape protection.
- Provider-neutral singleton retrieval from `singletons/<key>.json` for arbitrary singleton content.
- Dedicated navigation and settings retrieval from `navigation/<key>.json` and `settings/<key>.json`, with recursive navigation validation and generic settings data.
- Git-based CMS compatibility through editor-independent repository files.
- Localisation foundations: optional `locales` configuration, central fallback-chain resolution, strict mode, structured locale errors, and per-request retrieval options.
- Git locale variant directories with legacy flat-file fallback and optional `meta.locale` provenance.
- Astro static-build reference consumer with explicit routes.
- Plain Node compatibility example and framework-neutrality tests.
- Type checking, tests, package build, Astro example build, and Node example execution in CI.

See the authoritative feature-level status in [FEATURES.md](FEATURES.md).

## Current Work

No active implementation work is identified.

**Recommended next focus:** define and implement the `0.2.0` WordPress provider without changing Core contracts unless provider testing demonstrates a deliberate need.

## Next

1. Confirm the WordPress provider's minimum REST API scope and contract test strategy.
2. Implement WordPress pages, posts, pagination, normalization, media handling, and actionable errors outside Core.
3. Prove WordPress consumption through the existing public API in Node and Astro examples.
4. Reassess the provider contract before beginning the directional `0.3.0` Strapi milestone.
5. Consider the directional localisation continuation (per-file multilingual content, per-locale validation policies, and the translation state workflow) once provider breadth is proven.

## Not Implementing Yet

- Strapi and other remote CMS providers beyond the next WordPress milestone.
- Content synchronization and change detection.
- Webhooks and automated rebuild workflows.
- Draft preview.
- CLI and expanded developer tooling.
- Markdown, MDX, YAML, TOML, and CSV Git content formats.
- Framework-specific adapter packages.
- Deployment integrations.
- Admin UI, authentication, forms, databases, queues, and complex caching.
- Translation workflows (state model, locale-specific publishing, completeness reporting, outdated tracking, and source change detection).

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
- Navigation and settings are dedicated provider operations with separate configuration sections and Git directories.
- Locale resolution is centralized in Core; providers implement variant file resolution; format adapters and validators implement no locale logic.
- Locale requests fall back through an explicit chain to the configured default; projects without locale configuration keep the legacy flat retrieval path unchanged.

## Known Issues or Constraints

- The Git provider requires Node filesystem APIs.
- Git content supports JSON only.
- Generic singleton content remains separate from dedicated navigation and settings content and APIs.
- Localisation covers locale configuration, fallback resolution, and Git variant directories; translation workflows are not implemented.
- No remote CMS provider is implemented.
- No synchronization, webhook, or preview workflow is implemented.
- The package remains private while the pre-1.0 architecture is proven.

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
