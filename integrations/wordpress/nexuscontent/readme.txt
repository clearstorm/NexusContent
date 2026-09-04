=== NexusContent Companion ===
Contributors: nexuscontent
Tags: headless, content, rest-api, gutenberg, acf
Requires at least: 6.6
Tested up to: 6.7
Requires PHP: 8.1
Stable tag: 0.1.4
License: MIT
License URI: https://opensource.org/license/mit

Contract-versioned, normalized WordPress page and post content for future NexusContent consumers.

== Description ==

= Purpose =

NexusContent Companion exposes normalized page and post sections, schema, capabilities, media, and diagnostics through WordPress REST routes. Content is read-only; the only write route is the admin-only project-contract push. Plugin 0.1.4 uses companion contract 1, serves posts through dedicated `posts` routes alongside the `pages` routes, and (when configured) dispatches signed, outbound-only change webhooks.

= Requirements =

WordPress 6.6+ and PHP 8.1+ are required. Gutenberg is supplied by WordPress. ACF is optional: ACF Free 6.2+ supports fixed fields, while legally supplied ACF Pro 6.2+ can add Flexible Content, repeater/gallery fields, and ACF blocks. Production needs neither Node nor Composer and has no Composer dependencies; Node 24 and Composer 2 are development-only.

= Modes, Gutenberg, and ACF =

Each page or post selects Gutenberg, ACF fixed fields, or ACF flexible sections. Gutenberg supports core content plus NexusContent blocks. Block inspectors edit headings and content in place, eyebrow inline above the heading, and a Section settings panel (section ID, variant, and theme); generated section IDs remain editable. Hero, Image and Text, and Call to Action blocks use a repeatable Buttons subcomponent with label, URL, and style. Each block includes a packaged static inserter and inspector preview. ACF Free provides flat, prefixed Hero, Introduction, and Call to Action fields plus a nested buttons repeater where available. Pro-only modes appear only when the required APIs exist. The plugin never downloads or distributes licensed ACF Pro; developers must legally provide and mount their own copy.

= Blocks and switching =

Supported blocks are Hero, Introduction, Rich Text, Image and Text, Features, Statistics, Testimonials, Gallery, Call to Action, FAQ, Logo Grid, and Form Embed. Logo Grid items accept a label, a logo image, or both. Switching modes preserves inactive content, exports only the active source, and warns about unavailable or conflicting sources. It does not convert or delete content.

= Routes and authentication =

GET routes under /wp-json/nexuscontent/v1 are /pages, /pages/{id}, /pages/slug/{slug}, /posts, /posts/{id}, /posts/slug/{slug}, /schema, and /capabilities. /pages and /posts each support pagination, search, slug, status, order, and orderby. Published passwordless pages and posts, schema, and capabilities are public. Draft collection access requires edit_posts; non-public individual entries require edit_post. Use standard WordPress REST cookies/nonces or Application Passwords over HTTPS.

POST /project-contract stores the consumer's expected components and section types for the admin dashboard. It requires manage_options; WordPress core enforces the REST nonce for cookie-authenticated requests, while non-cookie authentication (such as an Application Password over HTTPS) works without one. It accepts only sanitized string arrays and stores nothing but those arrays inside the plugin settings option.

= Preview =

POST /preview-token (requires edit_posts) mints a short-lived, single-use preview token for a draft or scheduled post; GET /preview/{token}/{id} serves the normalized envelope for a valid token without further authentication. The Gutenberg editor's "Open frontend preview" button mints a token and opens the configured preview_frontend_url with the token and post id.

= Webhooks =

Optional outbound change notifications. Set a webhook URL (and optional shared secret) on the NexusContent Settings page. On page or post create, update, trash, or restore, the plugin POSTs a compact JSON payload (event, id, type, slug, status, title, modifiedAt, source) to the configured URL. When a shared secret is set, the request carries an X-NexusContent-Signature header of the form sha256=<HMAC-SHA256 of the JSON body>. Dispatch is opt-in, outbound-only, and best-effort; it never triggers rebuilds or other site mutations. The consumer verifies the signature and decides what to do.

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

Run npm install, npm run build, npm run lint-js, npm run format:check, and npm run package. @wordpress/scripts compiles assets/src/editor.js and editor.css into assets/build/editor.js, editor.css, and editor.asset.php. Packaging creates repository-root dist/nexuscontent-0.1.4.zip and excludes maps, assets/src, tests, vendor, node_modules, local config, secrets, and dev configs.

Run composer install, composer validate, composer lint, composer phpcs, composer phpstan, and composer test-unit. For integration work run npm run env:start and npm run test:integration. wp-env starts without ACF; npm run env:acf-free:test followed by npm run test:integration:acf-free verifies a real ACF Free installation. ACF Pro must be legally mounted by the developer and is never downloaded by this project.

= Limitations and Phase 3 status =

0.1.4 content retrieval is read-only and page/post-focused: no mutations of site content, webhooks trigger no rebuilds, and synchronization, retries, caching of site content, SEO/localisation plugin mapping, endpoint discovery, content conversion, or bundled ACF Pro remain out of scope. HTML remains untrusted. The companion integration (Phase 3) is implemented: the NexusContent WordPress provider discovers these routes, negotiates contract version 1, caches capabilities, and falls back to standard REST retrieval when the plugin is unavailable. WordPress integration is verified in CI. The sole write route is the manage_options-only project-contract push, which stores consumer expectation metadata.

== Installation ==

1. Upload the release ZIP or extract it to wp-content/plugins/nexuscontent.
2. Activate NexusContent Companion in Plugins or with wp plugin activate nexuscontent.
3. Optionally install ACF Free 6.2+ or a legally obtained ACF Pro 6.2+.
4. Choose a NexusContent editor mode on each page or post. Activation does not migrate or alter content.

== Frequently Asked Questions ==

= Is ACF required? =

No. Gutenberg mode works without ACF.

= Does this install ACF Pro? =

No. ACF Pro is licensed software and must be legally supplied by the developer.

= Does the NexusContent provider use these routes today? =

Yes, when the provider runs with the companion strategy or auto-discovery. It discovers these routes, negotiates contract version 1, caches capabilities, and falls back to unmodified standard REST retrieval when the plugin is not reachable. Release status of the wrapping NexusContent milestone remains under repo control.

== Changelog ==

= 0.1.4 =

* Authoring now supports remote/external images: single-image controls, gallery items, and repeater media fields (Features thumbnails, Testimonials avatars, Logo Grid) offer a "paste image URL" text field beside the media-library picker. Media with no attachment metadata is normalized with a generic `image/*` mime type so the wire boundary treats it as media, and passwordless external URLs flow through unchanged.

= 0.1.3 =

* Section editor alignment: eyebrow is edited inline above the heading, the Additional fields panel is merged into a Section settings panel (section ID, variant, theme), and Hero, Image and Text, and Call to Action use a repeatable Buttons subcomponent (`label`, `url`, `style`) instead of the legacy action label/url pairs.
* Features items expose `title`, `description`, `points`, and `thumbnail`; Testimonials items expose `quote`, `author`, and `avatar`; Logo Grid items expose `name` and `image`.
* ACF editor fields align with the Gutenberg blocks and schema: fixed ACF Free fields register the new shapes and skip unavailable repeaters with a limitation instead of dropping the whole section.

= 0.1.2 =

* Draft and scheduled preview: POST /preview-token mints a short-lived single-use token, GET /preview/{token}/{id} serves the normalized envelope, and the editor's "Open frontend preview" button opens a tokenized consumer preview URL.
* Outbound change webhooks: opt-in webhook_url plus optional shared secret emit compact signed JSON on page/post create, update, trash, and restore (X-NexusContent-Signature: sha256=<HMAC>).

= 0.1.1 =

* Posts are served through dedicated `posts`, `posts/{id}`, and `posts/slug/{slug}` companion routes using the same contract-one envelope as pages.

= 0.1.0 =

* Initial companion plugin baseline and contract 1.
