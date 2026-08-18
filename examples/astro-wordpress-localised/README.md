# Localised Astro WordPress Example

This static Astro consumer owns explicit English and French variants at `/en/`, `/fr/`, and locale-prefixed routes for about, services, contact, and blog. It maps the home page to the published WordPress page with slug `home`, additional pages to their matching WordPress slugs, and the blog to published posts.

Set the WordPress environment variables:

```text
WORDPRESS_API_URL=https://wordpress.example.com/wp-json/wp/v2
WORDPRESS_USERNAME=your-wordpress-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

HTTPS is recommended outside local development. Create an Application Password under **Users > Your Profile > Application Passwords** in WordPress. Never expose credentials in client-side code, committed files, logs, or public environment variables.

Core locales are configured and every helper call forwards the active locale. The base WordPress provider is plugin-neutral and ignores locale options, so both route sets intentionally use the same source content. This proves consumer-owned routes, not WPML, Polylang, or translated WordPress content.

The example assumes public, published content with ACF-style structured fields and does not implement previews, plugin SEO, menus, or site settings.

Published WordPress `content.rendered` HTML is inserted by this consumer with `set:html`. The application must trust that HTML or sanitize it according to its own security policy; this example intentionally does not add a sanitizer.

After workspace install metadata includes this example and the root package has been built, run:

```sh
npm run build --workspace @nexuscontent/example-astro-wordpress-localised
```
