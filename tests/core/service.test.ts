import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NexusContent,
  NexusContentError,
  ProviderError,
  RegistryError,
  SchemaError,
  ValidationError
} from "../../src/core/index.ts";
import type {
  CollectionItem,
  ContentProvider,
  NavigationContent,
  NexusConfig,
  PageContent,
  SettingsContent
} from "../../src/core/index.ts";

class MockProvider implements ContentProvider {
  readonly name: string;
  private pageResult: Record<string, unknown> | null = null;
  private navigationResult: Record<string, unknown> | null = null;
  private settingsResult: Record<string, unknown> | null = null;
  private collectionResult: Record<string, unknown>[] = [];
  private itemResult: Record<string, unknown> | null = null;
  private failure: Error | null = null;

  constructor(name: string) {
    this.name = name;
  }

  setPage(value: Record<string, unknown> | null) {
    this.pageResult = value;
    return this;
  }

  setNavigation(value: Record<string, unknown> | null) {
    this.navigationResult = value;
    return this;
  }

  setSettings(value: Record<string, unknown> | null) {
    this.settingsResult = value;
    return this;
  }

  setCollection(value: Record<string, unknown>[]) {
    this.collectionResult = value;
    return this;
  }

  setItem(value: Record<string, unknown> | null) {
    this.itemResult = value;
    return this;
  }

  setError(error: Error) {
    this.failure = error;
    return this;
  }

  async getPage<TData = Record<string, unknown>>(): Promise<PageContent<TData> | null> {
    if (this.failure) throw this.failure;
    return this.pageResult as unknown as PageContent<TData> | null;
  }

  async getNavigation(): Promise<NavigationContent | null> {
    if (this.failure) throw this.failure;
    return this.navigationResult as unknown as NavigationContent | null;
  }

  async getSettings<TData = Record<string, unknown>>(): Promise<SettingsContent<TData> | null> {
    if (this.failure) throw this.failure;
    return this.settingsResult as unknown as SettingsContent<TData> | null;
  }

  async getCollection<TData = Record<string, unknown>>(): Promise<CollectionItem<TData>[]> {
    if (this.failure) throw this.failure;
    return this.collectionResult as unknown as CollectionItem<TData>[];
  }

  async getItem<TData = Record<string, unknown>>(): Promise<CollectionItem<TData> | null> {
    if (this.failure) throw this.failure;
    return this.itemResult as unknown as CollectionItem<TData> | null;
  }
}

function buildConfig(): NexusConfig {
  return {
    providers: { mock: { type: "test" } },
    schema: {
      models: {
        home: {
          kind: "singleton",
          source: { provider: "mock", key: "home" },
          fields: {
            hero: {
              type: "object",
              fields: { heading: { type: "string", required: true } }
            }
          }
        },
        cms_page: {
          kind: "singleton",
          source: { provider: "mock", key: "cms-page" },
          strictSections: true,
          fields: {
            hero: { type: "component", component: "hero", required: true },
            features: { type: "component", component: "features" }
          }
        },
        cms_page_lax: {
          kind: "singleton",
          source: { provider: "mock", key: "cms-page" },
          fields: {
            hero: { type: "component", component: "hero", required: true },
            features: { type: "component", component: "features" }
          }
        },
        singleton: {
          kind: "singleton",
          source: { provider: "mock", key: "singleton" }
        },
        blog: {
          kind: "collection",
          source: { provider: "mock", key: "posts" }
        },
        primary: {
          kind: "navigation",
          source: { provider: "mock", key: "primary" }
        },
        site: {
          kind: "settings",
          source: { provider: "mock", key: "site" }
        }
      },
      components: {
        hero: {
          fields: { heading: { type: "string", required: true } }
        },
        features: {
          fields: {
            heading: { type: "string", required: true },
            items: { type: "string", list: true }
          }
        }
      }
    }
  };
}

function buildService() {
  const service = new NexusContent(buildConfig());
  const mock = new MockProvider("mock");
  service.register("mock", mock);
  return { service, mock };
}

test("getPage returns normalized content from the provider", async () => {
  const { service, mock } = buildService();
  mock.setPage({
    id: "home",
    key: "home",
    title: "Home",
    data: { hero: { heading: "Welcome" } },
    meta: { source: "mock" }
  });

  const page = await service.getPage("home");

  assert.ok(page);
  assert.equal(page.key, "home");
  assert.equal(page.title, "Home");
  assert.deepEqual(page.data, { hero: { heading: "Welcome" } });
  assert.equal(page.meta.source, "mock");
});

test("getPage preserves normalized SEO mapped by a custom provider", async () => {
  const { service, mock } = buildService();
  mock.setPage({
    id: "home",
    key: "home",
    title: "Home",
    seo: {
      canonicalUrl: "https://example.com/",
      openGraph: {
        title: "Mapped provider title",
        image: { src: "https://example.com/social.jpg" }
      }
    },
    data: {},
    meta: { source: "custom-api" }
  });

  const page = await service.getPage("home");

  assert.ok(page);
  assert.equal(page.seo?.openGraph?.title, "Mapped provider title");
  assert.equal(page.seo?.openGraph?.image?.src, "https://example.com/social.jpg");
  assert.equal(page.meta.source, "custom-api");
});

test("getPage normalizes a missing meta source to the provider name", async () => {
  const { service, mock } = buildService();
  mock.setPage({ id: "home", key: "home", data: {} });

  const page = await service.getPage("home");

  assert.ok(page);
  assert.equal(page.meta.source, "mock");
});

test("getPage returns null when the provider has no content", async () => {
  const { service, mock } = buildService();
  mock.setPage(null);

  assert.equal(await service.getPage("home"), null);
});

test("getPage wraps a provider failure in a ProviderError", async () => {
  const { service, mock } = buildService();
  mock.setError(new Error("HTTP 500 from upstream"));

  await assert.rejects(
    () => service.getPage("home"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "mock");
      assert.equal(error.operation, "getPage");
      assert.equal(error.content, "home");
      assert.match(error.reason ?? "", /HTTP 500/);
      return true;
    }
  );
});

test("getPage throws a ValidationError for invalid provider content", async () => {
  const { service, mock } = buildService();
  mock.setPage({ id: "home", key: "home", data: [1, 2], meta: { source: "mock" } });

  await assert.rejects(
    () => service.getPage("home"),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error instanceof NexusContentError);
      assert.ok(error.issues.some((issue) => issue.path === "data"));
      return true;
    }
  );
});

test("getPage throws a SchemaError before returning invalid model data", async () => {
  const { service, mock } = buildService();
  mock.setPage({
    id: "home",
    key: "home",
    data: { hero: { heading: 42 } },
    meta: { source: "mock" }
  });

  await assert.rejects(
    () => service.getPage("home"),
    (error: unknown) => {
      assert.ok(error instanceof SchemaError);
      assert.equal(error.model, "home");
      assert.ok(error.issues.some((issue) => issue.path === "hero.heading"));
      return true;
    }
  );
});

test("getPage expands CMS sections into declared component fields", async () => {
  const { service, mock } = buildService();
  mock.setPage({
    id: "cms-page",
    key: "cms-page",
    title: "CMS page",
    data: {
      sections: [
        { type: "hero", data: { heading: "Hello" } },
        { type: "features", data: { heading: "List", items: ["a", "b"] } }
      ]
    },
    meta: { source: "mock" }
  });

  const page = await service.getPage("cms_page_lax");

  assert.ok(page);
  assert.deepEqual(page.data, {
    hero: { heading: "Hello" },
    features: { heading: "List", items: ["a", "b"] }
  });
});

test("getPage expands page-level sections into declared component fields", async () => {
  const { service, mock } = buildService();
  mock.setPage({
    id: "cms-page",
    key: "cms-page",
    title: "CMS page",
    sections: [
      { type: "hero", data: { heading: "Greetings" } },
      { type: "features", data: { heading: "Wins", items: ["x"] } }
    ],
    data: { editorMode: "gutenberg", content: "<p>raw</p>" },
    meta: { source: "mock" }
  });

  const page = await service.getPage("cms_page_lax");

  assert.ok(page);
  assert.deepEqual(page.data, {
    editorMode: "gutenberg",
    content: "<p>raw</p>",
    hero: { heading: "Greetings" },
    features: { heading: "Wins", items: ["x"] }
  });
});

test("getPage throws a SchemaError for unmatched sections when strictSections is set", async () => {
  const { service, mock } = buildService();
  mock.setPage({
    id: "cms-page",
    key: "cms-page",
    title: "CMS page",
    data: {
      sections: [
        { type: "hero", data: { heading: "Hello" } },
        { type: "gallery", data: {} }
      ]
    },
    meta: { source: "mock" }
  });

  await assert.rejects(
    () => service.getPage("cms_page"),
    (error: unknown) => {
      assert.ok(error instanceof SchemaError);
      assert.equal(error.model, "cms_page");
      assert.match(error.reason ?? "", /gallery/);
      return true;
    }
  );
});

test("getPage does not coerce null provider data into an empty object", async () => {
  const { service, mock } = buildService();
  mock.setPage({ id: "home", key: "home", data: null, meta: { source: "mock" } });

  await assert.rejects(
    () => service.getPage("home"),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "data"));
      return true;
    }
  );
});

test("getNavigation returns normalized nested navigation", async () => {
  const { service, mock } = buildService();
  mock.setNavigation({
    id: "primary",
    key: "primary",
    items: [
      {
        label: "Products",
        href: "/products",
        children: [{ label: "Guides", href: "/guides" }]
      }
    ],
    meta: { source: "mock" }
  });

  const navigation = await service.getNavigation("primary");

  assert.ok(navigation);
  assert.equal(navigation.key, "primary");
  assert.equal(navigation.items[0]?.children?.[0]?.label, "Guides");
  assert.equal(navigation.meta.source, "mock");
});

test("getNavigation normalizes a missing meta source to the provider name", async () => {
  const { service, mock } = buildService();
  mock.setNavigation({
    id: "primary",
    key: "primary",
    items: [{ label: "Home", href: "/" }]
  });

  const navigation = await service.getNavigation("primary");

  assert.ok(navigation);
  assert.equal(navigation.meta.source, "mock");
});

test("getNavigation returns null when the provider has no content", async () => {
  const { service, mock } = buildService();
  mock.setNavigation(null);

  assert.equal(await service.getNavigation("primary"), null);
});

test("getNavigation rejects invalid provider items", async () => {
  const { service, mock } = buildService();
  mock.setNavigation({
    id: "primary",
    key: "primary",
    items: [{ label: "Missing href" }],
    meta: { source: "mock" }
  });

  await assert.rejects(
    () => service.getNavigation("primary"),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "items.0.href"));
      return true;
    }
  );
});

test("getNavigation wraps a provider failure in a ProviderError", async () => {
  const { service, mock } = buildService();
  mock.setError(new Error("Navigation API unavailable"));

  await assert.rejects(
    () => service.getNavigation("primary"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "mock");
      assert.equal(error.operation, "getNavigation");
      assert.equal(error.content, "primary");
      assert.match(error.reason ?? "", /Navigation API unavailable/);
      return true;
    }
  );
});

test("getNavigation throws a RegistryError for an unregistered provider", async () => {
  const service = new NexusContent(buildConfig());
  service.register("other", new MockProvider("other"));

  await assert.rejects(
    () => service.getNavigation("primary"),
    (error: unknown) => {
      assert.ok(error instanceof RegistryError);
      assert.equal(error.provider, "mock");
      return true;
    }
  );
});

test("getNavigation throws a ConfigError for unconfigured navigation", async () => {
  const { service } = buildService();

  await assert.rejects(
    () => service.getNavigation("missing"),
    (error: unknown) => {
      assert.ok(error instanceof NexusContentError);
      assert.match(error.message, /Model "missing"/);
      return true;
    }
  );
});

test("getSettings returns normalized generic settings", async () => {
  const { service, mock } = buildService();
  mock.setSettings({
    id: "site",
    key: "site",
    data: { title: "NexusContent" },
    meta: { source: "mock" }
  });

  const settings = await service.getSettings<{ title: string }>("site");

  assert.ok(settings);
  assert.equal(settings.key, "site");
  assert.deepEqual(settings.data, { title: "NexusContent" });
  assert.equal(settings.meta.source, "mock");
});

test("getSettings normalizes a missing meta source to the provider name", async () => {
  const { service, mock } = buildService();
  mock.setSettings({ id: "site", key: "site", data: {} });

  const settings = await service.getSettings("site");

  assert.ok(settings);
  assert.equal(settings.meta.source, "mock");
});

test("getSettings returns null when the provider has no content", async () => {
  const { service, mock } = buildService();
  mock.setSettings(null);

  assert.equal(await service.getSettings("site"), null);
});

test("getSettings rejects invalid provider data", async () => {
  const { service, mock } = buildService();
  mock.setSettings({
    id: "site",
    key: "site",
    data: null,
    meta: { source: "mock" }
  });

  await assert.rejects(
    () => service.getSettings("site"),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "data"));
      return true;
    }
  );
});

test("getSettings wraps a provider failure in a ProviderError", async () => {
  const { service, mock } = buildService();
  mock.setError(new Error("Settings API unavailable"));

  await assert.rejects(
    () => service.getSettings("site"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "mock");
      assert.equal(error.operation, "getSettings");
      assert.equal(error.content, "site");
      assert.match(error.reason ?? "", /Settings API unavailable/);
      return true;
    }
  );
});

test("getSettings throws a RegistryError for an unregistered provider", async () => {
  const service = new NexusContent(buildConfig());
  service.register("other", new MockProvider("other"));

  await assert.rejects(
    () => service.getSettings("site"),
    (error: unknown) => {
      assert.ok(error instanceof RegistryError);
      assert.equal(error.provider, "mock");
      return true;
    }
  );
});

test("getSettings throws a ConfigError for unconfigured settings", async () => {
  const { service } = buildService();

  await assert.rejects(
    () => service.getSettings("missing"),
    (error: unknown) => {
      assert.ok(error instanceof NexusContentError);
      assert.match(error.message, /Model "missing"/);
      return true;
    }
  );
});

test("getCollection returns normalized collection items", async () => {
  const { service, mock } = buildService();
  mock.setCollection([
    { id: "a", key: "a", title: "A", data: {}, meta: { source: "mock" } },
    { id: "b", key: "b", title: "B", data: {} }
  ]);

  const items = await service.getCollection("blog");

  assert.equal(items.length, 2);
  assert.equal(items[0]?.title, "A");
  assert.equal(items[1]?.title, "B");
  assert.equal(items[1]?.meta.source, "mock");
});

test("getCollection does not coerce primitive item data into an empty object", async () => {
  const { service, mock } = buildService();
  mock.setCollection([
    { id: "a", key: "a", data: "invalid", meta: { source: "mock" } }
  ]);

  await assert.rejects(
    () => service.getCollection("blog"),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "data"));
      return true;
    }
  );
});

test("getCollection wraps a provider failure in a ProviderError", async () => {
  const { service, mock } = buildService();
  mock.setError(new Error("Collection API unavailable"));

  await assert.rejects(
    () => service.getCollection("blog"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "mock");
      assert.equal(error.operation, "getCollection");
      assert.equal(error.content, "blog");
      assert.match(error.reason ?? "", /Collection API unavailable/);
      return true;
    }
  );
});

test("getItem returns a single collection item", async () => {
  const { service, mock } = buildService();
  mock.setItem({ id: "a", key: "a", title: "A", data: { body: "hi" }, meta: { source: "mock" } });

  const item = await service.getItem("blog", "a");

  assert.ok(item);
  assert.equal(item.title, "A");
  assert.deepEqual(item.data, { body: "hi" });
});

test("getItem returns null when the item does not exist", async () => {
  const { service, mock } = buildService();
  mock.setItem(null);

  assert.equal(await service.getItem("blog", "missing"), null);
});

test("getItem rejects invalid provider content", async () => {
  const { service, mock } = buildService();
  mock.setItem({ id: "a", key: "a", data: null, meta: { source: "mock" } });

  await assert.rejects(
    () => service.getItem("blog", "a"),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "data"));
      return true;
    }
  );
});

test("getItem wraps a provider failure in a ProviderError", async () => {
  const { service, mock } = buildService();
  mock.setError(new Error("Item API unavailable"));

  await assert.rejects(
    () => service.getItem("blog", "a"),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.provider, "mock");
      assert.equal(error.operation, "getItem");
      assert.equal(error.content, "blog");
      assert.match(error.reason ?? "", /Item API unavailable/);
      return true;
    }
  );
});

test("getPage throws a RegistryError for an unregistered provider", async () => {
  const service = new NexusContent(buildConfig());
  service.register("other", new MockProvider("other"));

  await assert.rejects(
    () => service.getPage("home"),
    (error: unknown) => {
      assert.ok(error instanceof RegistryError);
      assert.equal(error.provider, "mock");
      return true;
    }
  );
});

test("getPage throws a ConfigError for unconfigured content", async () => {
  const service = new NexusContent(buildConfig());
  const mock = new MockProvider("mock");
  service.register("mock", mock);

  await assert.rejects(
    () => service.getPage("missing"),
    (error: unknown) => {
      assert.ok(error instanceof NexusContentError);
      assert.match(error.message, /Model "missing"/);
      return true;
    }
  );
});
