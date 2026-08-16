import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ConfigError,
  resolveContentConfig,
  resolveNavigationConfig,
  resolveSettingsConfig
} from "../../src/core/index.ts";
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
  },
  navigation: {
    primary: { provider: "git", key: "primary" }
  },
  settings: {
    site: { provider: "strapi", key: "site" }
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

test("resolves navigation from the dedicated configuration section", () => {
  const entry = resolveNavigationConfig(config, "primary");

  assert.deepEqual(entry, { provider: "git", key: "primary" });
});

test("resolves settings from the dedicated configuration section", () => {
  const entry = resolveSettingsConfig(config, "site");

  assert.deepEqual(entry, { provider: "strapi", key: "site" });
});

test("throws a ConfigError for missing navigation names", () => {
  assert.throws(
    () => resolveNavigationConfig(config, "footer"),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.content, "footer");
      assert.equal(error.operation, "resolveNavigation");
      assert.match(error.message, /Navigation/);
      assert.match(error.message, /primary/);
      return true;
    }
  );
});

test("throws a ConfigError when the navigation section is absent", () => {
  const withoutNavigation: NexusConfig = { content: {} };

  assert.throws(
    () => resolveNavigationConfig(withoutNavigation, "primary"),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.operation, "resolveNavigation");
      assert.match(error.message, /Navigation "primary" is not configured/);
      return true;
    }
  );
});

test("throws a ConfigError for missing settings names", () => {
  assert.throws(
    () => resolveSettingsConfig(config, "theme"),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.content, "theme");
      assert.equal(error.operation, "resolveSettings");
      assert.match(error.message, /Settings/);
      assert.match(error.message, /site/);
      return true;
    }
  );
});

test("throws a ConfigError for malformed settings entries", () => {
  const bad: NexusConfig = {
    content: {},
    settings: { site: { provider: "git", key: "" } }
  };

  assert.throws(
    () => resolveSettingsConfig(bad, "site"),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.operation, "resolveSettings");
      assert.match(error.message, /key/);
      return true;
    }
  );
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
