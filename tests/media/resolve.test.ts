import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ConfigError,
  MediaProviderRegistry,
  NexusContent,
  ProviderError,
  RegistryError,
  ResolveMediaService,
  defineLocalMediaProvider,
  defineRemoteMediaProvider
} from "../../src/index.ts";
import type { MediaProvider } from "../../src/index.ts";

test("local provider maps root-relative src to the public path", async () => {
  const provider = defineLocalMediaProvider({
    root: "/srv/content/media",
    publicPath: "/media/",
    name: "local"
  });

  const asset = await provider.resolve({
    id: "logo",
    src: "images/logo.png"
  });

  assert.ok(asset);
  assert.equal(asset.src, "/media/images/logo.png");
  assert.equal(asset.provider, "local");
  assert.equal(asset.sourceId, "images/logo.png");
  assert.equal(asset.id, "logo");
});

test("local provider resolves directory-relative paths", async () => {
  const provider = defineLocalMediaProvider({
    root: "/srv/content/media",
    publicPath: "/media"
  });
  const asset = await provider.resolve({ src: "post-1/cover.jpg" });
  assert.ok(asset);
  assert.equal(asset.src, "/media/post-1/cover.jpg");
});

test("local provider returns null for src-less references", async () => {
  const provider = defineLocalMediaProvider({
    root: "/srv/content/media",
    publicPath: "/media"
  });
  assert.equal(await provider.resolve({ id: "logo" }), null);
});

test("local provider blocks path traversal", async () => {
  const provider = defineLocalMediaProvider({
    root: "/srv/content/media",
    publicPath: "/media"
  });

  await assert.rejects(
    () => provider.resolve({ src: "../../../etc/passwd" }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match((error as ProviderError).message, /escapes the configured media root/i);
      return true;
    }
  );

  await assert.rejects(
    () => provider.resolve({ src: "/etc/passwd" }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      return true;
    }
  );
});

test("local provider rejects missing root or publicPath", () => {
  assert.throws(() =>
    defineLocalMediaProvider({ root: "", publicPath: "/media" })
  );
  assert.throws(() =>
    defineLocalMediaProvider({ root: "/media", publicPath: "" })
  );
  assert.throws(() =>
    defineLocalMediaProvider({ root: "/media", publicPath: "media" })
  );
});

test("remote provider passes absolute http(s) URLs through unchanged", async () => {
  const provider = defineRemoteMediaProvider({ name: "remote" });

  const asset = await provider.resolve({
    id: "9",
    src: "https://cdn.example.com/image.jpg"
  });

  assert.ok(asset);
  assert.equal(asset.src, "https://cdn.example.com/image.jpg");
  assert.equal(asset.provider, "remote");
  assert.equal(asset.sourceId, "https://cdn.example.com/image.jpg");
});

test("remote provider rejects non-http(s) or malformed URLs", async () => {
  const provider = defineRemoteMediaProvider();

  await assert.rejects(
    () => provider.resolve({ src: "ftp://cdn.example.com/x.jpg" }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match((error as ProviderError).message, /http or https/);
      return true;
    }
  );
  await assert.rejects(
    () => provider.resolve({ src: "not a url" }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      return true;
    }
  );
});

test("media registry rejects duplicate names", () => {
  const registry = new MediaProviderRegistry();
  const provider = defineRemoteMediaProvider({ name: "remote" });
  registry.register("remote", provider);
  assert.throws(
    () => registry.register("remote", provider),
    (error: unknown) => {
      assert.ok(error instanceof RegistryError);
      assert.match((error as RegistryError).message, /already registered/);
      return true;
    }
  );
});

test("media registry rejects name mismatches", () => {
  const registry = new MediaProviderRegistry();
  const provider = defineRemoteMediaProvider({ name: "another" });
  assert.throws(
    () => registry.register("remote", provider),
    (error: unknown) => {
      assert.ok(error instanceof RegistryError);
      assert.match((error as RegistryError).message, /name mismatch/);
      return true;
    }
  );
});

class StaticMediaProvider implements MediaProvider {
  readonly name: string;
  private readonly asset: { id: string; src: string };

  constructor(name: string, id: string, src: string) {
    this.name = name;
    this.asset = { id, src };
  }

  async resolve() {
    return { ...this.asset, provider: this.name, sourceId: this.asset.id };
  }
}

test("resolve service selects reference.provider over field and project defaults", async () => {
  const registry = new MediaProviderRegistry();
  registry.register("a", new StaticMediaProvider("a", "1", "https://a.test/x"));
  registry.register("b", new StaticMediaProvider("b", "2", "https://b.test/x"));

  const service = new ResolveMediaService(registry, "b");
  const asset = await service.resolve(
    { id: "1", src: "x", provider: "a" },
    { defaultProvider: "b" }
  );

  assert.equal(asset?.provider, "a");
  assert.equal(asset?.src, "https://a.test/x");
});

test("resolve service prefers the field override over the project default", async () => {
  const registry = new MediaProviderRegistry();
  registry.register("a", new StaticMediaProvider("a", "1", "https://a.test/x"));
  registry.register("b", new StaticMediaProvider("b", "2", "https://b.test/x"));

  const service = new ResolveMediaService(registry, "b");
  const asset = await service.resolve({ id: "1", src: "x" }, { defaultProvider: "a" });

  assert.equal(asset?.provider, "a");
});

test("resolve service falls back to the project default", async () => {
  const registry = new MediaProviderRegistry();
  registry.register("b", new StaticMediaProvider("b", "2", "https://b.test/x"));

  const service = new ResolveMediaService(registry, "b");
  const asset = await service.resolve({ id: "2", src: "x" });

  assert.equal(asset?.provider, "b");
});

test("resolve service throws a ConfigError when no provider is available", async () => {
  const service = new ResolveMediaService(new MediaProviderRegistry());

  await assert.rejects(
    () => service.resolve({ id: "1", src: "x" }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match((error as ConfigError).message, /No media provider is configured/);
      return true;
    }
  );
});

test("resolve service rejects invalid or empty references", async () => {
  const service = new ResolveMediaService(new MediaProviderRegistry());

  await assert.rejects(
    () => service.resolve({} as never),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match((error as ConfigError).message, /id or a src/);
      return true;
    }
  );
});

test("NexusContent auto-wires declared local and remote media providers", async () => {
  const nexus = new NexusContent({
    providers: { git: { type: "git" } },
    media: {
      default: "remote",
      providers: {
        local: {
          type: "local",
          options: { root: "/srv/media", publicPath: "/media" }
        },
        remote: { type: "remote" }
      }
    },
    schema: {
      models: {
        home: {
          kind: "singleton",
          source: { provider: "git", key: "home" }
        }
      }
    }
  });

  const local = await nexus.media.resolve(
    { id: "logo", src: "images/logo.png" },
    { defaultProvider: "local" }
  );
  assert.equal(local?.src, "/media/images/logo.png");
  assert.equal(local?.provider, "local");

  const remote = await nexus.media.resolve({
    id: "9",
    src: "https://cdn.example.com/i.jpg"
  });
  assert.equal(remote?.src, "https://cdn.example.com/i.jpg");
  assert.equal(remote?.provider, "remote");
});

test("rejects a declared default media provider that is not registered", () => {
  assert.throws(
    () =>
      new NexusContent({
        providers: {},
        media: {
          default: "cdn",
          providers: {
            local: { type: "local", options: { root: "/srv/media", publicPath: "/media" } }
          }
        },
        schema: { models: {} }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match((error as ConfigError).message, /cdn/);
      return true;
    }
  );
});