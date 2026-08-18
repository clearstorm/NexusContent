# Astro WordPress Example

This small static Astro consumer maps the home page to the published WordPress page with slug `home`, additional pages to their matching WordPress slugs, and maps the blog to published posts. Astro owns `/`, `/about`, `/services`, `/contact`, `/blog/`, and `/blog/[slug]/`; pages retrieve normalized content only through the helpers in `src/nexus.ts`.

Set the WordPress environment variables:

```text
WORDPRESS_API_URL=https://wordpress.example.com/wp-json/wp/v2
WORDPRESS_USERNAME=your-wordpress-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

HTTPS is recommended outside local development. Create an Application Password under **Users > Your Profile > Application Passwords** in WordPress. Never expose credentials in client-side code, committed files, logs, or public environment variables.

The example uses the base, plugin-neutral WordPress provider. It assumes public, published pages and posts with ACF-style structured fields and does not implement previews, plugin SEO, menus, or site settings.

Published WordPress `content.rendered` HTML is inserted by this consumer with `set:html`. The application must trust that HTML or sanitize it according to its own security policy; this example intentionally does not add a sanitizer.

After workspace install metadata includes this example and the root package has been built, run:

```sh
npm run build --workspace @nexuscontent/example-astro-wordpress
```
