import type { NexusContent } from "@nexuscontent/core";

/**
 * Media resolution for the reference consumer.
 *
 * Content carries media fields as `MediaReference` values. Media resolution is
 * a consumer concern, so pages resolve the media their components will render
 * through `nexus.media.resolve` before handing data to components. Direct
 * pages resolve each named component; blog post bodies resolve their blocks.
 */

export interface ResolvedImage {
  src: string;
  alt?: string;
}

// Raw payload shapes carried by content. Named component fields and block
// bodies share these shapes; the block renderer adds `_type` separately.
interface RawImage {
  provider?: string;
  id?: string;
  src?: string;
  alt?: string;
}

interface RawButton {
  label: string;
  href: string;
  variant?: string;
}

interface RawHero {
  heading: string;
  intro?: string;
  image?: RawImage;
  cta?: RawButton;
}

interface RawService {
  title: string;
  description: string;
  icon?: RawImage;
}

interface RawServices {
  heading: string;
  intro?: string;
  items?: RawService[];
}

interface RawTestimonial {
  quote: string;
  author: string;
  avatar?: RawImage;
}

interface RawTestimonials {
  heading: string;
  items?: RawTestimonial[];
}

interface RawRichText {
  content: string;
}

interface RawGallery {
  heading?: string;
  images?: RawImage[];
}

interface RawCodeSnippet {
  language: string;
  code: string;
  caption?: string;
}

export interface ResolvedButton {
  label: string;
  href: string;
  variant?: string;
}

export interface ResolvedService {
  title: string;
  description: string;
  icon?: ResolvedImage;
}

export interface ResolvedTestimonial {
  quote: string;
  author: string;
  avatar?: ResolvedImage;
}

export interface ResolvedHero {
  heading: string;
  intro?: string;
  image: ResolvedImage;
  cta?: ResolvedButton;
}

export interface ResolvedServices {
  heading: string;
  intro?: string;
  items: ResolvedService[];
}

export interface ResolvedTestimonials {
  heading: string;
  items: ResolvedTestimonial[];
}

export interface ResolvedRichText {
  content: string;
}

export interface ResolvedGallery {
  heading?: string;
  images: ResolvedImage[];
}

export interface ResolvedCodeSnippet {
  language: string;
  code: string;
  caption?: string;
}

export type ResolvedBlock =
  | ({ _type: "hero" } & ResolvedHero)
  | ({ _type: "servicesList" } & ResolvedServices)
  | ({ _type: "testimonialsList" } & ResolvedTestimonials)
  | ({ _type: "richTextContent" } & ResolvedRichText)
  | ({ _type: "imageGallery" } & ResolvedGallery)
  | ({ _type: "codeSnippet" } & ResolvedCodeSnippet);

function rawType(block: unknown): string | undefined {
  const type = (block as { _type?: unknown } | null | undefined)?._type;
  return typeof type === "string" ? type : undefined;
}

export async function resolveImage(
  nexus: NexusContent,
  image?: RawImage
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

export async function resolveHero(
  nexus: NexusContent,
  raw?: RawHero
): Promise<ResolvedHero | undefined> {
  if (!raw) {
    return undefined;
  }
  return {
    heading: raw.heading,
    intro: raw.intro,
    image: (await resolveImage(nexus, raw.image)) ?? { src: "", alt: undefined },
    cta: raw.cta
  };
}

export async function resolveServices(
  nexus: NexusContent,
  raw?: RawServices
): Promise<ResolvedServices | undefined> {
  if (!raw) {
    return undefined;
  }
  const items: ResolvedService[] = [];
  for (const item of raw.items ?? []) {
    items.push({
      title: item.title,
      description: item.description,
      icon: await resolveImage(nexus, item.icon)
    });
  }
  return { heading: raw.heading, intro: raw.intro, items };
}

export async function resolveTestimonials(
  nexus: NexusContent,
  raw?: RawTestimonials
): Promise<ResolvedTestimonials | undefined> {
  if (!raw) {
    return undefined;
  }
  const items: ResolvedTestimonial[] = [];
  for (const item of raw.items ?? []) {
    items.push({
      quote: item.quote,
      author: item.author,
      avatar: await resolveImage(nexus, item.avatar)
    });
  }
  return { heading: raw.heading, items };
}

export async function resolveGallery(
  nexus: NexusContent,
  raw?: RawGallery
): Promise<ResolvedGallery | undefined> {
  if (!raw) {
    return undefined;
  }
  const images: ResolvedImage[] = [];
  for (const image of raw.images ?? []) {
    const resolved = await resolveImage(nexus, image);
    if (resolved) {
      images.push(resolved);
    }
  }
  return { heading: raw.heading, images };
}

/**
 * Resolve the media references embedded in a block list. Components that
 * carry no media pass through unchanged.
 */
export async function resolveBlocks(
  nexus: NexusContent,
  blocks: ReadonlyArray<unknown> | undefined
): Promise<ResolvedBlock[]> {
  const resolved: ResolvedBlock[] = [];
  for (const block of blocks ?? []) {
    switch (rawType(block)) {
      case "hero": {
        const hero = await resolveHero(nexus, block as RawHero);
        if (hero) {
          resolved.push({ _type: "hero", ...hero });
        }
        break;
      }
      case "servicesList": {
        const services = await resolveServices(nexus, block as RawServices);
        if (services) {
          resolved.push({ _type: "servicesList", ...services });
        }
        break;
      }
      case "testimonialsList": {
        const testimonials = await resolveTestimonials(
          nexus,
          block as RawTestimonials
        );
        if (testimonials) {
          resolved.push({ _type: "testimonialsList", ...testimonials });
        }
        break;
      }
      case "richTextContent":
        resolved.push({ _type: "richTextContent", ...(block as RawRichText) });
        break;
      case "imageGallery": {
        const gallery = await resolveGallery(nexus, block as RawGallery);
        if (gallery) {
          resolved.push({ _type: "imageGallery", ...gallery });
        }
        break;
      }
      case "codeSnippet":
        resolved.push({ _type: "codeSnippet", ...(block as RawCodeSnippet) });
        break;
    }
  }
  return resolved;
}