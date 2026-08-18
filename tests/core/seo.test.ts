import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSeo } from "../../src/index.ts";
import type { ResolveSeoInput } from "../../src/index.ts";

test("resolves explicit SEO values before content and site fallbacks", () => {
  const explicitImage = { url: "https://example.com/explicit.jpg" };

  const resolved = resolveSeo(
    {
      title: "Content title",
      excerpt: "Content excerpt",
      featuredImage: { url: "https://example.com/featured.jpg" },
      seo: {
        title: "SEO title",
        description: "SEO description",
        canonicalUrl: "https://example.com/page",
        robots: { index: false, follow: true },
        openGraph: {
          title: "Open Graph title",
          description: "Open Graph description",
          image: explicitImage,
          type: "article"
        },
        twitter: {
          card: "summary_large_image",
          title: "Twitter title",
          description: "Twitter description",
          image: explicitImage
        },
        structuredData: [{ "@type": "Article" }]
      }
    },
    {
      siteTitle: "Site title",
      defaultImage: { url: "https://example.com/default.jpg" }
    }
  );

  assert.deepEqual(resolved, {
    title: "SEO title",
    description: "SEO description",
    canonicalUrl: "https://example.com/page",
    robots: { index: false, follow: true },
    openGraph: {
      title: "Open Graph title",
      description: "Open Graph description",
      image: explicitImage,
      type: "article"
    },
    twitter: {
      card: "summary_large_image",
      title: "Twitter title",
      description: "Twitter description",
      image: explicitImage
    },
    structuredData: [{ "@type": "Article" }]
  });
});

test("uses content values before site defaults", () => {
  const featuredImage = { url: "https://example.com/featured.jpg" };
  const resolved = resolveSeo(
    {
      title: "Content title",
      excerpt: "Content excerpt",
      summary: "Content summary",
      featuredImage
    },
    {
      siteTitle: "Site title",
      defaultImage: { url: "https://example.com/default.jpg" }
    }
  );

  assert.deepEqual(resolved, {
    title: "Content title",
    description: "Content excerpt",
    openGraph: {
      title: "Content title",
      description: "Content excerpt",
      image: featuredImage
    },
    twitter: {
      title: "Content title",
      description: "Content excerpt",
      image: featuredImage
    }
  });
});

test("uses site defaults only when content values are absent", () => {
  const defaultImage = { url: "https://example.com/default.jpg" };

  assert.deepEqual(resolveSeo({}, { siteTitle: "Site title", defaultImage }), {
    title: "Site title",
    openGraph: { title: "Site title", image: defaultImage },
    twitter: { title: "Site title", image: defaultImage }
  });
});

test("resolves Open Graph and Twitter fallbacks in order", () => {
  const image = { url: "https://example.com/social.jpg" };
  const resolved = resolveSeo({
    seo: {
      title: "SEO title",
      description: "SEO description",
      openGraph: { title: "Open Graph title", image },
      twitter: { description: "Twitter description" }
    }
  });

  assert.deepEqual(resolved.openGraph, {
    title: "Open Graph title",
    description: "SEO description",
    image
  });
  assert.deepEqual(resolved.twitter, {
    title: "Open Graph title",
    description: "Twitter description",
    image
  });
});

test("supports the legacy canonical field without changing input", () => {
  const input: ResolveSeoInput = {
    title: "Fallback title",
    summary: "Fallback summary",
    seo: {
      title: "",
      description: "",
      canonical: "https://example.com/legacy",
      structuredData: []
    }
  };
  const before = structuredClone(input);

  assert.deepEqual(resolveSeo(input), {
    title: "",
    description: "",
    canonicalUrl: "https://example.com/legacy",
    openGraph: { title: "", description: "" },
    twitter: { title: "", description: "" },
    structuredData: []
  });
  assert.deepEqual(input, before);
});

test("uses summary as description when excerpt is absent", () => {
  const resolved = resolveSeo(
    { summary: "Blog summary text" },
    { siteTitle: "Site title" }
  );

  assert.equal(resolved.description, "Blog summary text");
  assert.equal(resolved.openGraph?.description, "Blog summary text");
  assert.equal(resolved.twitter?.description, "Blog summary text");
});

test("omits all unavailable optional values", () => {
  assert.deepEqual(resolveSeo({}), {});
});
