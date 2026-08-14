import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NexusContent,
  NexusContentError,
  ProviderError,
  RegistryError,
  ValidationError
} from "../../src/core/index.ts";
import type { CollectionItem, ContentProvider, NexusConfig, PageContent } from "../../src/core/index.ts";

class MockProvider implements ContentProvider {
  readonly name: string;
  private pageResult: Record<string, unknown> | null = null;
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
    content: {
      home: { provider: "mock", key: "home" },
      blog: { provider: "mock", key: "posts" }
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
      assert.match(error.message, /"missing"/);
      return true;
    }
  );
});
