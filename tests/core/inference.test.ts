import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  CollectionItem,
  ComponentSchema,
  ContentProvider,
  ModelSchema,
  NavigationContent,
  NexusConfig,
  PageContent,
  SettingsContent,
  SingletonContent
} from "../../src/core/index.ts";
import {
  defineNexusConfig,
  NexusContent
} from "../../src/core/index.ts";
import type { InferModel } from "../../src/core/index.ts";

/**
 * Compile-time schema inference coverage.
 *
 * The negative cases use `@ts-expect-error` inside functions that are never
 * called: the assignments/calls must fail type checking but never execute.
 */

const models = {
  home: {
    kind: "singleton",
    source: { provider: "git", key: "home", mode: "page" },
    fields: {
      hero: {
        type: "object",
        required: true,
        fields: {
          heading: { type: "string", required: true },
          intro: { type: "string", required: true }
        }
      },
      eyebrow: { type: "string" },
      badge: { type: "string", options: ["new", "sale"] },
      numbers: { type: "number", list: true },
      checklist: { type: "string", list: true, required: true },
      featuredImage: { type: "media", media: "local" },
      author: { type: "reference", collection: "team" },
      publishedAt: { type: "datetime" },
      body: {
        type: "blocks",
        list: true,
        required: true,
        allowedComponents: ["heroSection"]
      }
    }
  },
  team: {
    kind: "collection",
    source: { provider: "git", key: "team" },
    fields: {
      name: { type: "string", required: true },
      role: { type: "string", options: ["dev", "design"] }
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
      title: { type: "string", required: true }
    }
  }
} as const satisfies Record<string, ModelSchema>;

const components = {
  heroSection: {
    fields: {
      heading: { type: "string", required: true },
      image: { type: "media" },
      cta: { type: "component", component: "button" }
    }
  },
  button: {
    fields: {
      label: { type: "string", required: true },
      href: { type: "string", required: true }
    }
  }
} as const satisfies Record<string, ComponentSchema>;

const config = {
  providers: { git: { type: "git" } },
  media: {
    default: "local",
    providers: {
      local: { type: "local", options: { root: "/tmp/media", publicPath: "/media" } },
      remote: { type: "remote" }
    }
  },
  schema: { models, components }
} satisfies NexusConfig;

const nexusConfig = defineNexusConfig(config);
const nexus = new NexusContent(nexusConfig);

class StubProvider implements ContentProvider {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async getPage<TData = Record<string, unknown>>(): Promise<PageContent<TData> | null> {
    return {
      id: "home",
      key: "home",
      title: "Home",
      data: {
        hero: { heading: "Hi", intro: "Welcome" },
        checklist: ["a"],
        featuredImage: { id: "1", src: "logo.png" },
        body: [{ _type: "heroSection", heading: "Hi", image: { id: "1", src: "logo.png" } }]
      } as TData,
      meta: { source: this.name }
    };
  }

  async getSingleton<TData = Record<string, unknown>>(): Promise<SingletonContent<TData> | null> {
    return null;
  }

  async getNavigation(): Promise<NavigationContent | null> {
    return { id: "primary", key: "primary", items: [], meta: { source: this.name } };
  }

  async getSettings<TData = Record<string, unknown>>(): Promise<SettingsContent<TData> | null> {
    return { id: "site", key: "site", data: { title: "Nexus" } as TData, meta: { source: this.name } };
  }

  async getCollection<TData = Record<string, unknown>>(): Promise<CollectionItem<TData>[]> {
    return [{
      id: "ada",
      key: "ada",
      title: "Ada",
      data: { name: "Ada", role: "dev" } as TData,
      meta: { source: this.name }
    }];
  }

  async getItem<TData = Record<string, unknown>>(): Promise<CollectionItem<TData> | null> {
    return {
      id: "ada",
      key: "ada",
      title: "Ada",
      data: { name: "Ada", role: "dev" } as TData,
      meta: { source: this.name }
    };
  }
}

nexus.register("git", new StubProvider("git"));

test("schema inference stays available on the package public API", () => {
  assert.equal(defineNexusConfig(config), config);
  assert.ok(nexus instanceof NexusContent);
});

function expectType<T>(_value: T): void {}

type HomeData = InferModel<typeof nexusConfig, "home">;
type TeamItemData = InferModel<typeof nexusConfig, "team">;
type SiteData = InferModel<typeof nexusConfig, "site">;

test("inferred data shapes are structurally correct", () => {
  expectType<{
    hero: { heading: string; intro: string };
    checklist: string[];
    badge?: "new" | "sale";
    eyebrow?: string;
    numbers?: number[];
    featuredImage?: { id?: string; src?: string; provider?: string };
    author?: { model: string; key: string };
    publishedAt?: string;
  }>({} as HomeData);

  expectType<{
    name: string;
    role?: "dev" | "design";
  }>({} as TeamItemData);

  expectType<{ title: string }>({} as SiteData);

  // Extra undeclared data keys pass through (matched by .passthrough()).
  const valid: HomeData = {
    hero: { heading: "Hi", intro: "Welcome" },
    checklist: ["a", "b"],
    badge: "new",
    numbers: [1, 2],
    featuredImage: { id: "1", src: "logo.png" },
    author: { model: "team", key: "ada" },
    publishedAt: "2026-08-01T00:00:00Z",
    body: [
      {
        _type: "heroSection",
        heading: "Hi",
        image: { id: "1", src: "logo.png" },
        cta: { label: "Go", href: "/go" }
      }
    ],
    whollyUndeclared: { anything: "goes" }
  };
  expectType(valid);

  // Blocks discriminate on `_type` and resolve the matching component shape.
  const block = (valid as HomeData).body[0];
  if (block) {
    expectType<"heroSection">(block._type);
    const heading: string = block.heading;
    expectType(heading);
    const ctaHref: string | undefined = block.cta?.href;
    expectType(ctaHref);
  }
});

test("retrieval methods infer model data and restrict model names", async () => {
  const page = await nexus.getPage("home");
  assert.ok(page);
  assert.equal(page.data.hero.heading, "Hi");
  // The media field override resolves to the declared provider at runtime.
  assert.equal(page.data.featuredImage?.provider, "local");
  const heading: string = page.data.hero.heading;
  const badge: "new" | "sale" | undefined = page.data.badge;
  expectType(heading);
  expectType(badge);

  const items = await nexus.getCollection("team");
  assert.equal(items[0]?.data.name, "Ada");
  const name: string = items[0]?.data.name ?? "";
  expectType(name);

  const item = await nexus.getItem("team", "ada");
  if (item) {
    const role: "dev" | "design" | undefined = item.data.role;
    expectType(role);
  }

  const settings = await nexus.getSettings("site");
  assert.ok(settings);
  assert.equal(settings.data.title, "Nexus");
  const title: string = settings.data.title;
  expectType(title);

  const navigation = await nexus.getNavigation("primary");
  assert.ok(navigation);
});

test("type inference rejects invalid model usage at compile time", () => {
  function invalidModelName(): void {
    // @ts-expect-error no such model
    nexus.getPage("missing");
  }

  function wrongKindForPage(): void {
    // @ts-expect-error "team" is a collection, not a singleton
    nexus.getPage("team");
  }

  function wrongKindForCollection(): void {
    // @ts-expect-error "site" is settings, not a collection
    nexus.getCollection("site");
  }

  function wrongKindForSettings(): void {
    // @ts-expect-error "primary" is navigation, not settings
    nexus.getSettings("primary");
  }

  function pageModeExcludedFromSingleton(): void {
    // @ts-expect-error "home" routes through getPage
    nexus.getSingleton("home");
  }

  function invalidStringOption(): void {
    // @ts-expect-error "badge" must be "new" or "sale"
    const bad: HomeData = { hero: { heading: "h", intro: "i" }, badge: "nope" };
    expectType(bad);
  }

  function missingRequiredField(): void {
    // @ts-expect-error "hero" is required
    const bad: HomeData = { checklist: [] };
    expectType(bad);
  }

  function explicitDataOverride(): void {
    const page = nexus.getPage<{ custom: string }>("home");
    expectType(page);
  }
});