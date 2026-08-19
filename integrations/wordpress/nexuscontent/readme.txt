=== NexusContent Companion ===
Contributors: nexuscontent
Tags: headless, content, rest-api, gutenberg, acf
Requires at least: 6.6
Tested up to: 6.6
Requires PHP: 8.1
Stable tag: 0.1.0
License: MIT
License URI: https://opensource.org/license/mit

Contract-versioned, normalized WordPress page content for future NexusContent consumers.

== Description ==

= Purpose =

NexusContent Companion exposes normalized page sections, schema, capabilities, media, and diagnostics through read-only WordPress REST routes. Plugin 0.1.0 uses companion contract 1.

= Requirements =

WordPress 6.6+ and PHP 8.1+ are required. Gutenberg is supplied by WordPress. ACF is optional: ACF Free 6.2+ supports fixed fields, while legally supplied ACF Pro 6.2+ can add Flexible Content, repeater/gallery fields, and ACF blocks. Production needs neither Node nor Composer and has no Composer dependencies; Node 24 and Composer 2 are development-only.

= Modes, Gutenberg, and ACF =

Each page selects Gutenberg, ACF fixed fields, or ACF flexible sections. Gutenberg supports core content plus NexusContent blocks. Block inspectors expose eyebrow, section ID, variant, and theme as additional fields; generated section IDs remain editable. Each block includes a packaged static inserter and inspector preview. ACF Free provides flat, prefixed Hero, Introduction, and Call to Action fields. Pro-only modes appear only when the required APIs exist. The plugin never downloads or distributes licensed ACF Pro; developers must legally provide and mount their own copy.

= Blocks and switching =

Supported blocks are Hero, Introduction, Rich Text, Image and Text, Features, Statistics, Testimonials, Gallery, Call to Action, FAQ, Logo Grid, and Form Embed. Logo Grid items accept a label, a logo image, or both. Switching modes preserves inactive content, exports only the active source, and warns about unavailable or conflicting sources. It does not convert or delete content.

= Routes and authentication =

GET routes under /wp-json/nexuscontent/v1 are /pages, /pages/{id}, /pages/slug/{slug}, /schema, and /capabilities. /pages supports pagination, search, slug, status, order, and orderby. Published passwordless pages, schema, and capabilities are public. Draft collection access requires edit_posts; non-public individual pages require edit_post. Use standard WordPress REST cookies/nonces or Application Passwords over HTTPS.

= Contract, capabilities, and schema =

Contract 1 envelopes contain contractVersion, data, and optional diagnostics. Capabilities report plugin and WordPress versions, Gutenberg, ACF/Pro/blocks/Flexible Content, editor modes, section types, and optional ACF version. Schema reports editor modes, canonical field definitions, and source aliases. Output is validated before REST delivery.

= Media =

Media normalizes URL, ID, alt, caption, MIME type, dimensions, and sizes when available. Permissions are respected, unavailable attachments emit diagnostics, and consumers own URL policy and rendering.

= Filters =

All filters run before final output and must return the stated type:

* nexuscontent_section_definitions($definitions): returns definitions; first registry load, then cached.
* nexuscontent_section_data($data, $type, $post_id): returns section data after normalization, before assembly.
* nexuscontent_page_data($page, $post): returns page data before contract validation.
* nexuscontent_media($media, $original): returns media array or null before insertion.
* nexuscontent_schema($schema): returns schema array before validation.
* nexuscontent_capabilities($capabilities): returns capability array before sanitization.
* nexuscontent_supported_editor_modes($modes): returns valid mode strings during detection.
* nexuscontent_block_implementations($selection, $type): returns native, acf, both, or an array during block registration.
* nexuscontent_fixed_field_definitions($definitions): returns ACF fixed definitions before registration.
* nexuscontent_acf_layout_definitions($layouts, $field_types): returns layouts before Flexible Content registration.
* nexuscontent_editor_mode_capabilities($modes): returns mode descriptors before editor localization.
* nexuscontent_editor_mode_content_presence($presence, $post_id): returns mode booleans before switch-warning localization.
* nexuscontent_editor_settings_panel_available($available, $post_type): returns boolean when panel availability is queried.
* nexuscontent_embed_allowed_html($allowlist): returns KSES rules while rendering restricted embeds.

nexuscontent_companion_loaded($registry) fires after registration. nexuscontent_acf_limitations($limitations) fires after ACF inspection.

= Build and tests =

Run npm install, npm run build, npm run lint-js, npm run format:check, and npm run package. @wordpress/scripts compiles assets/src/editor.js and editor.css into assets/build/editor.js, editor.css, and editor.asset.php. Packaging creates repository-root dist/nexuscontent-0.1.0.zip and excludes maps, assets/src, tests, vendor, node_modules, local config, secrets, and dev configs.

Run composer install, composer validate, composer lint, composer phpcs, composer phpstan, and composer test-unit. For integration work run npm run env:start and npm run test:integration. wp-env starts without ACF; npm run env:acf-free:test followed by npm run test:integration:acf-free verifies a real ACF Free installation. ACF Pro must be legally mounted by the developer and is never downloaded by this project.

= Limitations and Phase 3 status =

0.1.0 is read-only and page-focused: no mutations, preview transport, webhooks, synchronization, retries, caching, SEO/localisation plugin mapping, endpoint discovery, content conversion, or bundled ACF Pro. HTML remains untrusted. The plugin is Phase 2 and still awaits WordPress integration verification in CI. Phase 3 provider discovery and transport are planned; the NexusContent WordPress provider does not call this plugin yet, and NexusContent v0.2.1 is not finalized.

== Installation ==

1. Upload the release ZIP or extract it to wp-content/plugins/nexuscontent.
2. Activate NexusContent Companion in Plugins or with wp plugin activate nexuscontent.
3. Optionally install ACF Free 6.2+ or a legally obtained ACF Pro 6.2+.
4. Choose a NexusContent editor mode on each page. Activation does not migrate or alter content.

== Frequently Asked Questions ==

= Is ACF required? =

No. Gutenberg mode works without ACF.

= Does this install ACF Pro? =

No. ACF Pro is licensed software and must be legally supplied by the developer.

= Does the NexusContent provider use these routes today? =

No. Provider integration and the v0.2.1 contract are not finalized.

== Changelog ==

= 0.1.0 =

* Initial companion plugin baseline and contract 1.
