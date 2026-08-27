import type { ModelSchema } from "@nexuscontent/core";

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

const ctaFields = {
  heading: { type: "string", required: true },
  intro: { type: "string", required: true },
  label: { type: "string", required: true },
  href: { type: "string", required: true }
} as const;

export const models = {
  home: {
    kind: "singleton",
    source: { provider: "git", key: "home", mode: "page" },
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
      cta: { type: "object", required: true, fields: ctaFields }
    }
  },
  about: {
    kind: "singleton",
    source: { provider: "git", key: "about", mode: "page" },
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
      cta: { type: "object", required: true, fields: ctaFields }
    }
  },
  services: {
    kind: "singleton",
    source: { provider: "git", key: "services", mode: "page" },
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
              points: { type: "string", list: true, required: true }
            }
          }
        }
      },
      cta: { type: "object", required: true, fields: ctaFields }
    }
  },
  contact: {
    kind: "singleton",
    source: { provider: "git", key: "contact", mode: "page" },
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
      cta: { type: "object", required: true, fields: ctaFields }
    }
  },
  blog: {
    kind: "collection",
    source: { provider: "git", key: "posts" },
    fields: {
      date: { type: "datetime" },
      excerpt: { type: "richText" },
      body: { type: "richText" }
    }
  },
  primary: {
    kind: "navigation",
    source: { provider: "git", key: "primary" }
  },
  site: {
    kind: "settings",
    source: { provider: "git", key: "site" },
    fields: {
      siteName: { type: "string" },
      tagline: { type: "string" },
      footer: {
        type: "object",
        fields: {
          description: { type: "string" },
          credit: { type: "string" }
        }
      }
    }
  }
} as const satisfies Record<string, ModelSchema>;
