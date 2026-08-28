import type { ComponentSchema, ModelSchema } from "@nexuscontent/core";

/**
 * Reusable component schemas.
 *
 * The 12 component names are exactly the canonical NexusContent section types
 * shared with the WordPress companion plugin (see integrations/
 * wordpress/nexuscontent/sections.json). Keeping the names identical means a
 * WordPress install that produces these sections renders the same site the
 * Git content repository does, and the consumer pushes the same 12 section
 * types to the plugin contract.
 *
 * `button` is intentionally absent: the canonical sections expose their own
 * action fields (primary_action_label/url, secondary_action_label/url,
 * action_label/url) rather than an explicit `button` component.
 */
export const components = {
  hero: {
    fields: {
      eyebrow: { type: "string" },
      heading: { type: "string", required: true },
      body: { type: "string" },
      image: { type: "media" },
      primary_action_label: { type: "string" },
      primary_action_url: { type: "string" },
      secondary_action_label: { type: "string" },
      secondary_action_url: { type: "string" }
    }
  },
  intro: {
    fields: {
      eyebrow: { type: "string" },
      heading: { type: "string", required: true },
      body: { type: "string" },
      image: { type: "media" },
      image_position: { type: "string" }
    }
  },
  rich_text: {
    fields: {
      heading: { type: "string" },
      body: { type: "richText", required: true }
    }
  },
  image_text: {
    fields: {
      eyebrow: { type: "string" },
      heading: { type: "string", required: true },
      body: { type: "richText" },
      image: { type: "media" },
      image_position: { type: "string" },
      action_label: { type: "string" },
      action_url: { type: "string" }
    }
  },
  features: {
    fields: {
      eyebrow: { type: "string" },
      heading: { type: "string", required: true },
      body: { type: "string" },
      items: {
        type: "object",
        list: true,
        fields: {
          title: { type: "string", required: true },
          description: { type: "string" },
          points: { type: "string", list: true },
          thumbnail: { type: "media" }
        }
      }
    }
  },
  statistics: {
    fields: {
      eyebrow: { type: "string" },
      heading: { type: "string", required: true },
      items: {
        type: "object",
        list: true,
        fields: {
          value: { type: "string", required: true },
          label: { type: "string", required: true }
        }
      }
    }
  },
  testimonials: {
    fields: {
      eyebrow: { type: "string" },
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
  gallery: {
    fields: {
      eyebrow: { type: "string" },
      heading: { type: "string", required: true },
      images: { type: "media", list: true, required: true }
    }
  },
  cta: {
    fields: {
      heading: { type: "string", required: true },
      body: { type: "string" },
      primary_action_label: { type: "string", required: true },
      primary_action_url: { type: "string", required: true },
      secondary_action_label: { type: "string" },
      secondary_action_url: { type: "string" },
      background_image: { type: "media" }
    }
  },
  faq: {
    fields: {
      eyebrow: { type: "string" },
      heading: { type: "string", required: true },
      body: { type: "string" },
      items: {
        type: "object",
        list: true,
        fields: {
          question: { type: "string", required: true },
          answer: { type: "string", required: true }
        }
      }
    }
  },
  logo_grid: {
    fields: {
      eyebrow: { type: "string" },
      heading: { type: "string", required: true },
      items: {
        type: "object",
        list: true,
        fields: {
          name: { type: "string", required: true },
          image: { type: "media" }
        }
      }
    }
  },
  form_embed: {
    fields: {
      heading: { type: "string" },
      provider: { type: "string" },
      form_id: { type: "string" },
      embed_code: { type: "richText" }
    }
  }
} as const satisfies Record<string, ComponentSchema>;

/**
 * Model schemas for the dual-provider reference consumer.
 *
 * Every model points at the **Git** provider by default so the repository
 * ships a deterministic, buildable site (`source.provider: "git"`). To use
 * WordPress for a model, change only `source.provider` to `"wordpress"`; the
 * field shapes, pages, and components stay identical. The same content can be
 * served by either provider without touching website code.
 *
 * To keep a model on WordPress, the WordPress provider options in
 * `src/nexus.config` need an editor mode the install can actually produce
 * sections from (e.g. `acf_flexible` for the plugin's flexible layouts, or
 * `gutenberg`). Fixed-field (`acf_fixed`) pages flatten their ACF groups as
 * named fields instead and need no section extraction.
 */
export const models = {
  home: {
    kind: "singleton",
    source: { provider: "git", key: "home", mode: "page" },
    fields: {
      hero: { type: "component", component: "hero", required: true },
      intro: { type: "component", component: "intro" },
      features: { type: "component", component: "features" },
      gallery: { type: "component", component: "gallery" },
      testimonials: { type: "component", component: "testimonials" },
      cta: { type: "component", component: "cta" }
    }
  },
  about: {
    kind: "singleton",
    source: { provider: "git", key: "about", mode: "page" },
    fields: {
      hero: { type: "component", component: "hero", required: true },
      rich_text: { type: "component", component: "rich_text" },
      image_text: { type: "component", component: "image_text" },
      statistics: { type: "component", component: "statistics" }
    }
  },
  services: {
    kind: "singleton",
    source: { provider: "git", key: "services", mode: "page" },
    fields: {
      hero: { type: "component", component: "hero", required: true },
      features: { type: "component", component: "features" },
      faq: { type: "component", component: "faq" },
      cta: { type: "component", component: "cta" }
    }
  },
  contact: {
    kind: "singleton",
    source: { provider: "git", key: "contact", mode: "page" },
    fields: {
      image_text: { type: "component", component: "image_text" },
      logo_grid: { type: "component", component: "logo_grid" },
      form_embed: { type: "component", component: "form_embed" }
    }
  },
  blog: {
    kind: "collection",
    source: { provider: "wordpress", key: "posts" },
    fields: {
      content: { type: "richText" },
      excerpt: { type: "string" },
      publishedAt: { type: "datetime" },
      modifiedAt: { type: "datetime" },
      url: { type: "string" },
      featuredImage: { type: "media" },
      // Post bodies are CMS-ordered sections, rendered through PostSections.
      // The shape matches the canonical wire shape providers emit
      // (`{ type, data }`), so the same sections array serves both the Git
      // content files and WordPress flexible/Gutenberg posts.
      sections: {
        type: "object",
        list: true,
        fields: {
          type: { type: "string", required: true },
          data: { type: "object" }
        }
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