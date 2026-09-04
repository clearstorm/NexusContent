import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ConfigError,
  LocaleError,
  NexusContent,
  UnsupportedLocaleError
} from "../../src/core/index.ts";
import type {
  CollectionItem,
  ContentProvider,
  NavigationContent,
  NexusConfig,
  PageContent,
  ProviderRetrievalOptions,
  SettingsContent
} from "../../src/core/index.ts";

class RecordingProvider implements ContentProvider {
  readonly name = "recording";
  lastOptions: ProviderRetrievalOptions | undefined;
  private page: PageContent = {
    id: "home",
    key: "home",
    data: {},
    meta: { source: "recording" }
  };

  setPage(value: PageContent): this {
    this.page = value;
    return this;
  }

  async getPage<TData = Record<string, unknown>>(
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<PageContent<TData> | null> {
    this.lastOptions = options;
    return this.page as unknown as PageContent<TData>;
  }

  async getNavigation(
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<NavigationContent | null> {
    this.lastOptions = options;
    return { id: key, key, items: [], meta: { source: "recording" } };
  }

  async getSettings<TData = Record<string, unknown>>(
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<SettingsContent<TData> | null> {
    this.lastOptions = options;
    return { id: key, key, data: {}, meta: { source: "recording" } } as unknown as SettingsContent<TData>;
  }

  async getCollection<TData = Record<string, unknown>>(
    collection: string,
    options?: ProviderRetrievalOptions
  ): Promise<CollectionItem<TData>[]> {
    this.lastOptions = options;
    return [];
  }

  async getItem<TData = Record<string, unknown>>(
    collection: string,
    key: string,
    options?: ProviderRetrievalOptions
  ): Promise<CollectionItem<TData> | null> {
    this.lastOptions = options;
    return null;
  }
}

function buildConfig(): NexusConfig {
  return {
    providers: { recording: { type: "test" } },
    schema: {
      models: {
        home: {
          kind: "singleton",
          source: { provider: "recording", key: "home" }
        },
        blog: {
          kind: "collection",
          source: { provider: "recording", key: "posts" }
        },
        primary: {
          kind: "navigation",
          source: { provider: "recording", key: "primary" }
        },
        site: {
          kind: "settings",
          source: { provider: "recording", key: "site" }
        }
      }
    },
    locales: {
      default: "en",
      supported: ["en", "en-ZA", "zu-ZA"],
      fallback: { "en-ZA": "zu-ZA" }
    }
  };
}

function buildService() {
  const service = new NexusContent(buildConfig());
  const provider = new RecordingProvider();
  service.register("recording", provider);
  return { service, provider };
}

test("forwards the configured default locale when no options are given", async () => {
  const { service, provider } = buildService();

  await service.getPage("home");

  assert.deepEqual(provider.lastOptions, {
    locale: "en",
    fallbackLocales: ["en"],
    strict: false
  });
});

test("forwards an explicitly requested locale with its fallback chain", async () => {
  const { service, provider } = buildService();

  await service.getPage("home", { locale: "en-ZA" });

  assert.deepEqual(provider.lastOptions, {
    locale: "en-ZA",
    fallbackLocales: ["en-ZA", "zu-ZA", "en"],
    strict: false
  });
});

test("rejects an unsupported locale", async () => {
  const { service } = buildService();

  await assert.rejects(
    () => service.getPage("home", { locale: "fr" }),
    (error: unknown) => {
      assert.ok(error instanceof UnsupportedLocaleError);
      assert.ok(error instanceof LocaleError);
      assert.equal(error.locale, "fr");
      assert.deepEqual(error.supportedLocales, ["en", "en-ZA", "zu-ZA"]);
      return true;
    }
  );
});

test("forwards strict resolution when fallback is disabled", async () => {
  const { service, provider } = buildService();

  await service.getPage("home", { locale: "en-ZA", fallback: false });

  assert.deepEqual(provider.lastOptions, {
    locale: "en-ZA",
    fallbackLocales: ["en-ZA"],
    strict: true
  });
});

test("enables strict resolution for the default locale when fallback is disabled", async () => {
  const { service, provider } = buildService();

  await service.getPage("home", { fallback: false });

  assert.deepEqual(provider.lastOptions, {
    locale: "en",
    fallbackLocales: ["en"],
    strict: true
  });
});

test("forwards locale options for navigation, settings, collections, and items", async () => {
  const { service, provider } = buildService();

  await service.getNavigation("primary", { locale: "zu-ZA" });
  assert.equal(provider.lastOptions?.locale, "zu-ZA");

  await service.getSettings("site", { locale: "zu-ZA" });
  assert.equal(provider.lastOptions?.locale, "zu-ZA");

  await service.getCollection("blog", { locale: "zu-ZA" });
  assert.equal(provider.lastOptions?.locale, "zu-ZA");

  await service.getItem("blog", "one", { locale: "zu-ZA" });
  assert.equal(provider.lastOptions?.locale, "zu-ZA");
});

test("does not forward provider options when locales are not configured", async () => {
  const service = new NexusContent({
    providers: { recording: { type: "test" } },
    schema: {
      models: {
        home: {
          kind: "singleton",
          source: { provider: "recording", key: "home" }
        }
      }
    }
  });
  const provider = new RecordingProvider();
  service.register("recording", provider);

  await service.getPage("home");

  assert.equal(provider.lastOptions, undefined);
});

test("rejects a locale request when no locales are configured", async () => {
  const service = new NexusContent({
    providers: { recording: { type: "test" } },
    schema: {
      models: {
        home: {
          kind: "singleton",
          source: { provider: "recording", key: "home" }
        }
      }
    }
  });
  const provider = new RecordingProvider();
  service.register("recording", provider);

  await assert.rejects(
    () => service.getPage("home", { locale: "en" }),
    (error: unknown) => {
      assert.ok(error instanceof LocaleError);
      assert.equal(error.locale, "en");
      assert.match(error.message, /no locales are configured/);
      return true;
    }
  );
});

test("ignores a fallback-only request when no locales are configured", async () => {
  const service = new NexusContent({
    providers: { recording: { type: "test" } },
    schema: {
      models: {
        home: {
          kind: "singleton",
          source: { provider: "recording", key: "home" }
        }
      }
    }
  });
  const provider = new RecordingProvider();
  service.register("recording", provider);

  await service.getPage("home", { fallback: false });

  assert.equal(provider.lastOptions, undefined);
});

test("preserves provider locale provenance through service normalization", async () => {
  const { service, provider } = buildService();
  provider.setPage({
    id: "home",
    key: "home",
    data: {},
    meta: { source: "recording", locale: "en-ZA" }
  });

  const page = await service.getPage("home", { locale: "en-ZA" });

  assert.ok(page);
  assert.equal(page.meta.locale, "en-ZA");
});

test("rejects invalid locale configuration at construction", () => {
  assert.throws(
    () =>
      new NexusContent({
        schema: { models: {} },
        locales: { default: "fr", supported: ["en"] }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.operation, "localeConfig");
      assert.match(error.message, /must be listed in supported locales/);
      return true;
    }
  );
});
