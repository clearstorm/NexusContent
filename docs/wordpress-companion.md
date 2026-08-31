# NexusContent WordPress Companion Plugin

Project-facing definition of the optional WordPress companion plugin. The
plugin README covers installation and usage; this document explains what the
plugin is, why it exists, and the permanent boundaries around it.

## What It Is

NexusContent Companion is an optional WordPress plugin (version `0.1.1`) that
turns a standard WordPress install into a source of normalized, contract-
versioned JSON for NexusContent consumers.

WordPress remains the content system. The plugin owns the WordPress-side
editor and transport machinery:

- editor-mode picker and storage
- server-side section normalization
- schema and capability metadata
- structured diagnostics
- secured, contract-versioned REST routes

The TypeScript WordPress provider owns everything NexusContent-facing:
discovery, transport, contract validation, fallback, and normalized retrieval.
The provider must never call the plugin's WordPress internals directly, and
the plugin must never reach into NexusContent Core.

## Why It Exists

Standard WordPress REST API content is raw editor output: block markup inside
`content.rendered`, free-floating ACF fields, and plugin-specific SEO blobs. A
consumer cannot reliably turn that into structured sections without the
consumer becoming WordPress-layout-aware.

The companion plugin closes that gap at the content source:

- Gutenberg blocks and optional ACF layouts are normalized server-side into the
  canonical section vocabulary before they ever reach NexusContent.
- Responses travel over a versioned wire contract, so shape drift between the
  plugin and the provider is detected instead of silently misparsed.
- The base REST provider remains plugin-neutral; sites without the plugin keep
  working through standard REST retrieval.

## What It Does

### Editor Modes

Each page and standard post stores one `nexus_editor_mode`:

| Mode | Requires | Notes |
|------|----------|-------|
| `gutenberg` | WordPress core | Native block editor, default |
| `acf_fixed` | ACF Free 6.2+ | Fixed Hero, Introduction, and Call to Action fields |
| `acf_flexible` | ACF Pro 6.2+ | Flexible layouts for all 12 sections |

Only the active source is normalized. Inactive field-group data remains stored
in WordPress and is never merged into responses.

### Section Normalization

Visible content is normalized server-side into the canonical 12-section
vocabulary:

`hero`, `intro`, `rich_text`, `image_text`, `features`, `statistics`,
`testimonials`, `gallery`, `cta`, `faq`, `logo_grid`, `form_embed`

The vocabulary is defined in exactly one place,
`integrations/wordpress/nexuscontent/sections.json`. The PHP `Section_Registry`
and the generated `src/providers/wordpress/sections.generated.ts` both derive
from it; `npm run check:sections` enforces freshness.

Core Gutenberg blocks (rich-text, image, gallery, cover, container) and native
NexusContent blocks are converted. Unsupported visible blocks degrade to
flagged rich-text data with diagnostics rather than being dropped silently.

### Auto-Creating ACF Layouts for Custom Sections

Custom section types flow through the same registry and automatically get the
same ACF surface as the built-in twelve:

- The ACF loader registers a flexible-content layout for every registry
  section. A section added through the `nexuscontent_section_definitions`
  filter therefore appears in the `acf_flexible` editor immediately, and is
  normalized generically by the flexible-sections path.
- ACF fields are derived from the section's `fields` definitions:
  `string` → text, `number` → number, `boolean` → true/false, `datetime` →
  date/time picker, `media` → image, `richText` → wysiwyg. Field types ACF
  cannot represent faithfully (such as `json` item arrays, whose keys are
  consumer-owned and must not be invented) are skipped with a diagnostic;
  consumers needing richer layouts register them explicitly through the
  `nexuscontent_acf_layout_definitions` filter.
- The shipped `nexus-contract` CLI (see `scripts/nexus-contract.mjs`) generates a consumer-owned must-use plugin drop-in that registers the custom sections referenced by a project contract (`components` + `sectionTypes`, with an optional `componentTypeMap`). It classifies each expected type as installed (built-in), declared (emitted), or missing (fails the run), warns about declared-but-unused sections, and opts those types into the `acf`/`both` block implementation so the ACF block appears too. The `project-contract` route stays a read-only drift comparison; the CLI's `generate` subcommand is the action that turns the contract into registered sections.
  - `generate --schema <file> --custom <file>` derives the contract from the consumer's own field schema (runtime-imported through `projectComponentContract`); `generate --contract <file> --custom <file>` reads a serialized contract. Optional `--write <path>` writes the mu-plugin to a file instead of stdout.
  - Classification uses the live companion `/schema` response when `--api-root` is given; otherwise it falls back to the bundled offline vocabulary in `scripts/sections.json` (a copy of the canonical `sections.json`).
  - `push --schema|--contract --api-root --username --app-password` posts the contract to the admin-only `nexuscontent/v1/project-contract` route (`WORDPRESS_API_URL`/`WORDPRESS_USERNAME`/`WORDPRESS_APP_PASSWORD` env fallbacks).
- The generated drop-in is WordPress code owned by the consumer and must not be committed to this repository. The built-in vocabulary in `sections.json` and its generated TypeScript counterpart are never edited by the CLI.

### Media Metadata

The plugin expands media metadata (id, url, mime type, width, height, alt).
The TypeScript provider boundary converts the wire `image.url` representation
to the provider-neutral `MediaAsset src` before anything reaches Core or a
consumer.

### Diagnostics and Capabilities

- Structured diagnostic entries carry severity, code, message, and an optional
  path.
- Exact capability reporting describes what the installed plugin can do
  (editor modes, ACF levels, media library, custom post types, sections,
  locale/preview/webhook support).

## Contract and Transport

All content routes live under `nexuscontent/v1` and speak contract version 1:

```
{ "contractVersion": 1, "data": ..., "diagnostics"?: [...] }
```

Content routes:

- `GET /nexuscontent/v1/schema`
- `GET /nexuscontent/v1/capabilities`
- `GET /nexuscontent/v1/pages`
- `GET /nexuscontent/v1/pages/{id}`
- `GET /nexuscontent/v1/pages/slug/{slug}`
- `GET /nexuscontent/v1/posts`
- `GET /nexuscontent/v1/posts/{id}`
- `GET /nexuscontent/v1/posts/slug/{slug}`
- `POST /nexuscontent/v1/preview-token`
- `GET /nexuscontent/v1/preview/{token}/{id}`

The dedicated `posts` routes (added in plugin `0.1.1`) are post-type-aware:
they serve only posts and reject page ids/slugs with `404`. The built-in
`posts` collection routes to them through `WordPressCollectionConfig.
companionRoute` (`"pages" | "posts"`, default `"posts"`).

### Preview

`POST /nexuscontent/v1/preview-token` (requires `edit_posts`) mints a
64-character hex token bound to a single post id, stored in a WordPress
transient with a filterable TTL (default 15 minutes). The public
`GET /nexuscontent/v1/preview/{token}/{id}` route returns the normalized
page/post envelope for a valid, matching, unexpired token — the token itself is
the auth, so no session is required. Invalid, expired, or mismatched tokens
return `401` and are revoked on use. A Gutenberg "Open frontend preview"
button, gated by the `preview_frontend_url` admin setting, mints a token and
opens a consumer preview route with `?token=...&id=...`.

Permissions preserve WordPress REST boundaries. The admin-only
`POST /nexuscontent/v1/project-contract` route requires `manage_options`,
stores only sanitized `components`/`sectionTypes` arrays in
`nexuscontent_settings`, lives outside the content wire contract (no
`contractVersion` negotiation), and never reconfigures editor settings. Its
Dashboard card is a read-only expected-vs-installed drift comparison.

## Provider ↔ Plugin Interaction

The TypeScript provider talks to the plugin only under the companion API
strategies:

- `apiStrategy: "companion"` — companion routes required; missing plugin or
  shape mismatch throws an actionable error.
- `apiStrategy: "auto"` — uses the plugin when present and healthy, falls back
  to standard REST otherwise.
- `apiStrategy: "core"` — standard REST only; the plugin is never called.

The provider negotiates the companion contract version, reconciles its section
registry against the site's live `/schema` (install-only sections extend the
registry; registry-only or conflicting sections surface as diagnostics), and
converts companion section media recursively (`wire image.url` →
`MediaAsset src`).

## Boundaries and Non-Goals

- Released base REST retrieval remains plugin-neutral and must not require or
  call the companion plugin.
- ACF is optional. ACF Free supports the fixed fields; ACF Pro (only with a
  legally supplied license) enables flexible layouts and opt-in ACF Blocks.
- No webhooks, mutations, or synchronization.
- No plugin SEO mapping, localisation-plugin contracts, or multi-site logic.
- WordPress stays the content system; consumers own routes and rendering.
- Plugin code stays under `integrations/wordpress/nexuscontent/`. It is never
  Core and never provider code.

## Requirements and Artifact

- WordPress 6.6+ and PHP 8.1+.
- Gutenberg uses WordPress core. ACF Free 6.2+ and ACF Pro 6.2+ are optional.
- Node.js and Composer are build-only; production servers need neither.
- The release artifact is `dist/nexuscontent-0.1.1.zip`.

## Version History

| Version | Change |
|---------|--------|
| `0.1.0` | Phase 2 base: editor modes, section normalization, schema/capabilities, and route scaffolding delivered through the `pages` routes |
| `0.1.1` | Dedicated `posts`, `posts/{id}`, and `posts/slug/{slug}` routes with post-type-aware handlers; provider routes the built-in `posts` collection to them |