import type { ComponentSchema, ModelSchema } from "@nexuscontent/core";

export const components = {
  hero: {
    fields: {
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
    }
  },
  cta: {
    fields: {
      heading: { type: "string", required: true },
      intro: { type: "string", required: true },
      label: { type: "string", required: true },
      href: { type: "string", required: true }
    }
  },
  servicesList: {
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
  testimonialsList: {
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
  }
} as const satisfies Record<string, ComponentSchema>;

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
      hero: { type: "component", component: "hero" },
      services: { type: "component", component: "servicesList" },
      testimonials: { type: "component", component: "testimonialsList" },
      cta: { type: "component", component: "cta" },
      contentBlocks: {
        type: "blocks",
        list: true,
        allowedComponents: ["hero", "servicesList", "testimonialsList", "cta"]
      }
    }
  },
  about: {
    kind: "singleton",
    source: { provider: "wordpress", key: "about", mode: "page" },
    fields: {
      hero: { type: "component", component: "hero" },
      mission: {
        type: "object",
        fields: {
          heading: { type: "string", required: true },
          content: { type: "string", required: true }
        }
      },
      story: {
        type: "object",
        fields: {
          heading: { type: "string", required: true },
          content: { type: "string", required: true }
        }
      },
      values: {
        type: "object",
        fields: {
          heading: { type: "string", required: true },
          items: { type: "string", list: true, required: true }
        }
      },
      cta: { type: "component", component: "cta" }
    }
  },
  services: {
    kind: "singleton",
    source: { provider: "wordpress", key: "services", mode: "page" },
    fields: {
      hero: { type: "component", component: "hero" },
      services: { type: "component", component: "servicesList" },
      cta: { type: "component", component: "cta" }
    }
  },
  contact: {
    kind: "singleton",
    source: { provider: "wordpress", key: "contact", mode: "page" },
    fields: {
      hero: { type: "component", component: "hero" },
      contact: {
        type: "object",
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
      cta: { type: "component", component: "cta" }
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

export const schema = {
  models,
  components
};
