import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  validatePageContent,
  validateCollectionItem,
  validateSettingsContent,
  validateNavigationContent
} from "../../src/validation/index.ts";
import type {
  ContentSection,
  PageContent,
  SectionSettings,
  PageStatus
} from "../../src/index.ts";
import {
  NexusContentError,
  ProviderError,
  ValidationError
} from "../../src/index.ts";
import {
  BUILTIN_SECTION_TYPES,
  COMPANION_CONTRACT_VERSION,
  COMPANION_WIRE_ENDPOINTS,
  COMPANION_WIRE_NAMESPACE,
  DEFAULT_WORDPRESS_ACF_ENABLED,
  DEFAULT_WORDPRESS_API_STRATEGY,
  DEFAULT_WORDPRESS_EDITOR_MODE,
  DEFAULT_WORDPRESS_MEDIA_RESOLUTION,
  DEFAULT_WORDPRESS_UNKNOWN_CONTENT_POLICY,
  FIXED_SECTION_TYPES,
  RESERVED_COMPANION_PREFIXES,
  WORDPRESS_ERROR_CODES,
  buildSectionRegistry,
  buildCompanionContractVersion,
  isFixedSectionType,
  isWordPressErrorCode,
  isValidApiStrategy,
  isValidEditorMode,
  isValidCompanionContractVersion,
  isValidMediaResolution,
  isValidUnknownContentPolicy,
  lookupSectionSourceAlias,
  mergeSectionRegistry,
  companionCapabilitiesResponseSchema,
  companionPageResponseSchema,
  companionPagesResponseSchema,
  companionSchemaResponseSchema,
  paginationSchema
} from "../../src/index.ts";
import type {
  WordPressErrorCode,
  WordPressFixedSectionConfig,
  WordPressPageResponse,
  WordPressPagesResponse,
  WordPressSchemaResponse,
  WordPressCapabilitiesResponse,
  SectionDefinition
} from "../../src/index.ts";

function readJsonFixture(name: string): unknown {
  const filePath = path.resolve(
    import.meta.dirname ?? __dirname,
    "fixtures",
    name
  );
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

const validCanonicalPage: PageContent = {
  id: "1",
  key: "home",
  slug: "home",
  title: "Home",
  status: "published",
  excerpt: "Welcome to our site",
  modifiedAt: "2026-08-18T10:00:00Z",
  sections: [
    {
      type: "hero",
      settings: { visible: true },
      data: { heading: "Welcome", subheading: "Hello world" }
    },
    {
      type: "features",
      data: { items: [{ title: "Feature 1" }] }
    }
  ],
  seo: {
    title: "Home",
    description: "The homepage"
  },
  data: {
    content: "<p>Home content</p>",
    hero: { heading: "Welcome" }
  },
  meta: {
    source: "wordpress",
    sourceId: "1",
    updatedAt: "2026-08-18T10:00:00Z"
  }
};

const minimalCanonicalPage: PageContent = {
  id: "2",
  key: "about",
  data: {},
  meta: { source: "wordpress", sourceId: "2" }
};

// ─── Core Section Contracts ──────────────────────────────────────

test("accepts valid canonical page with sections, status, and excerpt", () => {
  assert.doesNotThrow(() => validatePageContent(validCanonicalPage));
});

test("accepts minimal canonical page without optional fields", () => {
  assert.doesNotThrow(() => validatePageContent(minimalCanonicalPage));
});

test("rejects invalid page status values", () => {
  const invalidStatuses = ["draftt", "publishd", "active", "live"];
  for (const status of invalidStatuses) {
    const page = { ...validCanonicalPage, status } as unknown as PageContent;
    assert.throws(
      () => validatePageContent(page),
      (error: unknown) => {
        assert.ok(error instanceof ValidationError);
        assert.ok(error.issues.some((issue) => issue.path === "status"));
        return true;
      }
    );
  }
});

test("accepts all valid page statuses", () => {
  const statuses: PageStatus[] = ["draft", "published", "archived"];
  for (const status of statuses) {
    const page = { ...validCanonicalPage, status };
    assert.doesNotThrow(() => validatePageContent(page));
  }
});

test("rejects sections with non-string type", () => {
  const page = {
    ...validCanonicalPage,
    sections: [{ type: 42, data: {} }]
  } as unknown as PageContent;
  assert.throws(
    () => validatePageContent(page),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "sections.0.type"));
      return true;
    }
  );
});

test("rejects sections with missing data", () => {
  const page = {
    ...validCanonicalPage,
    sections: [{ type: "hero" }]
  } as unknown as PageContent;
  assert.throws(
    () => validatePageContent(page),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "sections.0.data"));
      return true;
    }
  );
});

test("accepts section settings with arbitrary JSON-compatible values", () => {
  const settings: SectionSettings = {
    visible: true,
    background: "#fff",
    containerClass: "narrow",
    customNumber: 42,
    customString: "hello"
  };
  const section: ContentSection = {
    type: "hero",
    settings,
    data: { heading: "Hi" }
  };
  const page = { ...validCanonicalPage, sections: [section] };
  assert.doesNotThrow(() => validatePageContent(page));
});

test("rejects non-JSON section settings", () => {
  const page = {
    ...validCanonicalPage,
    sections: [
      {
        type: "hero",
        settings: { invalid: () => "not JSON" },
        data: {}
      }
    ]
  } as unknown as PageContent;
  assert.throws(() => validatePageContent(page), ValidationError);
});

test("accepts empty sections array", () => {
  const page = { ...validCanonicalPage, sections: [] };
  assert.doesNotThrow(() => validatePageContent(page));
});

test("accepts featured image on page", () => {
  const page = {
    ...validCanonicalPage,
    featuredImage: {
      url: "https://example.com/hero.jpg",
      alt: "Hero image",
      caption: "A hero image",
      mimeType: "image/jpeg",
      width: 1920,
      height: 1080,
      sizes: {
        thumbnail: {
          url: "https://example.com/hero-thumbnail.jpg",
          width: 300,
          height: 169
        }
      }
    }
  };
  assert.doesNotThrow(() => validatePageContent(page));
});

test("rejects featured image with non-string url", () => {
  const page = {
    ...validCanonicalPage,
    featuredImage: { url: 42 }
  } as unknown as PageContent;
  assert.throws(
    () => validatePageContent(page),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(
        error.issues.some((issue) => issue.path === "featuredImage.url")
      );
      return true;
    }
  );
});

test("page schema loads valid canonical fixture file", () => {
  const fixture = readJsonFixture("canonical-page.json") as PageContent;
  assert.doesNotThrow(() => validatePageContent(fixture));
  assert.equal(fixture.status, "published");
  assert.equal(fixture.sections?.length, 2);
});

test("page schema loads minimal canonical fixture file", () => {
  const fixture = readJsonFixture("canonical-page-minimal.json") as PageContent;
  assert.doesNotThrow(() => validatePageContent(fixture));
  assert.equal(fixture.status, undefined);
  assert.equal(fixture.sections, undefined);
});

test("page schema rejects invalid status in fixture file", () => {
  const fixture = readJsonFixture("invalid-page-status.json") as PageContent;
  assert.throws(
    () => validatePageContent(fixture),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      return true;
    }
  );
});

// ─── WordPress Config Enums ──────────────────────────────────────

test("editor mode enum covers expected values", () => {
  assert.ok(isValidEditorMode("gutenberg"));
  assert.ok(isValidEditorMode("acf_flexible"));
  assert.ok(isValidEditorMode("acf_fixed"));
  assert.ok(!isValidEditorMode("blocks"));
  assert.ok(!isValidEditorMode("unknown"));
  assert.ok(!isValidEditorMode(""));
  assert.ok(!isValidEditorMode("Visual"));
});

test("API strategy enum covers expected values", () => {
  assert.ok(isValidApiStrategy("auto"));
  assert.ok(isValidApiStrategy("companion"));
  assert.ok(isValidApiStrategy("core"));
  assert.ok(!isValidApiStrategy("graphql"));
  assert.ok(!isValidApiStrategy(""));
});

test("unknown content policy enum covers expected values", () => {
  assert.ok(isValidUnknownContentPolicy("error"));
  assert.ok(isValidUnknownContentPolicy("ignore"));
  assert.ok(isValidUnknownContentPolicy("html"));
  assert.ok(!isValidUnknownContentPolicy("skip"));
  assert.ok(!isValidUnknownContentPolicy(""));
});

test("media resolution enum covers expected values", () => {
  assert.ok(isValidMediaResolution("none"));
  assert.ok(isValidMediaResolution("embedded"));
  assert.ok(isValidMediaResolution("full"));
  assert.ok(!isValidMediaResolution("lazy"));
  assert.ok(!isValidMediaResolution(""));
});

test("default config values are defined", () => {
  assert.equal(DEFAULT_WORDPRESS_EDITOR_MODE, "gutenberg");
  assert.equal(DEFAULT_WORDPRESS_API_STRATEGY, "auto");
  assert.equal(DEFAULT_WORDPRESS_UNKNOWN_CONTENT_POLICY, "error");
  assert.equal(DEFAULT_WORDPRESS_MEDIA_RESOLUTION, "full");
  assert.equal(DEFAULT_WORDPRESS_ACF_ENABLED, true);
});

// ─── Fixed Section Types ─────────────────────────────────────────

test("section type constants distinguish built-in and fixed canonical types", () => {
  assert.equal(BUILTIN_SECTION_TYPES.length, 12);
  const expected = [
    "hero", "intro", "rich_text", "image_text", "features", "statistics",
    "testimonials", "gallery", "cta", "faq", "logo_grid", "form_embed"
  ];
  assert.deepEqual([...BUILTIN_SECTION_TYPES], expected);
  assert.deepEqual([...FIXED_SECTION_TYPES], ["hero", "intro", "cta"]);
});

test("isFixedSectionType recognizes all built-in types", () => {
  for (const sectionType of FIXED_SECTION_TYPES) {
    assert.ok(isFixedSectionType(sectionType), `expected ${sectionType} to be fixed`);
  }
  assert.ok(!isFixedSectionType("custom-widget"));
  assert.ok(!isFixedSectionType(""));
});

// ─── Section Registry ────────────────────────────────────────────

test("buildSectionRegistry creates registry with all built-in sections", () => {
  const registry = buildSectionRegistry();
  assert.equal(registry.size, 12);
  for (const sectionType of BUILTIN_SECTION_TYPES) {
    assert.ok(registry.has(sectionType), `expected registry to contain ${sectionType}`);
  }
});

test("buildSectionRegistry applies fixed section overrides", () => {
  const fixedOverrides: Partial<Record<string, WordPressFixedSectionConfig>> = {
    hero: { visible: false, background: "#000" },
    intro: { visible: true, containerClass: "wide" }
  };
  const registry = buildSectionRegistry({ fixedSections: fixedOverrides });
  const hero = registry.get("hero");
  assert.ok(hero?.fixed);
  assert.equal(hero?.fixed.visible, false);
  assert.equal(hero?.fixed.background, "#000");
  const intro = registry.get("intro");
  assert.ok(intro?.fixed);
  assert.equal(intro?.fixed.containerClass, "wide");
  assert.equal(registry.get("features")?.fixed, undefined);
});

test("buildSectionRegistry adds custom sections", () => {
  const custom: SectionDefinition = {
    type: "custom-banner",
    sourceType: "banner",
    sourceKey: "banner_acf",
    dataSchema: {
      fields: [{ name: "text", type: "string", required: true }]
    }
  };
  const registry = buildSectionRegistry({ customSections: [custom] });
  assert.ok(registry.has("custom-banner"));
  assert.equal(registry.size, 13);
  const entry = registry.get("custom-banner");
  assert.equal(entry?.definition.sourceKey, "banner_acf");
});

test("mergeSectionRegistry overlays custom on built-in", () => {
  const base = buildSectionRegistry();
  const override: SectionDefinition = {
    type: "hero",
    sourceType: "hero_acf",
    dataSchema: { fields: [] }
  };
  const overrideRegistry = new Map([["hero", { definition: override }]]);
  const merged = mergeSectionRegistry(base, overrideRegistry);
  const hero = merged.get("hero");
  assert.equal(hero?.definition.sourceType, "hero_acf");
  assert.equal(merged.size, 12);
});

test("lookupSectionSourceAlias resolves ACF key to section type", () => {
  const registry = buildSectionRegistry();
  assert.equal(lookupSectionSourceAlias("nexuscontent/hero", registry), "hero");
  assert.equal(lookupSectionSourceAlias("acf/hero", registry), "hero");
  assert.equal(lookupSectionSourceAlias("hero", registry), "hero");
  assert.equal(lookupSectionSourceAlias("acf/features", registry), "features");
  assert.equal(lookupSectionSourceAlias("nonexistent", registry), undefined);
});

// ─── Provider Capabilities ───────────────────────────────────────

test("WordPressProvider exposes capabilities() method", async () => {
  const { WordPressProvider } = await import("../../src/providers/wordpress/provider.ts");
  const provider = new WordPressProvider({
    baseUrl: "https://example.com/wp-json/wp/v2",
    name: "test-capabilities"
  });
  const caps = provider.capabilities();
  assert.equal(caps.editorMode, "gutenberg");
  assert.equal(caps.gutenberg, true);
  assert.equal(caps.acfFlexible, false);
  assert.equal(caps.acfFixed, false);
  assert.equal(caps.acfFields, true);
  assert.equal(caps.mediaLibrary, true);
  assert.equal(caps.localeAware, false);
  assert.equal(caps.previewSupport, false);
  assert.equal(caps.webhookSupport, false);
});

test("WordPressProvider reflects ACF editor mode in capabilities", async () => {
  const { WordPressProvider } = await import("../../src/providers/wordpress/provider.ts");
  const flexibleProvider = new WordPressProvider({
    baseUrl: "https://example.com/wp-json/wp/v2",
    name: "test-flexible",
    editorMode: "acf_flexible"
  });
  const caps = flexibleProvider.capabilities();
  assert.equal(caps.acfFlexible, true);
  assert.equal(caps.gutenberg, false);
});

test("WordPressProvider exposes new Phase 1 config options", async () => {
  const { WordPressProvider } = await import("../../src/providers/wordpress/provider.ts");
  const provider = new WordPressProvider({
    baseUrl: "https://example.com/wp-json/wp/v2",
    name: "test-phase1",
    editorMode: "acf_fixed",
    apiStrategy: "companion",
    unknownContentPolicy: "ignore",
    mediaResolution: "embedded",
    acf: { enabled: false, fieldPrefix: "acf_" }
  });
  assert.equal(provider.editorMode, "acf_fixed");
  assert.equal(provider.apiStrategy, "companion");
  assert.equal(provider.unknownContentPolicy, "ignore");
  assert.equal(provider.mediaResolution, "embedded");
  assert.equal(provider.acfEnabled, false);
});

// ─── Companion Wire Contract JSON Validation ─────────────────────

test("companion page response JSON has correct contract version", () => {
  const fixture = readJsonFixture("companion-page.json") as WordPressPageResponse;
  assert.equal(fixture.contractVersion, COMPANION_CONTRACT_VERSION);
  assert.ok(isValidCompanionContractVersion(fixture.contractVersion));
  assert.ok(Array.isArray(fixture.data.sections));
  assert.ok(Array.isArray(fixture.diagnostics));
  assert.ok(typeof fixture.data.rawFields === "object");
  assert.equal(fixture.data.featuredImage?.sizes?.thumbnail?.width, 300);
});

test("companion pages response JSON has correct structure", () => {
  const fixture = readJsonFixture("companion-pages.json") as WordPressPagesResponse;
  assert.equal(fixture.contractVersion, COMPANION_CONTRACT_VERSION);
  assert.ok(Array.isArray(fixture.data.items));
  assert.equal(fixture.data.items.length, 2);
  assert.ok(typeof fixture.data.pagination === "object");
  assert.equal(fixture.data.pagination.total, 2);
  assert.equal(fixture.data.pagination.totalPages, 1);
});

test("companion schema response JSON has correct structure", () => {
  const fixture = readJsonFixture("companion-schema.json") as WordPressSchemaResponse;
  assert.equal(fixture.contractVersion, COMPANION_CONTRACT_VERSION);
  assert.deepEqual(fixture.data.editorModes, [
    "gutenberg",
    "acf_flexible",
    "acf_fixed"
  ]);
  assert.ok(Array.isArray(fixture.data.sectionDefinitions));
  assert.equal(fixture.data.sourceMappings["nexuscontent/hero"], "hero");
  assert.equal(fixture.data.sourceMappings["acf/hero"], "hero");
  assert.equal(fixture.data.sourceMappings.hero, "hero");
});

test("companion capabilities response JSON has exact capability data", () => {
  const fixture = readJsonFixture("companion-capabilities.json") as WordPressCapabilitiesResponse;
  assert.equal(fixture.contractVersion, COMPANION_CONTRACT_VERSION);
  assert.equal(fixture.data.pluginVersion, "0.1.0");
  assert.equal(fixture.data.wordpressVersion, "6.8.2");
  assert.equal(fixture.data.gutenberg, true);
  assert.equal(fixture.data.acfPro, true);
  assert.deepEqual(fixture.data.sectionTypes, [...BUILTIN_SECTION_TYPES]);
});

test("companion page with diagnostics has correct shape", () => {
  const fixture = readJsonFixture("companion-page-with-diagnostics.json") as WordPressPageResponse;
  assert.equal(fixture.contractVersion, COMPANION_CONTRACT_VERSION);
  assert.equal(fixture.diagnostics?.length, 1);
  assert.equal(fixture.diagnostics?.[0]?.code, "wordpress/block/unknown");
  assert.equal(fixture.diagnostics?.[0]?.severity, "warning");
});

test("companion contract version is exactly 1", () => {
  assert.equal(COMPANION_CONTRACT_VERSION, 1);
  assert.equal(buildCompanionContractVersion(), 1);
});

test("companion wire endpoints are reserved paths", () => {
  assert.deepEqual([...COMPANION_WIRE_ENDPOINTS], [
    "pages",
    "pages/{id}",
    "pages/slug/{slug}",
    "schema",
    "capabilities"
  ]);
  assert.equal(COMPANION_WIRE_ENDPOINTS.length, 5);
});

test("companion wire namespace is defined", () => {
  assert.equal(COMPANION_WIRE_NAMESPACE, "nexuscontent/v1");
});

test("reserved companion prefixes include nc- and nexus-", () => {
  assert.ok(RESERVED_COMPANION_PREFIXES.includes("nc-"));
  assert.ok(RESERVED_COMPANION_PREFIXES.includes("nexus-"));
});

test("invalid companion version is rejected", () => {
  assert.ok(!isValidCompanionContractVersion(null));
  assert.ok(!isValidCompanionContractVersion(undefined));
  assert.ok(!isValidCompanionContractVersion("1"));
  assert.ok(!isValidCompanionContractVersion(2));
  assert.ok(!isValidCompanionContractVersion(99));
  assert.ok(isValidCompanionContractVersion(1));
});

// ─── Zod Wire Contract Validation ─────────────────────────────────

test("companion page response Zod schema validates valid fixture", () => {
  const fixture = readJsonFixture("companion-page.json");
  const result = companionPageResponseSchema.safeParse(fixture);
  assert.ok(result.success, `expected success, got: ${JSON.stringify(result.error?.issues)}`);
});

test("companion pages response Zod schema validates valid fixture", () => {
  const fixture = readJsonFixture("companion-pages.json");
  const result = companionPagesResponseSchema.safeParse(fixture);
  assert.ok(result.success, `expected success, got: ${JSON.stringify(result.error?.issues)}`);
});

test("companion schema response Zod schema validates valid fixture", () => {
  const fixture = readJsonFixture("companion-schema.json");
  const result = companionSchemaResponseSchema.safeParse(fixture);
  assert.ok(result.success, `expected success, got: ${JSON.stringify(result.error?.issues)}`);
});

test("companion capabilities response Zod schema validates valid fixture", () => {
  const fixture = readJsonFixture("companion-capabilities.json");
  const result = companionCapabilitiesResponseSchema.safeParse(fixture);
  assert.ok(result.success, `expected success, got: ${JSON.stringify(result.error?.issues)}`);
});

test("companion page with diagnostics Zod schema validates valid fixture", () => {
  const fixture = readJsonFixture("companion-page-with-diagnostics.json");
  const result = companionPageResponseSchema.safeParse(fixture);
  assert.ok(result.success, `expected success, got: ${JSON.stringify(result.error?.issues)}`);
});

test("Zod schema rejects page response with wrong contract version", () => {
  const fixture = readJsonFixture("invalid-companion-version.json");
  const result = companionPageResponseSchema.safeParse(fixture);
  assert.ok(!result.success);
});

test("Zod schema rejects an envelope with missing data", () => {
  const fixture = readJsonFixture("invalid-companion-envelope.json");
  const result = companionPageResponseSchema.safeParse(fixture);
  assert.ok(!result.success);
});

test("Zod schema rejects a page envelope with missing data", () => {
  const result = companionPageResponseSchema.safeParse({
    contractVersion: 1,
    diagnostics: []
  });
  assert.ok(!result.success);
});

test("Zod schema rejects companion sections without stable IDs", () => {
  const fixture = readJsonFixture("companion-page.json") as {
    data: { sections: Array<Record<string, unknown>> };
  };
  const section = { ...fixture.data.sections[0] };
  delete section.id;
  const result = companionPageResponseSchema.safeParse({
    ...fixture,
    data: { ...fixture.data, sections: [section] }
  });
  assert.ok(!result.success);
});

test("Zod schema rejects capabilities with an invalid editor mode", () => {
  const result = companionCapabilitiesResponseSchema.safeParse({
    contractVersion: 1,
    data: {
      pluginVersion: "0.1.0",
      wordpressVersion: "6.8.2",
      gutenberg: true,
      acf: false,
      acfPro: false,
      acfBlocks: false,
      flexibleContent: false,
      editorModes: ["blocks"],
      sectionTypes: ["hero"]
    }
  });
  assert.ok(!result.success);
});

test("pagination schema rejects unsafe, fractional, and out-of-range values", () => {
  assert.ok(!paginationSchema.safeParse({ total: Number.MAX_SAFE_INTEGER + 1, totalPages: 1, page: 1, perPage: 10 }).success);
  assert.ok(!paginationSchema.safeParse({ total: 2, totalPages: 1, page: 1.5, perPage: 10 }).success);
  assert.ok(!paginationSchema.safeParse({ total: 20, totalPages: 2, page: 3, perPage: 10 }).success);
  assert.ok(paginationSchema.safeParse({ total: 0, totalPages: 0, page: 1, perPage: 10 }).success);
});

// ─── WordPress Provider Config Validation ──────────────────────────

test("WordPressProvider rejects invalid editorMode", async () => {
  const { WordPressProvider } = await import("../../src/providers/wordpress/provider.ts");
  assert.throws(
    () => new WordPressProvider({
      baseUrl: "https://example.com/wp-json/wp/v2",
      editorMode: "invalid" as never
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.ok(error.format().includes("editorMode"));
      return true;
    }
  );
});

test("WordPressProvider rejects invalid apiStrategy", async () => {
  const { WordPressProvider } = await import("../../src/providers/wordpress/provider.ts");
  assert.throws(
    () => new WordPressProvider({
      baseUrl: "https://example.com/wp-json/wp/v2",
      apiStrategy: "graphql" as never
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.ok(error.format().includes("apiStrategy"));
      return true;
    }
  );
});

test("WordPressProvider rejects invalid unknownContentPolicy", async () => {
  const { WordPressProvider } = await import("../../src/providers/wordpress/provider.ts");
  assert.throws(
    () => new WordPressProvider({
      baseUrl: "https://example.com/wp-json/wp/v2",
      unknownContentPolicy: "skip" as never
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.ok(error.format().includes("unknownContentPolicy"));
      return true;
    }
  );
});

test("WordPressProvider rejects invalid mediaResolution", async () => {
  const { WordPressProvider } = await import("../../src/providers/wordpress/provider.ts");
  assert.throws(
    () => new WordPressProvider({
      baseUrl: "https://example.com/wp-json/wp/v2",
      mediaResolution: "lazy" as never
    }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.ok(error.format().includes("mediaResolution"));
      return true;
    }
  );
});

// ─── Source Fixtures ─────────────────────────────────────────────

test("source ACF section fixture has expected structure", () => {
  const fixture = readJsonFixture("source-acf-section.json") as Record<string, unknown>;
  assert.equal(fixture.blockName, "nexuscontent/hero");
  assert.equal(fixture.acfBlock, "acf/hero");
  assert.equal(fixture.acfLayout, "hero");
  assert.equal(fixture.label, "Hero Section");
  assert.ok(typeof fixture.fields === "object");
});

// ─── Error Contracts ─────────────────────────────────────────────

test("WordPress error codes are unique and well-formed", () => {
  const codes = Object.values(WORDPRESS_ERROR_CODES);
  const unique = new Set(codes);
  assert.equal(codes.length, unique.size, "error codes must be unique");
  for (const code of codes) {
    assert.ok(code.startsWith("wordpress/"), `error code must start with wordpress/: ${code}`);
    assert.ok(code.includes("/"), `error code must have at least one slash: ${code}`);
  }
});

test("isWordPressErrorCode recognizes all defined codes", () => {
  for (const code of Object.values(WORDPRESS_ERROR_CODES)) {
    assert.ok(isWordPressErrorCode(code), `expected ${code} to be valid`);
  }
  assert.ok(!isWordPressErrorCode("random/error"));
  assert.ok(!isWordPressErrorCode(""));
});

test("WordPress error vocabulary covers Phase 2 normalization failures", () => {
  const requiredCodes = [
    WORDPRESS_ERROR_CODES.UNSUPPORTED_EDITOR_MODE,
    WORDPRESS_ERROR_CODES.MALFORMED_BLOCK_CONTENT,
    WORDPRESS_ERROR_CODES.UNKNOWN_BLOCK,
    WORDPRESS_ERROR_CODES.UNKNOWN_ACF_BLOCK,
    WORDPRESS_ERROR_CODES.UNKNOWN_ACF_LAYOUT,
    WORDPRESS_ERROR_CODES.INVALID_FIXED_SECTION,
    WORDPRESS_ERROR_CODES.INVALID_SECTION,
    WORDPRESS_ERROR_CODES.MEDIA_RESOLUTION_FAILED,
    WORDPRESS_ERROR_CODES.CONFLICTING_SECTION_SOURCES,
    WORDPRESS_ERROR_CODES.INVALID_COMPANION_RESPONSE
  ];
  assert.equal(new Set(requiredCodes).size, 10);
  requiredCodes.forEach((code) => assert.ok(isWordPressErrorCode(code)));
});

test("WordPressErrorCode type is assignable from WORDPRESS_ERROR_CODES values", () => {
  const code: WordPressErrorCode = WORDPRESS_ERROR_CODES.HTTP_FAILURE;
  assert.equal(code, "wordpress/http/failure");
});

test("core error details support generic code field", () => {
  const error = new NexusContentError("test", {
    provider: "test",
    operation: "test",
    code: "custom/error/code"
  });
  assert.equal(error.code, "custom/error/code");
  assert.ok(error.format().includes("Code: custom/error/code"));
});

test("core error format includes code when present", () => {
  const error = new ProviderError("failed", {
    provider: "wordpress",
    operation: "getPage",
    content: "home",
    code: WORDPRESS_ERROR_CODES.HTTP_FAILURE,
    reason: "HTTP 500"
  });
  const formatted = error.format();
  assert.ok(formatted.includes(`Code: ${WORDPRESS_ERROR_CODES.HTTP_FAILURE}`));
  assert.ok(formatted.includes("Provider: wordpress"));
  assert.ok(formatted.includes("Reason: HTTP 500"));
});

test("core error format omits code when absent", () => {
  const error = new ProviderError("failed", {
    provider: "wordpress",
    reason: "something"
  });
  const formatted = error.format();
  assert.ok(!formatted.includes("Code:"));
});

// ─── Public Exports ──────────────────────────────────────────────

test("all new types and values are exported from the package root", async () => {
  const mod = await import("../../src/index.ts");
  const expectedExports = [
    "FIXED_SECTION_TYPES",
    "BUILTIN_SECTION_TYPES",
    "COMPANION_CONTRACT_VERSION",
    "COMPANION_WIRE_ENDPOINTS",
    "COMPANION_WIRE_NAMESPACE",
    "RESERVED_COMPANION_PREFIXES",
    "WORDPRESS_ERROR_CODES",
    "buildSectionRegistry",
    "mergeSectionRegistry",
    "lookupSectionSourceAlias",
    "buildCompanionContractVersion",
    "isValidCompanionContractVersion",
    "isFixedSectionType",
    "isValidEditorMode",
    "isValidApiStrategy",
    "isValidUnknownContentPolicy",
    "isValidMediaResolution",
    "isWordPressErrorCode",
    "DEFAULT_WORDPRESS_EDITOR_MODE",
    "DEFAULT_WORDPRESS_API_STRATEGY",
    "DEFAULT_WORDPRESS_UNKNOWN_CONTENT_POLICY",
    "DEFAULT_WORDPRESS_MEDIA_RESOLUTION",
    "DEFAULT_WORDPRESS_ACF_ENABLED",
    "companionCapabilitiesResponseSchema",
    "companionEnvelopeSchema"
  ];
  for (const name of expectedExports) {
    assert.ok(
      name in mod,
      `expected export "${name}" to exist at package root`
    );
  }
});

test("new schemas are exported from validation index", async () => {
  const mod = await import("../../src/validation/index.ts");
  assert.ok("contentSectionSchema" in mod);
  assert.ok("sectionSettingsSchema" in mod);
  assert.ok("pageStatusSchema" in mod);
});

test("WordPress config enums and section utilities are exported from WordPress index", async () => {
  const mod = await import("../../src/providers/wordpress/index.ts");
  assert.ok("WordPressProvider" in mod);
  assert.ok("FIXED_SECTION_TYPES" in mod);
  assert.ok("buildSectionRegistry" in mod);
  assert.ok("WORDPRESS_ERROR_CODES" in mod);
  assert.ok("isWordPressErrorCode" in mod);
  assert.ok("buildCompanionContractVersion" in mod);
  assert.ok("companionPageResponseSchema" in mod);
  assert.ok("companionPagesResponseSchema" in mod);
  assert.ok("companionSchemaResponseSchema" in mod);
  assert.ok("companionCapabilitiesResponseSchema" in mod);
  assert.ok("companionEnvelopeSchema" in mod);
});
