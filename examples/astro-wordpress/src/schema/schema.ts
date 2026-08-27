import type { ModelSchema } from "@nexuscontent/core";

const ctaFields = {
  heading: { type: "string", required: true },
  intro: { type: "string", required: true },
  label: { type: "string", required: true },
  href: { type: "string", required: true }
} as const;

const heroFields = {
  eyebrow: { type: "string" },
  heading: { type: "string", required: true },
  intro: { type: "string", required: true },
  cta: {
    type: "object",
    fields: {
      label: { type: "string", required: true },
      href: { type: "string", required: true }
    }
  }
} as const;

/**
 * Model schemas for the WordPress reference consumer.
 *
 * WordPress ACF fields are flattened onto the top level of `data` by the
 * provider, so each model declares its expected ACF blocks directly. The
 * rendered `content`, `excerpt`, dates, and `featuredImage` sibling keys pass
 * through the schema untyped unless a model declares them.
 */
export const models = {
  home: {
    kind: "singleton",
    source: { provider: "wordpress", key: "home", mode: "page" },
    fields: {
      hero: { type: "object", required: true, fields: heroFields },
      services: {
        type: "object",
        required: true,
        fields: {
          heading: { type: "string", required: true },
          intro: { type: "string" },
          items: {
            type: "object",
            list: true,
            required: true,
            fields: {
              title: { type: "string", required: true },
              description: { type: "string", required: true }
            }
          }
        }
      },
      testimonials: {
        type: "object",
        required: true,
        fields: {
          heading: { type: "string", required: true },
          items: {
            type: "object",
            list: true,
            required: true,
            fields: {
              quote: { type: "string", required: true },
              author: { type: "string", required: true }
            }
          }
        }
      },
      cta: { type: "object", fields: ctaFields }
    }
  },
  about: {
    kind: "singleton",
    source: { provider: "wordpress", key: "about", mode: "page" },
    fields: {
      hero: { type: "object", required: true, fields: heroFields },
      mission: {
        type: "object",
        required: true,
        fields: {
          heading: { type: "string", required: true },
          content: { type: "string", required: true }
        }
      },
      story: {
        type: "object",
        required: true,
        fields: {
          heading: { type: "string", required: true },
          content: { type: "string", required: true }
        }
      },
      values: {
        type: "object",
        required: true,
        fields: {
          heading: { type: "string", required: true },
          items: { type: "string", list: true, required: true }
        }
      },
      cta: { type: "object", fields: ctaFields }
    }
  },
  services: {
    kind: "singleton",
    source: { provider: "wordpress", key: "services", mode: "page" },
    fields: {
      hero: { type: "object", required: true, fields: heroFields },
      services: {
        type: "object",
        required: true,
        fields: {
          heading: { type: "string", required: true },
          intro: { type: "string" },
          items: {
            type: "object",
            list: true,
            required: true,
            fields: {
              title: { type: "string", required: true },
              description: { type: "string", required: true },
              points: { type: "string", list: true }
            }
          }
        }
      },
      cta: { type: "object", fields: ctaFields }
    }
  },
  contact: {
    kind: "singleton",
    source: { provider: "wordpress", key: "contact", mode: "page" },
    fields: {
      hero: { type: "object", required: true, fields: heroFields },
      contact: {
        type: "object",
        required: true,
        fields: {
          heading: { type: "string", required: true },
          items: {
            type: "object",
            list: true,
            required: true,
            fields: {
              label: { type: "string", required: true },
              value: { type: "string", required: true },
              href: { type: "string" }
            }
          }
        }
      },
      cta: { type: "object", fields: ctaFields }
    }
  },
  blog: {
    kind: "collection",
    source: { provider: "wordpress", key: "posts" },
    fields: {
      content: { type: "string", required: true },
      excerpt: { type: "string" },
      publishedAt: { type: "datetime" },
      modifiedAt: { type: "datetime" },
      url: { type: "string" },
      featuredImage: { type: "media" }
    }
  }
} as const satisfies Record<string, ModelSchema>;
