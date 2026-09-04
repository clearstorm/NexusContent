import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ConfigError,
  ModelRegistry,
  SchemaError
} from "../../src/core/index.ts";
import type { NexusConfig, SchemaError as SchemaErrorType } from "../../src/core/index.ts";

function buildConfig(): NexusConfig {
  return {
    providers: { mock: { type: "test" } },
    media: {
      default: "remote",
      providers: { remote: { type: "remote" } }
    },
    schema: {
      models: {
        about: {
          kind: "singleton",
          source: { provider: "mock", key: "about" },
          fields: {
            headline: { type: "string" },
            headlineRequired: { type: "string", required: true },
            count: { type: "number" },
            flag: { type: "boolean" },
            publishedAt: { type: "datetime" },
            state: { type: "string", options: ["draft", "live"] },
            body: { type: "richText" },
            highlights: { type: "string", list: true },
            hero: {
              type: "object",
              fields: {
                heading: { type: "string" },
                intro: { type: "string" }
              }
            },
            related: { type: "reference", collection: "posts" },
            featuredMedia: { type: "media", media: "remote" }
          }
        },
        posts: {
          kind: "collection",
          source: { provider: "mock", key: "posts" },
          fields: { title: { type: "string" } }
        }
      }
    }
  };
}

function buildRegistry() {
  const config = buildConfig();
  const registry = new ModelRegistry(
    config.schema,
    Object.keys(config.providers ?? {}),
    Object.keys(config.media?.providers ?? {})
  );
  return { registry, config };
}

test("accepts content that matches the declared schema", () => {
  const { registry } = buildRegistry();
  const data = {
    headline: "Welcome",
    headlineRequired: "Hi",
    count: 2,
    flag: true,
    publishedAt: "2026-08-01T00:00:00Z",
    state: "live",
    body: "<p>Rich text</p>",
    highlights: ["a", "b"],
    hero: { heading: "H", intro: "I", extra: "kept" },
    related: { model: "posts", key: "one" },
    featuredMedia: { id: "9", src: "https://example.com/i.jpg" },
    unknownField: { anything: true }
  };
  assert.doesNotThrow(() =>
    registry.validateData("about", data, { provider: "mock" })
  );
});

test("preserves unknown fields not declared in the model", () => {
  const { registry } = buildRegistry();
  const data = { headlineRequired: "Hi", unknownNested: { keep: 1 } };
  assert.doesNotThrow(() =>
    registry.validateData("about", data, { provider: "mock" })
  );
});

test("throws a SchemaError for a wrong field type", () => {
  const { registry } = buildRegistry();
  assert.throws(
    () =>
      registry.validateData("about", { count: "two", headlineRequired: "Hi" }, { provider: "mock" }),
    (error: unknown) => {
      assert.ok(error instanceof SchemaError);
      const schemaError = error as SchemaErrorType;
      assert.equal(schemaError.model, "about");
      assert.ok(
        schemaError.issues.some((issue) => issue.path === "count")
      );
      assert.equal(schemaError.provider, "mock");
      return true;
    }
  );
});

test("throws a SchemaError when a required field is missing", () => {
  const { registry } = buildRegistry();
  assert.throws(
    () => registry.validateData("about", { headline: "no required" }, { provider: "mock" }),
    (error: unknown) => {
      assert.ok(error instanceof SchemaError);
      assert.ok(
        (error as SchemaErrorType).issues.some(
          (issue) => issue.path === "headlineRequired"
        )
      );
      return true;
    }
  );
});

test("validates nested object fields", () => {
  const { registry } = buildRegistry();
  assert.throws(
    () =>
      registry.validateData(
        "about",
        { hero: { heading: 42 }, headlineRequired: "Hi" },
        { provider: "mock" }
      ),
    (error: unknown) => {
      assert.ok(
        (error as SchemaErrorType).issues.some(
          (issue) => issue.path === "hero.heading"
        )
      );
      return true;
    }
  );
});

test("validates list fields as arrays of the inner type", () => {
  const { registry } = buildRegistry();
  assert.throws(
    () =>
      registry.validateData(
        "about",
        { highlights: ["ok", 7], headlineRequired: "Hi" },
        { provider: "mock" }
      ),
    (error: unknown) => {
      assert.ok(
        (error as SchemaErrorType).issues.some(
          (issue) => issue.path.includes("highlights")
        )
      );
      return true;
    }
  );
});

test("enforces string option enumerations", () => {
  const { registry } = buildRegistry();
  assert.throws(
    () =>
      registry.validateData(
        "about",
        { state: "archived", headlineRequired: "Hi" },
        { provider: "mock" }
      ),
    (error: unknown) => {
      assert.ok((error as SchemaErrorType).issues.length > 0);
      return true;
    }
  );
});

test("stamps the declared media provider onto bare media references", () => {
  const { registry } = buildRegistry();
  const data = {
    headlineRequired: "Hi",
    featuredMedia: { id: "9", src: "https://example.com/i.jpg" }
  };

  const parsed = registry.validateData("about", data, { provider: "mock" }) as {
    featuredMedia: { provider?: string };
  };
  assert.equal(parsed.featuredMedia.provider, "remote");
});

test("rejects a media reference with neither id nor src", () => {
  const { registry } = buildRegistry();
  assert.throws(
    () =>
      registry.validateData(
        "about",
        { headlineRequired: "Hi", featuredMedia: { alt: "no id or src" } },
        { provider: "mock" }
      ),
    (error: unknown) => {
      assert.ok((error as SchemaErrorType).issues.length > 0);
      return true;
    }
  );
});

test("requires reference values to be object model/key pairs", () => {
  const { registry } = buildRegistry();
  assert.throws(
    () =>
      registry.validateData(
        "about",
        { headlineRequired: "Hi", related: "posts/one" },
        { provider: "mock" }
      ),
    (error: unknown) => {
      assert.ok((error as SchemaErrorType).issues.length > 0);
      return true;
    }
  );
});

test("does not validate models without a field schema", () => {
  const registry = new ModelRegistry(
    { models: { raw: { kind: "singleton", source: { provider: "mock", key: "raw" } } } },
    ["mock"],
    []
  );
  assert.doesNotThrow(() =>
    registry.validateData("raw", { any: ["thing", 1] }, { provider: "mock" })
  );
});

test("rejects models with no declared fields when a validator exists", () => {
  const { registry } = buildRegistry();
  assert.throws(
    () => registry.validateData("about", null, { provider: "mock" }),
    (error: unknown) => {
      assert.ok(
        (error as SchemaErrorType).issues.some((issue) => issue.path === "<root>")
      );
      return true;
    }
  );
});

test("validateModelRelations rejects unknown media providers on media fields", () => {
  assert.throws(
    () =>
      new ModelRegistry(
        {
          models: {
            about: {
              kind: "singleton",
              source: { provider: "mock", key: "about" },
              fields: { logo: { type: "media", media: "cloudinary" } }
            }
          }
        },
        ["mock"],
        ["remote"]
      ),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /media provider "cloudinary"/);
      return true;
    }
  );
});

test("validateModelRelations rejects references to missing collections", () => {
  assert.throws(
    () =>
      new ModelRegistry(
        {
          models: {
            about: {
              kind: "singleton",
              source: { provider: "mock", key: "about" },
              fields: { related: { type: "reference", collection: "ghosts" } }
            }
          }
        },
        ["mock"],
        []
      ),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /"ghosts" which does not exist/);
      return true;
    }
  );
});

test("validates data matching component and blocks schemas", () => {
  const registry = new ModelRegistry(
    {
      components: {
        hero: {
          fields: {
            heading: { type: "string", required: true }
          }
        }
      },
      models: {
        home: {
          kind: "singleton",
          source: { provider: "mock", key: "home" },
          fields: {
            header: { type: "component", component: "hero" },
            layout: { type: "blocks", list: true, allowedComponents: ["hero"] }
          }
        }
      }
    },
    ["mock"],
    []
  );

  const valid = registry.validateData(
    "home",
    {
      header: { heading: "Welcome" },
      layout: [{ _type: "hero", heading: "Block Heading" }]
    },
    { provider: "mock" }
  );

  assert.equal((valid as any).header.heading, "Welcome");
  assert.equal((valid as any).layout[0]._type, "hero");
});

test("expandSectionsToComponents maps sections to declared component fields by type", () => {
  const registry = new ModelRegistry(
    {
      components: {
        hero: { fields: { heading: { type: "string", required: true } } }
      },
      models: {
        page: {
          kind: "singleton",
          source: { provider: "mock", key: "page" },
          fields: {
            mainHero: { type: "component", component: "hero" }
          }
        }
      }
    },
    ["mock"],
    []
  );

  const expanded = registry.expandSectionsToComponents("page", {
    sections: [{ type: "hero", data: { heading: "Hello" } }]
  }) as Record<string, unknown>;

  assert.deepEqual(expanded.mainHero, { heading: "Hello" });
  assert.equal("sections" in expanded, false);
});

test("expandSectionsToComponents keeps unmatched sections by default", () => {
  const registry = new ModelRegistry(
    {
      components: {
        hero: { fields: { heading: { type: "string", required: true } } }
      },
      models: {
        page: {
          kind: "singleton",
          source: { provider: "mock", key: "page" },
          fields: {
            hero: { type: "component", component: "hero" }
          }
        }
      }
    },
    ["mock"],
    []
  );

  const expanded = registry.expandSectionsToComponents("page", {
    sections: [
      { type: "hero", data: { heading: "Hello" } },
      { type: "gallery", data: { images: [] } }
    ]
  }) as Record<string, unknown>;

  assert.deepEqual(expanded.hero, { heading: "Hello" });
  assert.deepEqual(expanded.sections, [{ type: "gallery", data: { images: [] } }]);
});

test("expandSectionsToComponents throws for unmatched sections when strictSections is set", () => {
  const registry = new ModelRegistry(
    {
      components: {
        hero: { fields: { heading: { type: "string", required: true } } }
      },
      models: {
        page: {
          kind: "singleton",
          source: { provider: "mock", key: "page" },
          strictSections: true,
          fields: {
            hero: { type: "component", component: "hero" }
          }
        }
      }
    },
    ["mock"],
    []
  );

  assert.throws(
    () =>
      registry.expandSectionsToComponents("page", {
        sections: [
          { type: "hero", data: { heading: "Hello" } },
          { type: "gallery", data: {} }
        ]
      }),
    (error: unknown) => {
      assert.ok(error instanceof SchemaError);
      assert.equal((error as SchemaErrorType).model, "page");
      assert.match((error as SchemaErrorType).reason ?? "", /gallery/);
      return true;
    }
  );
});

test("expandSectionsToComponents leaves models with no component fields untouched", () => {
  const registry = new ModelRegistry(
    {
      models: {
        page: {
          kind: "singleton",
          source: { provider: "mock", key: "page" },
          fields: {
            title: { type: "string" }
          }
        }
      }
    },
    ["mock"],
    []
  );

  const input = { sections: [{ type: "hero", data: {} }] };
  const expanded = registry.expandSectionsToComponents("page", input);

  assert.equal(expanded, input);
});

test("expandSectionsToComponents leaves models that declare their own sections field untouched", () => {
  const registry = new ModelRegistry(
    {
      components: {
        hero: { fields: { heading: { type: "string", required: true } } }
      },
      models: {
        page: {
          kind: "singleton",
          source: { provider: "mock", key: "page" },
          fields: {
            hero: { type: "component", component: "hero" },
            sections: {
              type: "object",
              list: true,
              fields: { type: { type: "string" }, data: { type: "object" } }
            }
          }
        }
      }
    },
    ["mock"],
    []
  );

  const input = {
    sections: [{ type: "hero", data: { heading: "Hello" } }]
  };
  const expanded = registry.expandSectionsToComponents("page", input);

  assert.equal(expanded, input);
});
