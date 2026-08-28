export const WORDPRESS_ERROR_CODES = {
  CONFIG_INVALID_URL: "wordpress/config/invalid-url",
  CONFIG_MISSING_URL: "wordpress/config/missing-url",
  CONFIG_INVALID_TIMEOUT: "wordpress/config/invalid-timeout",
  CONFIG_INVALID_PAGINATION: "wordpress/config/invalid-pagination",
  CONFIG_INVALID_COLLECTION: "wordpress/config/invalid-collection",
  CONFIG_INVALID_EDITOR_MODE: "wordpress/config/invalid-editor-mode",
  CONFIG_INVALID_API_STRATEGY: "wordpress/config/invalid-api-strategy",
  CONFIG_INVALID_CONTENT_POLICY: "wordpress/config/invalid-content-policy",
  CONFIG_INVALID_MEDIA_RESOLUTION: "wordpress/config/invalid-media-resolution",
  CONFIG_INVALID_SECTION: "wordpress/config/invalid-section",
  HTTP_FAILURE: "wordpress/http/failure",
  HTTP_UNAUTHORIZED: "wordpress/http/unauthorized",
  HTTP_FORBIDDEN: "wordpress/http/forbidden",
  HTTP_NOT_FOUND: "wordpress/http/not-found",
  HTTP_RATE_LIMITED: "wordpress/http/rate-limited",
  HTTP_SERVER_ERROR: "wordpress/http/server-error",
  NETWORK_FAILURE: "wordpress/network/failure",
  NETWORK_TIMEOUT: "wordpress/network/timeout",
  JSON_PARSE_ERROR: "wordpress/json/parse-error",
  JSON_UNEXPECTED_PAYLOAD: "wordpress/json/unexpected-payload",
  PAGINATION_HEADER_MISSING: "wordpress/pagination/header-missing",
  PAGINATION_HEADER_INCONSISTENT: "wordpress/pagination/header-inconsistent",
  PAGINATION_EXCEEDS_MAX: "wordpress/pagination/exceeds-max",
  PAGINATION_SIZE_INCONSISTENT: "wordpress/pagination/size-inconsistent",
  SECTION_MISSING_SOURCE: "wordpress/section/missing-source",
  SECTION_INVALID_DATA: "wordpress/section/invalid-data",
  SECTION_UNKNOWN_TYPE: "wordpress/section/unknown-type",
  CONTENT_SLUG_NOT_FOUND: "wordpress/content/slug-not-found",
  CONTENT_AMBIGUOUS_SLUG: "wordpress/content/ambiguous-slug",
  CONTENT_INVALID_ENTRY: "wordpress/content/invalid-entry",
  CONTENT_UNKNOWN_COLLECTION: "wordpress/content/unknown-collection",
  MEDIA_FETCH_FAILED: "wordpress/media/fetch-failed",
  MEDIA_INVALID_RESPONSE: "wordpress/media/invalid-response",
  ACF_FIELD_ERROR: "wordpress/acf/field-error",
  UNSUPPORTED_EDITOR_MODE: "wordpress/editor/unsupported-mode",
  MALFORMED_BLOCK_CONTENT: "wordpress/block/malformed-content",
  UNKNOWN_BLOCK: "wordpress/block/unknown",
  UNKNOWN_ACF_BLOCK: "wordpress/acf/unknown-block",
  UNKNOWN_ACF_LAYOUT: "wordpress/acf/unknown-layout",
  INVALID_FIXED_SECTION: "wordpress/section/invalid-fixed",
  INVALID_SECTION: "wordpress/section/invalid",
  MEDIA_RESOLUTION_FAILED: "wordpress/media/resolution-failed",
  CONFLICTING_SECTION_SOURCES: "wordpress/section/conflicting-sources",
  INVALID_COMPANION_RESPONSE: "wordpress/companion/invalid-response",
  COMPANION_NOT_FOUND: "wordpress/companion/not-found",
  COMPANION_FORBIDDEN: "wordpress/companion/forbidden",
  COMPANION_MISSING: "wordpress/companion/missing",
  COMPANION_UNAVAILABLE: "wordpress/companion/unavailable",
  COMPANION_VERSION_MISMATCH: "wordpress/companion/version-mismatch",
  SECTION_SYNC_CONFLICT: "wordpress/section/sync-conflict",
  SECTION_SYNC_MISSING: "wordpress/section/sync-missing",
  COMPONENT_UNKNOWN: "wordpress/unknown-component"
} as const;

export type WordPressErrorCode =
  (typeof WORDPRESS_ERROR_CODES)[keyof typeof WORDPRESS_ERROR_CODES];

export function isWordPressErrorCode(value: string): value is WordPressErrorCode {
  return Object.values(WORDPRESS_ERROR_CODES).includes(
    value as WordPressErrorCode
  );
}
