# NexusContent Companion

## Purpose

NexusContent Companion exposes WordPress pages and standard posts as normalized, contract-versioned JSON for future NexusContent consumers. WordPress remains the content system; the plugin supplies editor modes, section normalization, diagnostics, schema metadata, and REST transport.

## Installation

Install the release ZIP through **Plugins > Add New > Upload Plugin**, or extract it as `wp-content/plugins/nexuscontent`. Release archives include all PHP, block metadata, and compiled editor assets. Production servers need neither Node.js nor Composer.

## Activation

Activate **NexusContent Companion** in WordPress Admin or run `wp plugin activate nexuscontent`. Activation does not install ACF, migrate content, or change existing content.

## Requirements

- Plugin version `0.1.0`; companion contract `1` (`contract1`).
- WordPress 6.6 or newer and PHP 8.1 or newer.
- Gutenberg uses WordPress core. ACF is optional.
- ACF Free 6.2 or newer supports fixed fields. A legally supplied ACF Pro 6.2 or newer enables Pro-only capabilities where available.
- Node.js 24 is build-only. Composer 2 and all Composer packages are development-only. There are no production Composer dependencies.

## Editor Modes

Each page and post stores one `nexus_editor_mode`: `gutenberg`, `acf_fixed`, or `acf_flexible`. The section field groups and editor-mode selector are available on both pages and standard posts. Only the selected source is normalized; inactive source data remains stored and is never merged into the response.

## Gutenberg

Gutenberg is available when the page or post type supports the block editor. Core rich-text, image, gallery, cover, and container blocks are normalized, alongside registered NexusContent blocks. Unsupported visible blocks are retained as flagged rich-text data with diagnostics where possible.

NexusContent blocks edit headings and primary content in place. The inspector's Additional fields panel exposes eyebrow, section ID, variant, and theme. Section IDs follow the heading until an editor enters a custom value. Every block includes a packaged static illustration in the inserter preview and Block preview panel.

## ACF Free

ACF Free 6.2+ is optional. It enables `acf_fixed`, which provides predictable flat, prefixed Hero, Introduction, and Call to Action fields. The plugin checks capabilities at runtime and continues to work without ACF.

## ACF Pro

ACF Pro 6.2+ can enable Flexible Content, repeater/gallery-backed layouts, and ACF blocks when those APIs are present. ACF Pro is proprietary: this repository, package, scripts, and CI never download or distribute it. Developers must provide their own validly licensed copy.

For local testing, start wp-env, place a legally obtained ACF Pro ZIP at `.local/advanced-custom-fields-pro.zip`, then install that mounted file:

```bash
npm run env:start
npm exec wp-env run cli wp plugin install wp-content/plugins/nexuscontent/.local/advanced-custom-fields-pro.zip --activate
```

Never commit the ZIP, credentials, or license data. Remove `.local/` when finished.

## Blocks

The plugin defines Hero, Introduction, Rich Text, Image and Text, Features, Statistics, Testimonials, Gallery, Call to Action, FAQ, Logo Grid, and Form Embed blocks. Native blocks are the default implementation. Logo Grid items accept a label, a logo image, or both. `nexuscontent_block_implementations` can select `native`, `acf`, `both`, or a per-type selection when ACF block APIs are available.

## Switching Modes

Use the NexusContent document settings panel or editor meta box. Switching modes preserves all content but exports only the active source. The editor warns when inactive content exists and reports unavailable modes instead of deleting or converting content.

## REST Routes

The `GET` routes below are public or capability-gated as documented. The single write route is described separately because it sits outside the content wire contract.

### `GET`

| Route | Purpose |
|---|---|
| `/pages` | Paginated pages; accepts `page`, `per_page`, `search`, `slug`, `status`, `order`, and `orderby`. |
| `/pages/{id}` | One page by positive numeric ID. |
| `/pages/slug/{slug}` | One page by slug. |
| `/schema` | Supported editor modes, section definitions, and source mappings. |
| `/capabilities` | Runtime WordPress, Gutenberg, and ACF capability report. |

Collection responses also expose `X-WP-Total` and `X-WP-TotalPages`.

### `POST /project-contract` (admin only)

`POST /wp-json/nexuscontent/v1/project-contract` stores the consumer project's expected component contract:

```json
{ "components": ["hero", "servicesList"], "sectionTypes": ["hero", "features"] }
```

Only `manage_options` callers may write. WordPress core enforces the REST nonce for cookie-authenticated requests itself, so non-cookie authentication (such as an Application Password over HTTPS) works without a nonce header. Payloads are sanitized string arrays, deduplicated and sorted, and stored as `project_components` inside the existing `nexuscontent_settings` option. The route is a read-only comparison aid for the admin dashboard — it never reconfigures editor settings automatically. It lives outside the content wire contract, so no `contractVersion` negotiation applies. No credentials are accepted or stored.

The NexusContent consumer derives the payload from its schema via the public `projectComponentContract()` API, then POSTs it. An equivalent manual push:

```sh
curl -X POST https://example.com/wp-json/nexuscontent/v1/project-contract \
  -u "admin:xxxx xxxx xxxx xxxx xxxx xxxx" \
  -H "Content-Type: application/json" \
  -d '{"components":["hero","servicesList"],"sectionTypes":["hero","features"]}'
```

## Authentication

Published, passwordless pages, schema, and capabilities are public. Non-published collection queries require `edit_posts`; a non-public individual page requires `edit_post` for that page. Use normal WordPress REST authentication, such as an authenticated admin cookie plus nonce or an Application Password over HTTPS. The plugin adds no credentials and never accepts secrets in URLs.

## Contract

Contract 1 responses use `{ "contractVersion": 1, "data": ..., "diagnostics"?: [...] }`. Diagnostics contain `severity`, `code`, `message`, and optional `path`. Endpoint-owned output is validated before sending; invalid output becomes a structured 500 error. Contract changes require an explicit version rather than silent shape drift.

## Capabilities

`/capabilities` reports `pluginVersion`, `wordpressVersion`, `gutenberg`, `acf`, `acfPro`, `acfBlocks`, `flexibleContent`, `editorModes`, `sectionTypes`, and `acfVersion` when available. Values describe the current installation and are sanitized before REST output.

## Schema

`/schema` reports editor modes, canonical section definitions and field metadata, plus aliases from Gutenberg and ACF source names to canonical types. Schema is descriptive; consumers must still validate response data.

## Media

Attachments normalize to JSON-safe objects with URL and, when available, ID, alt text, caption, MIME type, dimensions, and registered sizes. Request permissions are respected, repeated attachment lookups are cached per normalizer instance, and unavailable media produces diagnostics. Consumers remain responsible for URL policy and frontend rendering.

## Filters And Actions

Filters must return the documented value type; malformed values may be discarded, sanitized, or rejected by contract validation.

| Hook | Parameters | Return | Timing |
|---|---|---|---|
| `nexuscontent_section_definitions` | `$definitions` keyed by canonical type | Definition array | First registry materialization; result is cached for the request. |
| `nexuscontent_section_data` | `$data`, `$type`, `$post_id` | Section data array | After source normalization, before section assembly. |
| `nexuscontent_page_data` | `$page`, `WP_Post $post` | Normalized page array | After page normalization, before contract validation and REST output. |
| `nexuscontent_media` | `$media`, `$original_value` | Media array or `null` | Immediately before normalized media enters page data. |
| `nexuscontent_schema` | `$schema` | Schema data array | Immediately before schema contract validation. |
| `nexuscontent_capabilities` | `$capabilities` | Capability array | After detection, before sanitization and REST output. |
| `nexuscontent_supported_editor_modes` | `$modes` | Array of valid mode strings | During runtime mode capability detection. |
| `nexuscontent_block_implementations` | `$selection`, `$type` | `native`, `acf`, `both`, or selection array | During native and ACF block registration; may run more than once. |
| `nexuscontent_fixed_field_definitions` | `$definitions` | ACF field definition array | Before the ACF Free-compatible fixed group is registered. |
| `nexuscontent_acf_layout_definitions` | `$layouts`, `$field_types` | ACF layout array | Before the Pro Flexible Content group is registered. |
| `nexuscontent_editor_mode_capabilities` | `$modes` | Mode descriptor array | Before settings are localized to the block editor. |
| `nexuscontent_editor_mode_content_presence` | `$presence`, `$post_id` | Mode-to-boolean map | Before mode-switch warning data is localized. |
| `nexuscontent_embed_allowed_html` | `$allowed_html` | KSES allowlist | Whenever Form Embed is normalized or rendered. |

`nexuscontent_companion_loaded` fires with the `Section_Registry` after core services and optional integrations register. `nexuscontent_acf_limitations` fires with the limitation string array after ACF capability inspection.

## Build

From this plugin directory:

```bash
npm install
npm run build
npm run lint-js
npm run format:check
npm run package
```

`@wordpress/scripts` compiles `assets/src/editor.js` and its `assets/src/editor.css` import into `assets/build/editor.js`, `editor.css`, and `editor.asset.php`. `npm run package` writes `dist/nexuscontent-0.1.0.zip` at the repository root and verifies its bootstrap and contents. Source maps, source assets, tests, dependencies, local configuration, and secrets are excluded.

## Tests

Install Composer 2 dependencies locally with `composer install`; they are not shipped:

```bash
composer validate --strict --no-check-lock
composer lint
composer phpcs
composer phpstan
composer test-unit
npm run env:start
npm run test:integration
npm run env:acf-free:test
npm run test:integration:acf-free
npm run env:stop
```

The default wp-env has no ACF. Run `npm run env:acf-free` for the development site or `npm run env:acf-free:test` followed by `npm run test:integration:acf-free` for the integration-test site. `npm run env:no-acf` returns the development site to the no-ACF case. Docker is required by wp-env.

## Limitations

Version 0.1.0 is read-only and page/post-focused, scoped to pages and standard posts. It does not provide mutations, preview transport, webhooks, synchronization, retries, caching, SEO-plugin mapping, localisation-plugin behavior, endpoint discovery, or an ACF Pro distribution. Rendered and editor-provided HTML remains untrusted consumer input. Mode switching does not convert content.

## Phase 3 Status

The companion integration is implemented. With the default `auto` API strategy, the NexusContent WordPress provider discovers these routes through the companion client, negotiates contract version 1, caches capabilities and content, and preserves unmodified standard REST retrieval as its fallback. The base provider's standard REST path is unchanged and remains available when the plugin has not been installed. WordPress integration is verified in CI.
