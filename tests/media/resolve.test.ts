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
import type {
  MediaAsset,
  MediaProvider,
  MediaReference
} from "../../src/index.ts";

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

class TrackingMediaProvider implements MediaProvider {
  readonly name: string;
  private readonly resolved: (reference: MediaReference & { alt?: string }) => MediaAsset | null;
  public calls: number;

  constructor(
    name: string,
    resolved: (reference: MediaReference & { alt?: string }) => MediaAsset | null
  ) {
    this.name = name;
    this.resolved = resolved;
    this.calls = 0;
  }

  async resolve(reference: MediaReference) {
    this.calls += 1;
    return this.resolved(reference);
  }
}

test("resolveFields recursively resolves every src-reference in section data", async () => {
  const registry = new MediaProviderRegistry();
  registry.register(
    "remote",
    new TrackingMediaProvider("remote", (ref) => ({
      src: `https://cdn.test/${ref.src}`,
      alt: ref.alt,
      provider: "remote"
    }))
  );
  const service = new ResolveMediaService(registry, "remote");

  const resolved = await service.resolveFields({
    hero: { image: { src: "hero.jpg", alt: "Hero" } },
    gallery: {
      images: [
        { src: "one.jpg", alt: "One" },
        { src: "two.jpg", alt: "Two" }
      ]
    },
    features: {
      items: [{ title: "A", thumbnail: { src: "t.jpg", alt: "T" } }]
    },
    heading: "Untouched"
  });

  assert.deepEqual(resolved, {
    hero: { image: { src: "https://cdn.test/hero.jpg", alt: "Hero" } },
    gallery: {
      images: [
        { src: "https://cdn.test/one.jpg", alt: "One" },
        { src: "https://cdn.test/two.jpg", alt: "Two" }
      ]
    },
    features: {
      items: [{ title: "A", thumbnail: { src: "https://cdn.test/t.jpg", alt: "T" } }]
    },
    heading: "Untouched"
  });
});

test("resolveFields keeps the authored src and alt when the provider yields no asset", async () => {
  const registry = new MediaProviderRegistry();
  registry.register("remote", new TrackingMediaProvider("remote", () => null));
  const service = new ResolveMediaService(registry, "remote");

  const resolved = await service.resolveFields({
    cta: { background_image: { src: "bg.jpg", alt: "Backdrop" } }
  } as Record<string, unknown>);

  assert.deepEqual(resolved, {
    cta: { background_image: { src: "bg.jpg", alt: "Backdrop" } }
  });
});

test("resolveFields falls back to the authored alt when the asset has none", async () => {
  const registry = new MediaProviderRegistry();
  registry.register(
    "remote",
    new TrackingMediaProvider("remote", (ref) => ({
      src: `https://cdn.test/${ref.src}`
    }))
  );
  const service = new ResolveMediaService(registry, "remote");

  const resolved = await service.resolveFields({ image: { src: "x.jpg", alt: "Kept" } });

  assert.deepEqual(resolved, { image: { src: "https://cdn.test/x.jpg", alt: "Kept" } });
});

test("resolveFields passes non-media data, arrays, and nulls through unchanged", async () => {
  const registry = new MediaProviderRegistry();
  registry.register("remote", new TrackingMediaProvider("remote", () => null));
  const service = new ResolveMediaService(registry, "remote");

  const value = {
    heading: "Hi",
    points: ["a", "b"],
    id: "a-b-c",
    nested: { count: 2, flag: true },
    empty: null,
    list: null
  };
  assert.deepEqual(await service.resolveFields(value), value);
  assert.equal(await service.resolveFields(undefined), undefined);
  assert.equal(await service.resolveFields(null), null);
  assert.equal(await service.resolveFields("plain"), "plain");
  assert.deepEqual(await service.resolveFields(["x", 2, false]), ["x", 2, false]);
});

test("resolveFields honors the field-level defaultProvider override", async () => {
  const registry = new MediaProviderRegistry();
  registry.register("a", new TrackingMediaProvider("a", (ref) => ({ src: `a/${ref.src}` })));
  registry.register("b", new TrackingMediaProvider("b", (ref) => ({ src: `b/${ref.src}` })));
  const service = new ResolveMediaService(registry, "a");

  const resolved = await service.resolveFields(
    { image: { src: "x.jpg" } },
    { defaultProvider: "b" }
  );
  const image = resolved as { image: { src: string } };

  assert.equal(image.image.src, "b/x.jpg");
});

test("resolveFields propagates provider resolution errors", async () => {
  const service = new ResolveMediaService(new MediaProviderRegistry());

  await assert.rejects(
    () => service.resolveFields({ image: { src: "x.jpg" } }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match((error as ConfigError).message, /No media provider is configured/);
      return true;
    }
  );
});