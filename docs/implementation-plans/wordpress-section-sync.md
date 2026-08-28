# Implementation Plan: WordPress Component Synchronisation

Date: 2026-08-28
Status: planned (not started)
Owner: NexusContent (WordPress provider + companion plugin)

## Problem

The section/component vocabulary lives in three copies that can drift:

1. Companion plugin (PHP) — canonical truth: `includes/class-section-registry.php`
   (`TYPES`, per-section `FIELDS`, `SOURCE_NAMES`/aliases). The WP normalizer
   consults only this (`class-normalizer.php:97` Gutenberg, `:229` ACF layouts).
2. TS provider — hand-mirrored copy in `src/providers/wordpress/sections.ts`
   (`FIELD_SCHEMAS`, `BUILTIN_SECTIONS`, alias table). Guarded only by static
   fixture tests (`tests/contracts/contracts.test.ts`); consumed at runtime by
   nothing except `capabilities().sections`.
3. Consumer project — `schema.components` / model fields
   (`examples/astro-wordpress/src/schema/schema.ts`), hand-declared, linked to
   canonical sections only by name convention (e.g. `hero` component fields
   `intro`/`cta` vs canonical `body`/`primary_action_label`).

Failures today:

- Unknown names degrade instead of failing: unknown ACF layouts dropped with a
  diagnostic warning (`class-normalizer.php:230-233`); unknown Gutenberg blocks
  fold into rich text (`:111`). A project-declared component mapping to nothing
  gets no hard signal.
- New sections added on WP via the `nexuscontent_section_definitions` filter are
  invisible to the TS copy and unusable by consumers.
- The companion `/schema` endpoint already returns the live truth —
  `sectionDefinitions` + `sourceMappings` (`companion-schemas.ts:98-102`) — and
  `companion-client.getSchema()` fetches+caches it (`companion-client.ts:130-136`)
  but nothing consumes it.

Outcome: plugin components used on a project stay synchronised with the
WordPress components, and drift is loud and actionable instead of silent.

## Phase 1 — A: Live registry reconciliation (provider <-> plugin /schema)

- `src/providers/wordpress/sections.ts`: add `reconcileSectionRegistry(
  registry, schemaData): WordPressSectionSyncResult` (pure). Result fields:
  `knownTypes`, `registryOnly`, `installOnly`, `conflicts`.
- `src/providers/wordpress/provider.ts`: after companion discovery
  (auto/companion strategies), call `getSchema()` once (already cached) and
  reconcile. `installOnly` types (added via plugin filter) extend the effective
  registry from live `sectionDefinitions`; `registryOnly`/`conflicts`
  (consumer-declared `customSections` the install does not report) surface as
  structured diagnostics; throw an actionable `ProviderError` in `companion`
  strict mode.
- `src/providers/wordpress/responses.ts`: add `WordPressSectionSyncResult`;
  extend `WordPressProviderFacingCapabilities` with
  `sectionSync: "synced" | "unsynced" | "none"`; add `schemaStatus()` accessor.
- Export new types via `src/providers/wordpress/index.ts`.
- Tests: `tests/providers/wordpress-schema-sync.test.ts` (local stub server per
  `wordpress-companion.test.ts` pattern): clean sync, WP-only custom section,
  registry-only custom section, strict-mode throw on conflict.

Boundary: hooks only into the companion auto/companion discovery path. Released
`0.2.0` base retrieval and the `core`-strategy example stay unchanged. No plugin
changes.

## Phase 2 — B: Consumer component validation (build time)

- New `src/providers/wordpress/schema-validation.ts`:
  `validateWordPressComponents(components, registry, syncResult?)`.
  For every field of type `component` and every `blocks.allowedComponents`:
  - Resolve the component name through `sourceMappings` / canonical `type`s.
  - Hard error only on unresolvable names (a component the install can never
    produce). Error code: `wordpress/unknown-component`.
  - Canonical-field delta (declared component fields vs the canonical section's
    `fields[].name`) is a `wordpress/field-delta` warning, not an error;
    optional `strictFields` opt-in promotes it.
- Linkage: exact name match by default; new provider option
  `componentTypeMap?: Record<string, string>` bridges mismatches
  (e.g. `servicesList -> features`). Core's `ComponentSchema` remains
  provider-neutral (AGENTS §5).
- `WordPressProvider.validateComponents(components)` returns a validation result;
  `examples/astro-wordpress/src/nexus.ts` calls it at module init and throws on
  unknown names. Strategy-independent; runs even though the example uses
  `apiStrategy: "core"`.
- Tests: valid, unknown-component, blocked `blocks` component, field-delta map
  cases.
- Verification: `npm run typecheck`, `npm test`, `npm run test:astro`.

## Phase 3 — C: Shared JSON single source + parity gate

- New `integrations/wordpress/nexuscontent/sections.json`: authoritative
  definitions for all 12 canonical sections (type, sourceType, sourceKey,
  aliases, fields).
- `class-section-registry.php`: load `sections.json` at runtime
  (`definitions()`), keeping the `nexuscontent_section_definitions` filter as the
  extension seam.
- New `scripts/generate-sections.mjs`: generates
  `src/providers/wordpress/sections.generated.ts` (typed literals replacing
  `FIELD_SCHEMAS` / `WORDPRESS_SECTION_NAMES`). No runtime JSON import in the
  provider, preserving platform neutrality.
- `npm run build` runs the generator; new `npm run check:sections` regenerates
  and fails on diff.
- Regenerate `tests/contracts/fixtures/companion-schema.json` to the full
  canonical set; strengthen `contracts.test.ts` to assert JSON <-> generated TS
  <-> fixture parity (supersedes the hard-coded literal at `:321-329`).
- `package.json` scripts + `.github/workflows/ci.yml`: add `check:sections`.
- Plugin: update `tests/unit` for JSON loading; PHP lint / PHPCS / PHPStan pass.
- Update TS and plugin definitions together (AGENTS §25.1).

## Phase 4 — D: Project -> editor sync (D1 + D2)

### D1 — Provider contract export + secured transport

- `WordPressProvider.projectComponentContract(schema)` -> serializable
  `{ components: string[], sectionTypes: string[] }`, derived from Phase 2
  resolution.
- `class-rest-controller.php`: new secured
  `POST /nexuscontent/v1/project-contract` — `manage_options` permission +
  nonce, sanitized string arrays, stored as `project_components` inside the
  existing `nexuscontent_settings` option. Lives outside the content wire
  contract, so no `contractVersion` negotiation change. No custom credential
  storage (AGENTS §25.1).
- Optional `scripts/push-project-contract.mjs` for CI pushes.

### D2 — Admin visibility

- `class-capabilities.php`: project-available projection visible only to
  `manage_options` callers (never on the public path).
- `class-admin-page.php`: "Project contract" dashboard card + drift table that
  mirrors the existing checkbox-grid/card patterns
  (`render_enabled_sections_field():609-644`) — project-expected vs
  install-available vs `enabled_sections` (missing / unused / disabled).
  Read-only comparison; never auto-reconfigures editor settings.

### D tests

- Plugin `tests/unit` (RestControllerTest new secured POST + AdminPageTest
  contract card) and `tests/integration` (wp-env: secured POST, storage,
  permission boundary).

## Sequencing & verification

1. A then B (B consumes A's reconciled data) -> TS tests, `npm test`,
   `test:astro`.
2. C -> fixture regeneration, `contracts.test.ts`, plugin unit tests,
   PHP lint/PHPCS/PHPStan + plugin CI, `check:sections`.
3. D1 then D2 -> plugin unit + wp-env integration, `test:astro`.

## Documentation & state updates (AGENTS §0.3)

Update when feature status changes, in the same change:

- `AGENTS.md` §25 / §25.1 (WordPress provider + companion boundaries,
  synchronisation capabilities).
- `README.md` WordPress provider section (validation + sync + admin card).
- `CHANGELOG.md` (unreleased section).
- `FEATURES.md`, `project.state.json`, `PROJECT_STATUS.md` reconciled with
  implementation reality.
- Companion and synchronisation work remain unreleased until the
  `0.2.1`/`0.2.2` release decision.

## Constraints

- Released `0.2.0` base retrieval and the `core`-strategy example stay
  behaviorally unchanged.
- Strict TypeScript; no `any`; `unknown` at untrusted boundaries.
- No secrets in errors, logs, tests, or fixtures.
- Contract changes update TypeScript and plugin definitions together.
- No commits unless explicitly requested.