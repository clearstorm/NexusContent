export type WordPressEditorMode = "visual" | "code" | "blocks";

export type WordPressApiStrategy = "rest-v2" | "rest-v1" | "application-password";

export type WordPressUnknownContentPolicy = "ignore" | "throw";

export type WordPressMediaResolution = "embed" | "fetch" | "off";

export interface WordPressAcfConfig {
  enabled: boolean;
  fieldPrefix?: string;
}

export interface WordPressFixedSectionConfig {
  visible: boolean;
  background?: string;
  containerClass?: string;
}

export const DEFAULT_WORDPRESS_EDITOR_MODE: WordPressEditorMode = "blocks";
export const DEFAULT_WORDPRESS_API_STRATEGY: WordPressApiStrategy = "rest-v2";
export const DEFAULT_WORDPRESS_UNKNOWN_CONTENT_POLICY: WordPressUnknownContentPolicy = "ignore";
export const DEFAULT_WORDPRESS_MEDIA_RESOLUTION: WordPressMediaResolution = "embed";
export const DEFAULT_WORDPRESS_ACF_ENABLED = true;

export const FIXED_SECTION_TYPES = [
  "content/header",
  "content/footer",
  "content/sidebar",
  "content/breadcrumb",
  "content/hero",
  "content/cta",
  "content/features",
  "content/testimonials",
  "content/pricing",
  "content/faq",
  "content/team",
  "content/gallery",
  "content/newsletter"
] as const;

export type FixedSectionType = (typeof FIXED_SECTION_TYPES)[number];

export const BUILTIN_SECTION_TYPES: readonly FixedSectionType[] = FIXED_SECTION_TYPES;

export const RESERVED_COMPANION_PREFIXES = ["nc-", "nexus-"] as const;

export const COMPANION_CONTRACT_VERSION = 1;

export const COMPANION_WIRE_NAMESPACE = "companion";
export const COMPANION_WIRE_ENDPOINTS = [
  "companion/page",
  "companion/pages",
  "companion/schema",
  "companion/sections",
  "companion/health"
] as const;

export function isFixedSectionType(value: string): value is FixedSectionType {
  return (FIXED_SECTION_TYPES as readonly string[]).includes(value);
}

export function isValidEditorMode(value: string): value is WordPressEditorMode {
  return value === "visual" || value === "code" || value === "blocks";
}

export function isValidApiStrategy(value: string): value is WordPressApiStrategy {
  return (
    value === "rest-v2" ||
    value === "rest-v1" ||
    value === "application-password"
  );
}

export function isValidUnknownContentPolicy(
  value: string
): value is WordPressUnknownContentPolicy {
  return value === "ignore" || value === "throw";
}

export function isValidMediaResolution(
  value: string
): value is WordPressMediaResolution {
  return value === "embed" || value === "fetch" || value === "off";
}
