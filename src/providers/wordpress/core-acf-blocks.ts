import type { ContentSection, JsonValue } from "../../core/types.ts";
import type { BuiltinSectionType, WordPressFixedSectionConfig } from "./config.ts";
import { FIXED_SECTION_TYPES } from "./config.ts";
import { normalizeAcfImageToMediaAsset } from "./core-media.ts";

function normalizeButtons(value: unknown): JsonValue {
  if (!Array.isArray(value)) return value as JsonValue;
  return value.map((button) => {
    if (typeof button !== "object" || button === null) return button as JsonValue;
    const b = button as Record<string, unknown>;
    const out: Record<string, JsonValue> = {};
    if (typeof b.label !== "undefined") out.label = b.label as JsonValue;
    if (typeof b.url !== "undefined") out.url = b.url as JsonValue;
    if (typeof b.variant !== "undefined") out.variant = b.variant as JsonValue;
    return out;
  }) as unknown as JsonValue;
}

/**
 * Extract ACF fields from a WordPress REST response's `acf` property.
 * Maps ACF field groups to canonical section types.
 */
export function extractAcfFields(
  acfData: Record<string, unknown>,
  options: {
    fieldPrefix?: string;
    fixedSections?: Partial<Record<string, WordPressFixedSectionConfig>>;
  } = {}
): ContentSection[] {
  if (!acfData || typeof acfData !== "object") return [];

  const sections: ContentSection[] = [];
  const prefix = options.fieldPrefix ?? "";

  // Check for ACF Flexible Content layouts
  for (const [key, value] of Object.entries(acfData)) {
    const cleanKey = prefix ? key.replace(new RegExp(`^${prefix}_?`), "") : key;

    // ACF Flexible Content fields contain layout arrays
    if (Array.isArray(value) && value.length > 0 && isAcfLayoutArray(value)) {
      const layoutSections = extractAcfFlexibleContent(value, options);
      sections.push(...layoutSections);
      continue;
    }

    // ACF group fields
    if (isAcfGroup(value)) {
      const groupSections = extractAcfGroup(value as Record<string, unknown>, cleanKey, options);
      sections.push(...groupSections);
      continue;
    }
  }

  return sections;
}

/**
 * Check if an array looks like an ACF Flexible Content layout array.
 */
function isAcfLayoutArray(value: unknown[]): boolean {
  if (value.length === 0) return false;
  const first = value[0];
  if (!first || typeof first !== "object") return false;
  const obj = first as Record<string, unknown>;
  return "acf_fc_layout" in obj || "layout" in obj;
}

/**
 * Extract sections from ACF Flexible Content layouts.
 */
function extractAcfFlexibleContent(
  layouts: Array<Record<string, unknown>>,
  options: {
    fieldPrefix?: string;
    fixedSections?: Partial<Record<string, WordPressFixedSectionConfig>>;
  } = {}
): ContentSection[] {
  const sections: ContentSection[] = [];

  for (let i = 0; i < layouts.length; i++) {
    const layout = layouts[i];
    if (!layout) continue;
    const layoutType = typeof layout.acf_fc_layout === "string"
      ? layout.acf_fc_layout
      : typeof layout.layout === "string"
        ? layout.layout
        : null;

    if (!layoutType) continue;

    const sectionType = mapAcfLayoutToSectionType(layoutType);
    if (sectionType === null) continue;

    const data = extractAcfLayoutData(layout, sectionType);
    sections.push({
      id: `acf-layout-${i}`,
      type: sectionType,
      data
    });
  }

  return sections;
}

/**
 * Map an ACF layout name to a canonical section type.
 */
function mapAcfLayoutToSectionType(layoutName: string): BuiltinSectionType | null {
  const normalized = layoutName.toLowerCase().replace(/[_-]/g, "_");

  // Direct mapping for known layout names
  const layoutMap: Record<string, BuiltinSectionType> = {
    hero: "hero",
    introduction: "intro",
    intro: "intro",
    rich_text: "rich_text",
    richtext: "rich_text",
    rich_text_block: "rich_text",
    image_text: "image_text",
    imagetext: "image_text",
    image_and_text: "image_text",
    features: "features",
    feature_list: "features",
    statistics: "statistics",
    stats: "statistics",
    testimonials: "testimonials",
    testimonial: "testimonials",
    gallery: "gallery",
    image_gallery: "gallery",
    cta: "cta",
    call_to_action: "cta",
    calltoaction: "cta",
    faq: "faq",
    faqs: "faq",
    logo_grid: "logo_grid",
    logogrid: "logo_grid",
    logo_grid_block: "logo_grid",
    form_embed: "form_embed",
    formembed: "form_embed",
    form: "form_embed",
    embed: "form_embed"
  };

  return layoutMap[normalized] ?? null;
}

/**
 * Extract data from an ACF Flexible Content layout.
 */
function extractAcfLayoutData(
  layout: Record<string, unknown>,
  sectionType: BuiltinSectionType
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  switch (sectionType) {
    case "hero":
      data.heading = layout.heading ?? layout.title ?? layout.hero_heading;
      data.body = layout.body ?? layout.description ?? layout.hero_description;
      data.eyebrow = layout.eyebrow;
      data.image = normalizeAcfImageToMediaAsset(layout.image ?? layout.hero_image);
      data.buttons = normalizeButtons(
        layout.buttons ??
          (layout.primary_action_label || layout.button_label
            ? [
                {
                  label:
                    layout.primary_action_label ?? layout.button_label,
                  url: layout.primary_action_url ?? layout.button_url,
                  variant: "primary"
                }
              ]
            : [])
      );
      data.theme = layout.theme;
      break;

    case "intro":
      data.heading = layout.heading ?? layout.title;
      data.body = layout.body ?? layout.description;
      data.eyebrow = layout.eyebrow;
      data.image = normalizeAcfImageToMediaAsset(layout.image);
      data.image_position = layout.image_position;
      data.theme = layout.theme;
      break;

    case "rich_text":
      data.heading = layout.heading ?? layout.title;
      data.body = layout.body ?? layout.content ?? layout.text;
      data.theme = layout.theme;
      break;

    case "image_text":
      data.heading = layout.heading ?? layout.title;
      data.body = layout.body ?? layout.description;
      data.eyebrow = layout.eyebrow;
      data.image = normalizeAcfImageToMediaAsset(layout.image);
      data.image_position = layout.image_position;
      data.buttons = normalizeButtons(
        layout.buttons ??
          (layout.action_label || layout.button_label
            ? [
                {
                  label: layout.action_label ?? layout.button_label,
                  url: layout.action_url ?? layout.button_url,
                  variant: "primary"
                }
              ]
            : [])
      );
      data.theme = layout.theme;
      break;

    case "features":
      data.heading = layout.heading ?? layout.title;
      data.body = layout.body ?? layout.description;
      data.eyebrow = layout.eyebrow;
      data.items = layout.items ?? layout.features;
      data.theme = layout.theme;
      break;

    case "statistics":
      data.heading = layout.heading ?? layout.title;
      data.eyebrow = layout.eyebrow;
      data.items = layout.items ?? layout.stats;
      data.theme = layout.theme;
      break;

    case "testimonials":
      data.heading = layout.heading ?? layout.title;
      data.eyebrow = layout.eyebrow;
      data.items = layout.items ?? layout.testimonials;
      data.theme = layout.theme;
      break;

    case "gallery":
      data.heading = layout.heading ?? layout.title;
      data.eyebrow = layout.eyebrow;
      data.images = layout.images ?? layout.gallery;
      data.theme = layout.theme;
      break;

    case "cta":
      data.heading = layout.heading ?? layout.title;
      data.body = layout.body ?? layout.description;
      data.buttons = normalizeButtons(
        layout.buttons ??
          (layout.primary_action_label || layout.button_label
            ? [
                {
                  label:
                    layout.primary_action_label ?? layout.button_label,
                  url: layout.primary_action_url ?? layout.button_url,
                  variant: "primary"
                }
              ]
            : [])
      );
      data.background_image = normalizeAcfImageToMediaAsset(layout.background_image);
      data.theme = layout.theme;
      break;

    case "faq":
      data.heading = layout.heading ?? layout.title;
      data.eyebrow = layout.eyebrow;
      data.items = layout.items ?? layout.faqs;
      data.theme = layout.theme;
      break;

    case "logo_grid":
      data.heading = layout.heading ?? layout.title;
      data.eyebrow = layout.eyebrow;
      data.items = layout.items ?? layout.logos;
      data.theme = layout.theme;
      break;

    case "form_embed":
      data.heading = layout.heading ?? layout.title;
      data.provider = layout.provider;
      data.form_id = layout.form_id;
      data.embed_code = layout.embed_code ?? layout.embed;
      data.theme = layout.theme;
      break;
  }

  // Clean up undefined values
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      delete data[key];
    }
  }

  return normalizeSectionMediaFields(data);
}

/**
 * Recursively normalize media values inside section data. ACF image objects
 * (`url` plus `id`/`ID`/`sizes`/`width`/`height`) become MediaAsset entries so
 * gallery arrays, repeatable item lists, and nested groups never leak the raw
 * `url`-shaped WordPress image structure past the provider boundary.
 */
function normalizeSectionMediaFields(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = normalizeMediaValue(value);
  }
  return out;
}

function normalizeMediaValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeMediaValue(item));
  }
  if (!isPlainObjectValue(value)) {
    return value;
  }

  const asset = normalizeAcfImageToMediaAsset(value);
  if (asset !== undefined) {
    return asset;
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    out[key] = normalizeMediaValue(nested);
  }
  return out;
}

function isPlainObjectValue(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Check if a value is an ACF group (object with known ACF keys).
 */
function isAcfGroup(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  // ACF groups typically have multiple nested fields
  const keys = Object.keys(obj);
  return keys.length > 0 && keys.every((key) => typeof key === "string");
}

/**
 * Extract sections from an ACF group field.
 */
function extractAcfGroup(
  group: Record<string, unknown>,
  groupName: string,
  options: {
    fieldPrefix?: string;
    fixedSections?: Partial<Record<string, WordPressFixedSectionConfig>>;
  } = {}
): ContentSection[] {
  const sections: ContentSection[] = [];

  // Check if the group name maps to a section type
  const sectionType = mapAcfLayoutToSectionType(groupName);
  if (sectionType) {
    sections.push({
      id: `acf-group-${groupName}`,
      type: sectionType,
      data: normalizeSectionMediaFields(group)
    });
    return sections;
  }

  // Recursively extract from nested groups
  for (const [key, value] of Object.entries(group)) {
    if (isAcfGroup(value)) {
      const nestedSections = extractAcfGroup(
        value as Record<string, unknown>,
        `${groupName}_${key}`,
        options
      );
      sections.push(...nestedSections);
    }
  }

  return sections;
}

/**
 * Extract ACF fixed fields (hero, intro, cta) from a WordPress page.
 * These are typically stored as separate ACF field groups.
 */
export function extractAcfFixedFields(
  acfData: Record<string, unknown>,
  options: {
    fieldPrefix?: string;
    fixedSections?: Partial<Record<string, WordPressFixedSectionConfig>>;
  } = {}
): ContentSection[] {
  if (!acfData || typeof acfData !== "object") return [];

  const sections: ContentSection[] = [];
  const prefix = options.fieldPrefix ?? "";

  for (const sectionType of FIXED_SECTION_TYPES) {
    const sectionConfig = options.fixedSections?.[sectionType];
    if (sectionConfig && !sectionConfig.visible) continue;

    const sectionData = extractFixedSectionData(acfData, sectionType, prefix);
    if (sectionData) {
      sections.push({
        id: `fixed-${sectionType}`,
        type: sectionType,
        settings: sectionConfig ? {
          visible: sectionConfig.visible,
          background: sectionConfig.background,
          containerClass: sectionConfig.containerClass
        } : undefined,
        data: sectionData
      });
    }
  }

  return sections;
}

/**
 * Extract data for a fixed section type from ACF data.
 */
function extractFixedSectionData(
  acfData: Record<string, unknown>,
  sectionType: string,
  prefix: string
): Record<string, unknown> | null {
  const prefixPattern = prefix ? new RegExp(`^${prefix}_?`) : null;

  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(acfData)) {
    const cleanKey = prefixPattern ? key.replace(prefixPattern, "") : key;

    // Match section-specific fields
    if (cleanKey.startsWith(`${sectionType}_`) || cleanKey === sectionType) {
      const fieldName = cleanKey.replace(`${sectionType}_`, "");
      if (fieldName && value !== undefined && value !== null) {
        data[fieldName] = value;
      }
    }
  }

  return Object.keys(data).length > 0 ? data : null;
}

/**
 * Convert ACF block data to ContentSection array.
 * ACF blocks are Gutenberg blocks with an `acf` property.
 */
export function extractAcfBlocks(
  acfData: Record<string, unknown>,
  options: {
    fieldPrefix?: string;
    fixedSections?: Partial<Record<string, WordPressFixedSectionConfig>>;
  } = {}
): ContentSection[] {
  const sections: ContentSection[] = [];

  // Check for ACF blocks in the page data
  const acfBlockData = acfData["acf"];
  if (acfBlockData && typeof acfBlockData === "object" && !Array.isArray(acfBlockData)) {
    const blockSections = extractAcfFields(
      acfBlockData as Record<string, unknown>,
      options
    );
    sections.push(...blockSections);
  }

  // Also check for flexible content layouts directly on the ACF data
  const flexibleSections = extractAcfFields(acfData, options);
  sections.push(...flexibleSections);

  return sections;
}
