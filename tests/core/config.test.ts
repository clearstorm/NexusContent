import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ConfigError,
  defineNexusConfig
} from "../../src/core/index.ts";
import type { NexusConfig } from "../../src/core/index.ts";

const config = {
  providers: {
    git: { type: "git" }
  },
  media: {
    default: "remote",
    providers: {
      local: { type: "local", options: { root: "../media", publicPath: "/media" } },
      remote: { type: "remote" }
    }
  },
  schema: {
    models: {
      home: {
        kind: "singleton",
        source: { provider: "git", key: "home", mode: "page" },
        fields: {
          hero: { type: "object", fields: { heading: { type: "string" } } }
        }
      },
      site: {
        kind: "settings",
        source: { provider: "git", key: "site" }
      },
      posts: {
        kind: "collection",
        source: { provider: "git", key: "posts" }
      }
    }
  }
} satisfies NexusConfig;

test("accepts a valid schema-based configuration", () => {
  const returned = defineNexusConfig(config);
  assert.equal(returned, config);
});

test("accepts a config without providers or media sections", () => {
  const minimal = defineNexusConfig({
    schema: { models: {} }
  });
  assert.deepEqual(minimal.schema.models, {});
});

test("rejects an undeclared provider reference", () => {
  assert.throws(
    () =>
      defineNexusConfig({
        providers: { git: { type: "git" } },
        schema: { models: { home: { kind: "singleton", source: { provider: "strapi", key: "home" } } } }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /strapi/);
      return true;
    }
  );
});

test("rejects a source.mode on a non-singleton model", () => {
  assert.throws(
    () =>
      defineNexusConfig({
        providers: { git: { type: "git" } },
        schema: {
          models: {
            posts: {
              kind: "collection",
              source: { provider: "git", key: "posts", mode: "page" }
            }
          }
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /source.mode/);
      return true;
    }
  );
});

test("rejects a reference field that targets a missing model", () => {
  assert.throws(
    () =>
      defineNexusConfig({
        providers: { git: { type: "git" } },
        schema: {
          models: {
            home: {
              kind: "singleton",
              source: { provider: "git", key: "home" },
              fields: {
                featured: { type: "reference", collection: "missing" }
              }
            }
          }
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /references collection "missing"/);
      return true;
    }
  );
});

test("rejects a reference field that targets a non-collection model", () => {
  assert.throws(
    () =>
      defineNexusConfig({
        providers: { git: { type: "git" } },
        schema: {
          models: {
            home: {
              kind: "singleton",
              source: { provider: "git", key: "home" }
            },
            post: {
              kind: "singleton",
              source: { provider: "git", key: "post" }
            },
            page: {
              kind: "singleton",
              source: { provider: "git", key: "page" },
              fields: { related: { type: "reference", collection: "home" } }
            }
          }
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /"home" but that model kind is/);
      return true;
    }
  );
});

test("rejects a media field whose provider is not declared", () => {
  assert.throws(
    () =>
      defineNexusConfig({
        providers: { git: { type: "git" } },
        media: { providers: { local: { type: "local", options: { root: "../media", publicPath: "/media" } } } },
        schema: {
          models: {
            home: {
              kind: "singleton",
              source: { provider: "git", key: "home" },
              fields: { logo: { type: "media", media: "cloudinary" } }
            }
          }
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /media provider "cloudinary"/);
      return true;
    }
  );
});

test("rejects an unknown field type", () => {
  assert.throws(
    () =>
      defineNexusConfig({
        providers: { git: { type: "git" } },
        schema: {
          models: {
            home: {
              kind: "singleton",
              source: { provider: "git", key: "home" },
              fields: {
                bogus: {
                  type: "icon",
                  media: "remote"
                } as unknown as import("../../src/core/index.ts").FieldSchema
              }
            }
          }
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /Invalid NexusContent configuration/);
      return true;
    }
  );
});

test("rejects a default media provider that is not declared", () => {
  assert.throws(
    () =>
      defineNexusConfig({
        providers: {},
        media: { default: "cdn", providers: { local: { type: "local", options: { root: "../media", publicPath: "/media" } } } },
        schema: { models: {} }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /"cdn"/);
      return true;
    }
  );
});