import type { ComponentSchema, ModelSchema } from "@nexuscontent/core";

/**
 * Reusable component schemas. `hero.cta` references `button` by name, so a
 * component field resolves through another component's fields.
 */
export const components = {
  hero: {
    fields: {
      heading: { type: "string", required: true },
      intro: { type: "string" },
      image: { type: "media", required: true },
      cta: { type: "component", component: "button" }
    }
  },
  button: {
    fields: {
      label: { type: "string", required: true },
      href: { type: "string", required: true },
      variant: { type: "string" }
    }
  },
  servicesList: {
    fields: {
      heading: { type: "string", required: true },
      intro: { type: "string" },
      items: {
        type: "object",
        list: true,
        fields: {
          title: { type: "string", required: true },
          description: { type: "string", required: true },
          icon: { type: "media" }
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
        fields: {
          quote: { type: "string", required: true },
          author: { type: "string", required: true },
          avatar: { type: "media" }
        }
      }
    }
  },
  richTextContent: {
    fields: {
      heading: { type: "string" },
      content: { type: "richText", required: true }
    }
  },
  imageGallery: {
    fields: {
      heading: { type: "string" },
      images: { type: "media", list: true, required: true }
    }
  },
  codeSnippet: {
    fields: {
      language: { type: "string", required: true },
      code: { type: "string", required: true },
      caption: { type: "string" }
    }
  }
} as const satisfies Record<string, ComponentSchema>;

/**
 * Model schemas for the single-locale reference consumer.
 *
 * `title`, `slug`, and `seo` live on the content envelope (Git normalize
 * keeps them there), so only `data` fields are declared here. Pages with a
 * known structure declare named component fields so components compose
 * directly; the blog post body stays a `blocks` list because a post's
 * sections vary.
 */
export const models = {
  home: {
    kind: "singleton",
    source: { provider: "git", key: "home" },
    fields: {
      hero: { type: "component", component: "hero", required: true },
      servicesList: { type: "component", component: "servicesList" },
      testimonialsList: { type: "component", component: "testimonialsList" },
      richTextContent: { type: "component", component: "richTextContent" }
    }
  },
  about: {
    kind: "singleton",
    source: { provider: "git", key: "about" },
    fields: {
      hero: { type: "component", component: "hero", required: true },
      mission: { type: "component", component: "richTextContent" },
      story: { type: "component", component: "richTextContent" },
      principles: { type: "component", component: "richTextContent" }
    }
  },
  services: {
    kind: "singleton",
    source: { provider: "git", key: "services" },
    fields: {
      hero: { type: "component", component: "hero", required: true },
      servicesList: { type: "component", component: "servicesList" },
      richTextContent: { type: "component", component: "richTextContent" }
    }
  },
  contact: {
    kind: "singleton",
    source: { provider: "git", key: "contact" },
    fields: {
      hero: { type: "component", component: "hero", required: true },
      introduction: { type: "component", component: "richTextContent" }
    }
  },
  blog: {
    kind: "collection",
    source: { provider: "git", key: "posts" },
    fields: {
      date: { type: "datetime" },
      excerpt: { type: "string" },
      body: {
        type: "blocks",
        list: true,
        allowedComponents: ["richTextContent", "imageGallery", "codeSnippet"]
      }
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
      },
      contactDetails: {
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
      }
    }
  }
} as const satisfies Record<string, ModelSchema>;

export const schema = {
  models,
  components
};