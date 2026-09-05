import type { ComponentSchema, FieldSchema, ModelSchema } from "@nexuscontent/core";

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
 * `button` is exposed as a reusable `buttons` list on hero, image_text, and
 * cta: each button is `{ label, url, variant? }`, so an editor adds as many
 * buttons as they see fit instead of dealing with fixed primary/secondary
 * action pairs.
 */
export const buttons = {
  type: "object",
  list: true,
  fields: {
    label: { type: "string", required: true },
    url: { type: "string", required: true },
    variant: { type: "string" }
  }
} satisfies FieldSchema;

export const components = {
  hero: {
    fields: {
      eyebrow: { type: "string" },
      heading: { type: "string", required: true },
      body: { type: "string" },
      image: { type: "media" },
      buttons
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
      buttons
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
      buttons,
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
 * Page models point at either provider (`home` and `services` at WordPress,
 * `about` and `contact` at Git) so the same content can be served by either
 * source with no website-code changes. Page models declare **no `fields`**:
 * NexusContent projects every provider's ordered sections onto
 * `page.sections` (a named map keyed by section type your templates compose
 * against) plus `page.sectionsList` (the authoritative order), so a model
 * never needs to enumerate the sections a page uses. Git authoring mirrors
 * the map (`content/pages/about.json` → `sections: { hero, ... }`), and
 * WordPress emits the same consumer map.
 *
 * Collection models (`blog`) keep their items at `data.sections`, the ordered
 * `{ type, data }` list rendered through `PostSections`. Navigation and
 * settings models are declared with their flat field schemas.
 */
export const models = {
  home: {
    kind: "singleton",
    source: { provider: "wordpress", key: "home" }
  },
  about: {
    kind: "singleton",
    source: { provider: "git", key: "about" }
  },
  services: {
    kind: "singleton",
    source: { provider: "wordpress", key: "services" }
  },
  contact: {
    kind: "singleton",
    source: { provider: "git", key: "contact" }
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