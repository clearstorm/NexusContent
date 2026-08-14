import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfigError, resolveContentConfig } from "../../src/core/index.ts";
import type { NexusConfig } from "../../src/core/index.ts";

const config: NexusConfig = {
  providers: {
    git: { type: "git" },
    strapi: { type: "strapi" }
  },
  content: {
    home: { provider: "git", key: "home" },
    about: { provider: "git", key: "about" },
    services: { provider: "strapi", key: "services" }
  }
};

test("resolves a content name to its provider configuration", () => {
  const entry = resolveContentConfig(config, "about");

  assert.deepEqual(entry, { provider: "git", key: "about" });
});

test("resolves content that uses a different provider", () => {
  const entry = resolveContentConfig(config, "services");

  assert.deepEqual(entry, { provider: "strapi", key: "services" });
});

test("throws a ConfigError for missing content names", () => {
  assert.throws(
    () => resolveContentConfig(config, "missing"),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.content, "missing");
      assert.equal(error.operation, "resolve");
      assert.match(error.message, /"missing"/);
      assert.match(error.message, /home, about, services/);
      return true;
    }
  );
});

test("throws a ConfigError when the entry has no provider", () => {
  const bad: NexusConfig = {
    content: { home: { provider: "", key: "home" } }
  };

  assert.throws(
    () => resolveContentConfig(bad, "home"),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /provider/);
      return true;
    }
  );
});

test("throws a ConfigError when the entry has no key", () => {
  const bad: NexusConfig = {
    content: { home: { provider: "git", key: "" } }
  };

  assert.throws(
    () => resolveContentConfig(bad, "home"),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /key/);
      return true;
    }
  );
});
