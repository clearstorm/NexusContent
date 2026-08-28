import type { ContentSection, MediaAsset } from "../../core/types.ts";
import type { BuiltinSectionType } from "./config.ts";
import { BUILTIN_SECTION_TYPES } from "./config.ts";

interface GutenbergBlock {
  blockName: string;
  attributes: Record<string, unknown>;
  innerBlocks: GutenbergBlock[];
  innerHTML: string;
}

/**
 * Parse Gutenberg block markup into an array of blocks.
 * Gutenberg uses HTML comments as delimiters:
 *   <!-- wp:block-name {attributes} -->
 *   content
 *   <!-- /wp:block-name -->
 */
export function parseGutenbergBlocks(html: string): GutenbergBlock[] {
  const blocks: GutenbergBlock[] = [];
  const blockPattern =
    /<!-- wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)\s*(\{[^]*?\})?\s*-->([\s\S]*?)<!-- \/wp:\1 -->/g;

  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(html)) !== null) {
    const blockName = match[1] ?? "";
    const attributesJson = match[2];
    const innerHTML = match[3] ?? "";

    let attributes: Record<string, unknown> = {};
    if (attributesJson) {
      try {
        attributes = JSON.parse(attributesJson) as Record<string, unknown>;
      } catch {
        attributes = {};
      }
    }

    blocks.push({
      blockName,
      attributes,
      innerBlocks: parseGutenbergBlocks(innerHTML),
      innerHTML
    });
  }

  return blocks;
}

/**
 * Map a Gutenberg block name to a canonical section type.
 */
function mapBlockToSectionType(blockName: string): BuiltinSectionType | null {
  switch (blockName) {
    case "core/heading":
      return "rich_text";
    case "core/paragraph":
      return "rich_text";
    case "core/list":
      return "rich_text";
    case "core/quote":
      return "rich_text";
    case "core/pullquote":
      return "rich_text";
    case "core/code":
      return "rich_text";
    case "core/preformatted":
      return "rich_text";
    case "core/image":
      return "image_text";
    case "core/gallery":
      return "gallery";
    case "core/columns":
      return null; // Container; children are processed individually
    case "core/column":
      return null; // Handled as part of columns
    case "core/group":
      return "rich_text";
    case "core/cover":
      return "hero";
    case "core/embed":
      return "form_embed";
    case "core/spacer":
      return null; // Skip spacers
    case "core/separator":
      return null; // Skip separators
    case "core/shortcode":
      return null; // Skip shortcodes
    case "core/video":
      return "image_text";
    case "core/audio":
      return "rich_text";
    case "core/file":
      return "rich_text";
    case "core/table":
      return "rich_text";
    case "core/button":
      return "cta";
    case "core/buttons":
      return null; // Container; individual buttons are processed
    case "core/latest-posts":
      return "rich_text";
    case "core/categories":
      return "rich_text";
    case "core/tag-cloud":
      return "rich_text";
    case "core/navigation-link":
      return null; // Skip navigation blocks
    case "core/navigation-submenu":
      return null; // Skip navigation blocks
    default:
      return null;
  }
}

/**
 * Extract heading text from a heading block.
 */
function extractHeadingText(block: GutenbergBlock): string {
  // The heading level is in attributes, text is in innerHTML
  return stripHTML(block.innerHTML);
}

/**
 * Extract paragraph text from a paragraph block.
 */
function extractParagraphText(block: GutenbergBlock): string {
  return stripHTML(block.innerHTML);
}

/**
 * Extract list items from a list block.
 */
function extractListItems(block: GutenbergBlock): string[] {
  const items: string[] = [];
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/g;
  let match: RegExpExecArray | null;
  while ((match = liPattern.exec(block.innerHTML)) !== null) {
    const content = match[1];
    if (content !== undefined) {
      items.push(stripHTML(content));
    }
  }
  return items;
}

/**
 * Extract image data from an image block as a MediaAsset.
 */
function extractImageData(block: GutenbergBlock): MediaAsset | null {
  const attrs = block.attributes;
  const src = typeof attrs.url === "string" ? attrs.url : null;
  if (!src) return null;

  const asset: MediaAsset = { src };
  if (typeof attrs.id === "number" || typeof attrs.id === "string") {
    asset.id = String(attrs.id);
  }
  if (typeof attrs.alt === "string") {
    asset.alt = attrs.alt;
  }
  if (typeof attrs.caption === "string") {
    asset.caption = attrs.caption;
  }
  if (typeof attrs.width === "number") {
    asset.width = attrs.width;
  }
  if (typeof attrs.height === "number") {
    asset.height = attrs.height;
  }
  return asset;
}

/**
 * Extract gallery images from a gallery block as MediaAsset entries.
 */
function extractGalleryImages(block: GutenbergBlock): MediaAsset[] {
  const images: MediaAsset[] = [];
  const imgPattern = /<img[^>]+src="([^"]+)"[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = imgPattern.exec(block.innerHTML)) !== null) {
    const src = match[1];
    if (src === undefined) continue;

    const tag = match[0];
    const asset: MediaAsset = { src };
    const alt = /alt="([^"]*)"/.exec(tag)?.[1];
    if (alt) asset.alt = alt;
    const id = /wp-image-(\d+)/.exec(tag)?.[1];
    if (id) asset.id = id;
    images.push(asset);
  }
  return images;
}

/**
 * Extract embed URL from an embed block.
 */
function extractEmbedData(
  block: GutenbergBlock
): { provider?: string; url: string; caption?: string } | null {
  const url = typeof block.attributes.url === "string"
    ? block.attributes.url
    : typeof block.attributes.providerNameSlug === "string"
      ? `https://wordpress.tv/?v=${block.attributes.providerNameSlug}`
      : null;
  if (!url) return null;

  return {
    provider: typeof block.attributes.providerNameSlug === "string"
      ? block.attributes.providerNameSlug
      : undefined,
    url,
    caption: typeof block.attributes.caption === "string" ? block.attributes.caption : undefined
  };
}

/**
 * Strip HTML tags from a string.
 */
function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse Gutenberg block markup into ContentSection array.
 * Maps core Gutenberg blocks to the 12 canonical section types.
 */
export function parseGutenbergToSections(
  html: string,
  options: {
    includeCoreBlocks?: boolean;
    onUnknown?: (blockName: string) => "throw" | "skip" | "raw";
  } = {}
): ContentSection[] {
  const blocks = flattenBlocks(parseGutenbergBlocks(html));
  const sections: ContentSection[] = [];
  let position = 0;

  for (const block of blocks) {
    const sectionType = mapBlockToSectionType(block.blockName);

    if (sectionType === null) {
      // Skip or handle unknown blocks
      if (options.onUnknown) {
        const action = options.onUnknown(block.blockName);
        if (action === "throw") {
          throw new Error(`Unknown Gutenberg block: ${block.blockName}`);
        }
        if (action === "skip") {
          continue;
        }
        if (action === "raw") {
          sections.push({
            id: generateSectionId("raw", position),
            type: "rich_text",
            data: { html: block.innerHTML }
          });
          position++;
          continue;
        }
      }
      continue;
    }

    const data = extractBlockData(block, sectionType);
    if (data !== null) {
      sections.push({
        id: generateSectionId(sectionType, position),
        type: sectionType,
        data
      });
      position++;
    }
  }

  return sections;
}

/**
 * Extract structured data from a Gutenberg block based on its section type.
 */
function extractBlockData(
  block: GutenbergBlock,
  sectionType: BuiltinSectionType
): Record<string, unknown> | null {
  switch (sectionType) {
    case "hero": {
      const heading = extractHeadingText(block);
      const body = block.innerHTML
        .split("</h1>")
        .pop()
        ?.split("</h2>")
        .pop()
        ?.split("</h3>")
        .pop();
      const bodyText = body ? stripHTML(body) : undefined;
      const image = extractImageData(block);
      return {
        heading,
        body: bodyText,
        image
      };
    }
    case "rich_text": {
      const heading = block.blockName === "core/heading" ? extractHeadingText(block) : undefined;
      const body = block.blockName === "core/paragraph"
        ? extractParagraphText(block)
        : block.blockName === "core/list"
          ? extractListItems(block).join("\n")
          : stripHTML(block.innerHTML);
      return {
        heading,
        body
      };
    }
    case "image_text": {
      const image = extractImageData(block);
      const heading = typeof block.attributes.caption === "string"
        ? block.attributes.caption
        : undefined;
      return {
        heading,
        body: stripHTML(block.innerHTML.replace(/<img[^>]*>/, "")),
        image
      };
    }
    case "gallery": {
      const images = extractGalleryImages(block);
      return {
        heading: typeof block.attributes.caption === "string" ? block.attributes.caption : undefined,
        images
      };
    }
    case "form_embed": {
      const embed = extractEmbedData(block);
      return {
        provider: embed?.provider,
        form_id: embed?.url,
        embed_code: block.innerHTML,
        heading: embed?.caption
      };
    }
    case "cta": {
      const heading = extractHeadingText(block);
      return {
        heading,
        body: stripHTML(block.innerHTML)
      };
    }
    case "statistics":
    case "testimonials":
    case "logo_grid":
    case "faq": {
      return {
        heading: extractHeadingText(block),
        items: []
      };
    }
    default:
      return null;
  }
}

/**
 * Generate a deterministic section ID from type and position.
 */
function generateSectionId(type: string, position: number): string {
  return `${type}-${position}`;
}

/**
 * Flatten a block tree into a depth-first array.
 * Container blocks like core/group or core/buttons produce no section themselves;
 * only leaf blocks produce sections.
 */
function flattenBlocks(blocks: GutenbergBlock[]): GutenbergBlock[] {
  const result: GutenbergBlock[] = [];
  for (const block of blocks) {
    if (block.innerBlocks.length > 0) {
      result.push(...flattenBlocks(block.innerBlocks));
    } else {
      result.push(block);
    }
  }
  return result;
}
