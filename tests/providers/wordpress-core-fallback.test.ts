import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseGutenbergBlocks,
  parseGutenbergToSections
} from "../../src/providers/wordpress/core-gutenberg.ts";
import {
  extractAcfFields,
  extractAcfFixedFields,
  extractAcfBlocks
} from "../../src/providers/wordpress/core-acf-blocks.ts";
import {
  normalizeAcfImageToMediaAsset,
  normalizeFeaturedMedia
} from "../../src/providers/wordpress/core-media.ts";
import {
  generateDeterministicSectionId,
  resolveSectionIds,
  ensureUniqueSectionIds
} from "../../src/providers/wordpress/core-section-ids.ts";
import {
  normalizeWordPressItem,
  normalizeWordPressPage
} from "../../src/providers/wordpress/normalize.ts";

// ─── Gutenberg block parsing ───────────────────────────────────────

test("parseGutenbergBlocks parses a paragraph block", () => {
  const html = `<!-- wp:core/paragraph -->
<p>Hello world</p>
<!-- /wp:core/paragraph -->`;

  const blocks = parseGutenbergBlocks(html);
  assert.equal(blocks.length, 1);
  const b = blocks[0]!;
  assert.equal(b.blockName, "core/paragraph");
  assert.equal(b.innerHTML, "\n<p>Hello world</p>\n");
});

test("parseGutenbergBlocks parses a heading block with attributes", () => {
  const html = `<!-- wp:core/heading {"level":2} -->
<h2>My Heading</h2>
<!-- /wp:core/heading -->`;

  const blocks = parseGutenbergBlocks(html);
  assert.equal(blocks.length, 1);
  const b = blocks[0]!;
  assert.equal(b.blockName, "core/heading");
  assert.equal(b.attributes.level, 2);
});

test("parseGutenbergBlocks parses multiple blocks", () => {
  const html = `<!-- wp:core/paragraph -->
<p>First</p>
<!-- /wp:core/paragraph -->
<!-- wp:core/heading {"level":2} -->
<h2>Second</h2>
<!-- /wp:core/heading -->
<!-- wp:core/paragraph -->
<p>Third</p>
<!-- /wp:core/paragraph -->`;

  const blocks = parseGutenbergBlocks(html);
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0]!.blockName, "core/paragraph");
  assert.equal(blocks[1]!.blockName, "core/heading");
  assert.equal(blocks[2]!.blockName, "core/paragraph");
});

test("parseGutenbergBlocks handles nested blocks", () => {
  const html = `<!-- wp:core/group -->
<div class="wp-block-group">
<!-- wp:core/paragraph -->
<p>Inside group</p>
<!-- /wp:core/paragraph -->
</div>
<!-- /wp:core/group -->`;

  const blocks = parseGutenbergBlocks(html);
  assert.equal(blocks.length, 1);
  const b = blocks[0]!;
  assert.equal(b.blockName, "core/group");
  assert.equal(b.innerBlocks.length, 1);
  assert.equal(b.innerBlocks[0]!.blockName, "core/paragraph");
});

test("parseGutenbergBlocks handles empty input", () => {
  const blocks = parseGutenbergBlocks("");
  assert.equal(blocks.length, 0);
});

test("parseGutenbergBlocks handles invalid JSON attributes gracefully", () => {
  const html = `<!-- wp:core/paragraph {invalid json} -->
<p>Content</p>
<!-- /wp:core/paragraph -->`;

  const blocks = parseGutenbergBlocks(html);
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0]!.attributes, {});
});

// ─── Gutenberg to sections mapping ─────────────────────────────────

test("parseGutenbergToSections maps paragraph to rich_text", () => {
  const html = `<!-- wp:core/paragraph -->
<p>Hello world</p>
<!-- /wp:core/paragraph -->`;

  const sections = parseGutenbergToSections(html);
  assert.equal(sections.length, 1);
  const s = sections[0]!;
  assert.equal(s.type, "rich_text");
  assert.equal(s.data.body, "Hello world");
});

test("parseGutenbergToSections maps heading to rich_text", () => {
  const html = `<!-- wp:core/heading {"level":2} -->
<h2>My Heading</h2>
<!-- /wp:core/heading -->`;

  const sections = parseGutenbergToSections(html);
  assert.equal(sections.length, 1);
  const s = sections[0]!;
  assert.equal(s.type, "rich_text");
  assert.equal(s.data.heading, "My Heading");
});

test("parseGutenbergToSections maps image to image_text", () => {
  const html = `<!-- wp:core/image {"id":123,"url":"https://example.com/image.jpg"} -->
<figure class="wp-block-image"><img src="https://example.com/image.jpg" alt="Test" class="wp-image-123"/></figure>
<!-- /wp:core/image -->`;

  const sections = parseGutenbergToSections(html);
  assert.equal(sections.length, 1);
  const s = sections[0]!;
  assert.equal(s.type, "image_text");
  assert.ok(s.data.image);
});

test("parseGutenbergToSections maps gallery to gallery", () => {
  const html = `<!-- wp:core/gallery -->
<figure class="wp-block-gallery">
<img src="https://example.com/img1.jpg" alt="One"/>
<img src="https://example.com/img2.jpg" alt="Two"/>
</figure>
<!-- /wp:core/gallery -->`;

  const sections = parseGutenbergToSections(html);
  assert.equal(sections.length, 1);
  const s = sections[0]!;
  assert.equal(s.type, "gallery");
  assert.ok(Array.isArray(s.data.images));
  assert.equal((s.data.images as unknown[]).length, 2);
});

test("parseGutenbergToSections maps button to cta", () => {
  const html = `<!-- wp:core/buttons -->
<div class="wp-block-buttons">
<!-- wp:core/button -->
<div class="wp-block-button"><a class="wp-block-button__link" href="https://example.com">Click me</a></div>
<!-- /wp:core/button -->
</div>
<!-- /wp:core/buttons -->`;

  const sections = parseGutenbergToSections(html);
  assert.equal(sections.length, 1);
  assert.equal(sections[0]!.type, "cta");
});

test("parseGutenbergToSections skips spacers and separators", () => {
  const html = `<!-- wp:core/paragraph -->
<p>Before</p>
<!-- /wp:core/paragraph -->
<!-- wp:core/spacer {"height":50} -->
<div style="height:50px" aria-hidden="true" class="wp-block-spacer"></div>
<!-- /wp:core/spacer -->
<!-- wp:core/separator -->
<hr class="wp-block-separator"/>
<!-- /wp:core/separator -->
<!-- wp:core/paragraph -->
<p>After</p>
<!-- /wp:core/paragraph -->`;

  const sections = parseGutenbergToSections(html);
  assert.equal(sections.length, 2);
  assert.equal(sections[0]!.type, "rich_text");
  assert.equal(sections[1]!.type, "rich_text");
});

test("parseGutenbergToSections applies onUnknown callback for unknown blocks", () => {
  const html = `<!-- wp:my-custom-block -->
<div>Custom content</div>
<!-- /wp:my-custom-block -->`;

  let unknownBlock = "";
  const sections = parseGutenbergToSections(html, {
    onUnknown: (blockName) => {
      unknownBlock = blockName;
      return "skip";
    }
  });
  assert.equal(sections.length, 0);
  assert.equal(unknownBlock, "my-custom-block");
});

test("parseGutenbergToSections creates raw section for html policy", () => {
  const html = `<!-- wp:my-custom-block -->
<div>Custom content</div>
<!-- /wp:my-custom-block -->`;

  const sections = parseGutenbergToSections(html, {
    onUnknown: () => "raw"
  });
  assert.equal(sections.length, 1);
  const s = sections[0]!;
  assert.equal(s.type, "rich_text");
  assert.ok(s.data.html);
});

test("parseGutenbergToSections generates deterministic section IDs", () => {
  const html = `<!-- wp:core/paragraph -->
<p>First</p>
<!-- /wp:core/paragraph -->
<!-- wp:core/paragraph -->
<p>Second</p>
<!-- /wp:core/paragraph -->`;

  const sections = parseGutenbergToSections(html);
  assert.equal(sections[0]!.id, "rich_text-0");
  assert.equal(sections[1]!.id, "rich_text-1");
});

// ─── ACF fields extraction ─────────────────────────────────────────

test("extractAcfFields extracts flexible content layouts", () => {
  const acfData = {
    content_layouts: [
      {
        acf_fc_layout: "hero",
        heading: "Welcome",
        body: "To our site"
      },
      {
        acf_fc_layout: "features",
        heading: "Our Features",
        items: [{ title: "Feature 1" }]
      }
    ]
  };

  const sections = extractAcfFields(acfData);
  assert.equal(sections.length, 2);
  assert.equal(sections[0]!.type, "hero");
  assert.equal(sections[1]!.type, "features");
});

test("extractAcfFields handles nested groups", () => {
  const acfData = {
    hero: {
      heading: "Hero Title",
      body: "Hero body"
    }
  };

  const sections = extractAcfFields(acfData);
  assert.ok(sections.length > 0);
  assert.equal(sections[0]!.type, "hero");
});

test("extractAcfFixedFields extracts fixed section data", () => {
  const acfData = {
    hero_heading: "Welcome",
    hero_body: "To our site",
    hero_image: { url: "https://example.com/hero.jpg" },
    cta_heading: "Get Started",
    cta_button_label: "Sign Up",
    cta_button_url: "/signup"
  };

  const sections = extractAcfFixedFields(acfData);
  assert.ok(sections.length > 0);

  const hero = sections.find((s) => s.type === "hero");
  assert.ok(hero);
  assert.equal(hero.data.heading, "Welcome");

  const cta = sections.find((s) => s.type === "cta");
  assert.ok(cta);
  assert.equal(cta.data.heading, "Get Started");
});

test("extractAcfFixedFields respects visibility config", () => {
  const acfData = {
    hero_heading: "Welcome",
    hero_body: "To our site"
  };

  const sections = extractAcfFixedFields(acfData, {
    fixedSections: {
      hero: { visible: false }
    }
  });

  const hero = sections.find((s) => s.type === "hero");
  assert.equal(hero, undefined);
});

test("extractAcfBlocks extracts ACF data from page", () => {
  const acfData = {
    acf: {
      content_layouts: [
        {
          acf_fc_layout: "hero",
          heading: "Welcome"
        }
      ]
    }
  };

  const sections = extractAcfBlocks(acfData);
  assert.ok(sections.length > 0);
  assert.equal(sections[0]!.type, "hero");
});

// ─── Media normalization ───────────────────────────────────────────

test("normalizeWordPressPage emits data.sections from Gutenberg content", () => {
  const raw = {
    id: 7,
    slug: "hello-world",
    status: "publish",
    title: { rendered: "Hello" },
    content: {
      rendered: `<!-- wp:core/image {"id":123,"url":"https://example.com/block.jpg"} -->
<figure class="wp-block-image"><img src="https://example.com/block.jpg" alt="Block" class="wp-image-123"/></figure>
<!-- /wp:core/image -->`
    },
    date_gmt: "2026-08-01T00:00:00",
    modified_gmt: "2026-08-02T00:00:00"
  };

  const page = normalizeWordPressPage(raw, "hello", {
    provider: "wp",
    operation: "getPage",
    content: "hello",
    editorMode: "gutenberg"
  });

  assert.equal(page.id, "7");
  assert.equal(page.data.content, raw.content.rendered);
  const sections = page.data.sections as Array<{ type: string; data: Record<string, unknown> }>;
  assert.ok(Array.isArray(sections));
  const section = sections[0]!;
  assert.equal(section.type, "image_text");
  const image = section.data.image as Record<string, unknown>;
  assert.equal(image.src, "https://example.com/block.jpg");
  assert.equal(image.id, "123");
  assert.equal((image as Record<string, unknown>).url, undefined);
});

test("normalizeWordPressPage keeps no sections when editor mode is unset", () => {
  const raw = {
    id: 7,
    slug: "hello-world",
    status: "publish",
    title: { rendered: "Hello" },
    content: {
      rendered: `<!-- wp:core/paragraph -->
<p>Plain</p>
<!-- /wp:core/paragraph -->`
    },
    date_gmt: "2026-08-01T00:00:00",
    modified_gmt: "2026-08-02T00:00:00"
  };

  const page = normalizeWordPressPage(raw, "hello", {
    provider: "wp",
    operation: "getPage",
    content: "hello"
  });

  assert.equal(page.data.sections, undefined);
});

test("normalizeWordPressItem emits canonical sections for ACF flexible content with normalized media", () => {
  const raw = {
    id: 9,
    slug: "post-one",
    status: "publish",
    title: { rendered: "Post One" },
    content: { rendered: "" },
    date_gmt: "2026-08-01T00:00:00",
    modified_gmt: "2026-08-02T00:00:00",
    link: "https://example.com/post-one",
    acf: {
      sections: [
        {
          acf_fc_layout: "hero",
          heading: "Hero Title",
          image: {
            id: 1,
            url: "https://example.com/h.jpg",
            alt: "Hero",
            width: 800,
            height: 600
          }
        },
        {
          acf_fc_layout: "gallery",
          heading: "Gallery",
          images: [
            { id: 2, url: "https://example.com/g1.jpg", alt: "One" },
            { id: 3, url: "https://example.com/g2.jpg" }
          ]
        },
        {
          acf_fc_layout: "features",
          heading: "Features",
          items: [
            { title: "Feature", image: { id: 4, url: "https://example.com/f.jpg", alt: "F" } }
          ]
        },
        {
          acf_fc_layout: "logo_grid",
          heading: "Logos",
          items: [{ name: "Acme", image: { ID: 5, url: "https://example.com/l.jpg" } }]
        }
      ]
    }
  };

  const item = normalizeWordPressItem(raw, {
    provider: "wp",
    operation: "getItem",
    content: "posts/post-one",
    editorMode: "acf_flexible"
  });

  assert.equal(item.key, "post-one");
  const sections = item.data.sections as Array<{ type: string; data: Record<string, unknown> }>;
  assert.equal(sections.length, 4);
  assert.equal(sections[0]!.type, "hero");
  const heroImage = sections[0]!.data.image as Record<string, unknown>;
  assert.equal(heroImage.src, "https://example.com/h.jpg");
  assert.equal(heroImage.id, "1");

  const gallery = sections[1]!;
  assert.equal(gallery.type, "gallery");
  const images = gallery.data.images as Array<Record<string, unknown>>;
  assert.equal(images.length, 2);
  assert.equal(images[0]!.src, "https://example.com/g1.jpg");
  assert.equal(images[0]!.alt, "One");
  assert.equal(images[1]!.src, "https://example.com/g2.jpg");
  assert.equal(images[1]!.url, undefined);

  const features = sections[2]!;
  const featureItems = features.data.items as Array<Record<string, unknown>>;
  assert.equal((featureItems[0]!.image as Record<string, unknown>).src, "https://example.com/f.jpg");

  const logos = sections[3]!;
  const logoItems = logos.data.items as Array<Record<string, unknown>>;
  const logoImage = logoItems[0]!.image as Record<string, unknown>;
  assert.equal(logoImage.src, "https://example.com/l.jpg");
  assert.equal(logoImage.id, "5");
});

test("normalizeWordPressPage flattens fixed ACF group media to MediaAsset on named fields", () => {
  const raw = {
    id: 12,
    slug: "about",
    status: "publish",
    title: { rendered: "About" },
    content: { rendered: "" },
    date_gmt: "2026-08-01T00:00:00",
    modified_gmt: "2026-08-02T00:00:00",
    acf: {
      hero: {
        heading: "Welcome",
        body: "Body",
        image: { url: "https://example.com/h2.jpg", id: 8, alt: "A2", width: 100, height: 50 }
      }
    }
  };

  const page = normalizeWordPressPage(raw, "about", {
    provider: "wp",
    operation: "getPage",
    content: "about",
    editorMode: "acf_fixed"
  });

  assert.equal((page.data.hero as Record<string, unknown>).heading, "Welcome");
  const image = (page.data.hero as Record<string, unknown>).image as Record<string, unknown>;
  assert.equal(image.src, "https://example.com/h2.jpg");
  assert.equal(image.id, "8");
  assert.equal(image.url, undefined);
  assert.equal(page.data.sections, undefined);
});

// ─── Media normalization ───────────────────────────────────────────

test("normalizeAcfImageToMediaAsset normalizes ACF image object", () => {
  const acfImage = {
    id: 123,
    url: "https://example.com/image.jpg",
    alt: "Test image",
    width: 800,
    height: 600,
    mimeType: "image/jpeg",
    sizes: {
      thumbnail: { url: "https://example.com/thumb.jpg", width: 150, height: 150 },
      medium: { url: "https://example.com/medium.jpg", width: 300, height: 200 },
      full: { url: "https://example.com/full.jpg", width: 800, height: 600 }
    }
  };

  const asset = normalizeAcfImageToMediaAsset(acfImage);
  assert.ok(asset);
  assert.equal(asset.id, "123");
  assert.equal(asset.src, "https://example.com/image.jpg");
  assert.equal(asset.alt, "Test image");
  assert.equal(asset.width, 800);
  assert.equal(asset.height, 600);
  assert.equal(asset.mimeType, "image/jpeg");
  assert.ok(asset.sizes);
  assert.equal(Object.keys(asset.sizes).length, 3);
});

test("normalizeAcfImageToMediaAsset handles legacy ID field", () => {
  const acfImage = {
    ID: 456,
    url: "https://example.com/image.jpg"
  };

  const asset = normalizeAcfImageToMediaAsset(acfImage);
  assert.ok(asset);
  assert.equal(asset.id, "456");
});

test("normalizeAcfImageToMediaAsset returns undefined for invalid input", () => {
  assert.equal(normalizeAcfImageToMediaAsset(null), undefined);
  assert.equal(normalizeAcfImageToMediaAsset(undefined), undefined);
  assert.equal(normalizeAcfImageToMediaAsset("string"), undefined);
  assert.equal(normalizeAcfImageToMediaAsset([]), undefined);
});

test("normalizeFeaturedMedia normalizes WordPress featured media", () => {
  const media = {
    id: 789,
    source_url: "https://example.com/featured.jpg",
    alt_text: "Featured image",
    caption: { rendered: "Image caption" },
    media_details: {
      width: 1200,
      height: 800,
      mime_type: "image/jpeg",
      sizes: {
        thumbnail: { source_url: "https://example.com/thumb.jpg", width: 150, height: 150 },
        full: { source_url: "https://example.com/full.jpg", width: 1200, height: 800 }
      }
    }
  };

  const asset = normalizeFeaturedMedia(media);
  assert.ok(asset);
  assert.equal(asset.id, "789");
  assert.equal(asset.src, "https://example.com/featured.jpg");
  assert.equal(asset.alt, "Featured image");
  assert.equal(asset.caption, "Image caption");
  assert.equal(asset.width, 1200);
  assert.equal(asset.height, 800);
  assert.equal(asset.mimeType, "image/jpeg");
  assert.ok(asset.sizes);
  assert.equal(Object.keys(asset.sizes).length, 2);
});

test("normalizeFeaturedMedia returns undefined for missing source_url", () => {
  const media = { id: 1 };
  assert.equal(normalizeFeaturedMedia(media), undefined);
});

// ─── Deterministic section IDs ─────────────────────────────────────

test("generateDeterministicSectionId generates stable IDs", () => {
  const id1 = generateDeterministicSectionId("hero", 0);
  const id2 = generateDeterministicSectionId("hero", 0);
  const id3 = generateDeterministicSectionId("hero", 1);

  assert.equal(id1, id2);
  assert.notEqual(id1, id3);
});

test("resolveSectionIds preserves explicit IDs", () => {
  const sections = [
    { id: "explicit-id", type: "hero" as const, data: {} },
    { type: "rich_text" as const, data: {} }
  ];

  const resolved = resolveSectionIds(sections, "home");
  assert.equal(resolved[0]!.id, "explicit-id");
  assert.ok(resolved[1]!.id);
});

test("resolveSectionIds uses section_id from data", () => {
  const sections = [
    { type: "hero" as const, data: { section_id: "my-hero" } }
  ];

  const resolved = resolveSectionIds(sections, "home");
  assert.equal(resolved[0]!.id, "my-hero");
});

test("resolveSectionIds uses anchor from data", () => {
  const sections = [
    { type: "hero" as const, data: { anchor: "hero-section" } }
  ];

  const resolved = resolveSectionIds(sections, "home");
  assert.equal(resolved[0]!.id, "hero-section");
});

test("resolveSectionIds generates deterministic IDs for sections without IDs", () => {
  const sections = [
    { type: "hero" as const, data: {} },
    { type: "rich_text" as const, data: {} }
  ];

  const resolved = resolveSectionIds(sections, "home");
  assert.ok(resolved[0]!.id);
  assert.ok(resolved[1]!.id);
  assert.notEqual(resolved[0]!.id, resolved[1]!.id);
});

test("ensureUniqueSectionIds makes duplicate IDs unique", () => {
  const sections = [
    { id: "same-id", type: "hero" as const, data: {} },
    { id: "same-id", type: "rich_text" as const, data: {} },
    { id: "same-id", type: "cta" as const, data: {} }
  ];

  const unique = ensureUniqueSectionIds(sections);
  assert.equal(unique[0]?.id, "same-id");
  assert.equal(unique[1]?.id, "same-id-1");
  assert.equal(unique[2]?.id, "same-id-2");
});

test("ensureUniqueSectionIds preserves sections without IDs", () => {
  const sections = [
    { type: "hero" as const, data: {} },
    { id: "unique", type: "rich_text" as const, data: {} }
  ];

  const unique = ensureUniqueSectionIds(sections);
  assert.equal(unique[0]?.id, undefined);
  assert.equal(unique[1]?.id, "unique");
});
