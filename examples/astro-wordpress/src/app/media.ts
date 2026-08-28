import type { NexusContent } from "@nexuscontent/core";

/**
 * Media resolution for the dual-provider reference consumer.
 *
 * Content carries media fields as `MediaReference` values (`provider`, `id`,
 * `src`, `alt`). Media resolution is a consumer concern, so pages resolve the
 * media their components will render through `nexus.media.resolve` before
 * handing data to components. With the "remote" default provider, absolute
 * http(s) URLs are validated and passed through unchanged; the same content
 * files work with any provider that returns normalized media.
 */

export interface ResolvedImage {
  src: string;
  alt?: string;
}

interface RawMedia {
  provider?: string;
  id?: string;
  src?: string;
  alt?: string;
}

export async function resolveImage(
  nexus: NexusContent,
  image?: RawMedia | null
): Promise<ResolvedImage | undefined> {
  if (!image || (image.src === undefined && image.id === undefined)) {
    return undefined;
  }
  const asset = await nexus.media.resolve({
    provider: image.provider,
    id: image.id,
    src: image.src
  });
  if (asset) {
    return { src: asset.src, alt: asset.alt ?? image.alt };
  }
  return image.src !== undefined
    ? { src: image.src, alt: image.alt }
    : undefined;
}

/**
 * Recursively resolve every media reference inside a section's data. Objects
 * carrying a `src` string are treated as media references (the canonical
 * section fields `image`, `background_image`, `images`, and item-level
 * `thumbnail`/`avatar`/`image` all author `src`); all other data passes
 * through unchanged.
 */
export async function resolveMediaFields(
  nexus: NexusContent,
  value: unknown
): Promise<unknown> {
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      out.push(await resolveMediaFields(nexus, item));
    }
    return out;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.src === "string") {
    return (await resolveImage(nexus, record as RawMedia)) ?? value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(record)) {
    out[key] = await resolveMediaFields(nexus, nested);
  }
  return out;
}