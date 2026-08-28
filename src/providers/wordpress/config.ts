export type WordPressEditorMode = "gutenberg" | "acf_flexible" | "acf_fixed";

export type WordPressApiStrategy = "auto" | "companion" | "core";

export type WordPressUnknownContentPolicy = "error" | "ignore" | "html";

export type WordPressMediaResolution = "none" | "embedded" | "full";

export interface WordPressAcfConfig {
  enabled: boolean;
  fieldPrefix?: string;
}

export interface WordPressFixedSectionConfig {
  visible: boolean;
  background?: string;
  containerClass?: string;
}

export const DEFAULT_WORDPRESS_EDITOR_MODE: WordPressEditorMode = "gutenberg";
export const DEFAULT_WORDPRESS_API_STRATEGY: WordPressApiStrategy = "auto";
export const DEFAULT_WORDPRESS_UNKNOWN_CONTENT_POLICY: WordPressUnknownContentPolicy = "error";
export const DEFAULT_WORDPRESS_MEDIA_RESOLUTION: WordPressMediaResolution = "full";
export const DEFAULT_WORDPRESS_ACF_ENABLED = true;

import { FIXED_SECTION_TYPES } from "./sections.generated.ts";

export { FIXED_SECTION_TYPES };

export type FixedSectionType = (typeof FIXED_SECTION_TYPES)[number];

export const BUILTIN_SECTION_TYPES = [
  "hero",
  "intro",
  "rich_text",
  "image_text",
  "features",
  "statistics",
  "testimonials",
  "gallery",
  "cta",
  "faq",
  "logo_grid",
  "form_embed"
] as const;

export type BuiltinSectionType = (typeof BUILTIN_SECTION_TYPES)[number];

export const RESERVED_COMPANION_PREFIXES = ["nc-", "nexus-"] as const;

export const COMPANION_CONTRACT_VERSION = 1;

export const COMPANION_WIRE_NAMESPACE = "nexuscontent/v1";
export const COMPANION_WIRE_ENDPOINTS = [
  "pages",
  "pages/{id}",
  "pages/slug/{slug}",
  "schema",
  "capabilities"
] as const;

export function isFixedSectionType(value: string): value is FixedSectionType {
  return (FIXED_SECTION_TYPES as readonly string[]).includes(value);
}

export function isValidEditorMode(value: string): value is WordPressEditorMode {
  return value === "gutenberg" || value === "acf_flexible" || value === "acf_fixed";
}

export function isValidApiStrategy(value: string): value is WordPressApiStrategy {
  return value === "auto" || value === "companion" || value === "core";
}

export function isValidUnknownContentPolicy(
  value: string
): value is WordPressUnknownContentPolicy {
  return value === "error" || value === "ignore" || value === "html";
}

export function isValidMediaResolution(
  value: string
): value is WordPressMediaResolution {
  return value === "none" || value === "embedded" || value === "full";
}
