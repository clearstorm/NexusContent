import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ProviderRegistry,
  RegistryError,
  NexusContentError
} from "../../src/core/index.ts";
import type { ContentProvider } from "../../src/core/index.ts";

class StubProvider implements ContentProvider {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async getPage() {
    return null;
  }

  async getSingleton() {
    return null;
  }

  async getNavigation() {
    return null;
  }

  async getSettings() {
    return null;
  }

  async getCollection() {
    return [];
  }

  async getItem() {
    return null;
  }
}

test("registers and returns a provider", () => {
  const registry = new ProviderRegistry();
  const provider = new StubProvider("git");

  registry.register("git", provider);

  assert.equal(registry.get("git"), provider);
  assert.equal(registry.has("git"), true);
});

test("lists registered providers", () => {
  const registry = new ProviderRegistry();
  registry.register("git", new StubProvider("git"));
  registry.register("wordpress", new StubProvider("wordpress"));

  assert.deepEqual(registry.names().sort(), ["git", "wordpress"]);
  assert.equal(registry.list().length, 2);
});

test("throws a RegistryError on duplicate registration", () => {
  const registry = new ProviderRegistry();
  registry.register("git", new StubProvider("git"));

  assert.throws(
    () => registry.register("git", new StubProvider("git")),
    (error: unknown) => {
      assert.ok(error instanceof RegistryError);
      assert.ok(error instanceof NexusContentError);
      assert.equal(error.provider, "git");
      assert.match(error.message, /already registered/);
      return true;
    }
  );
});

test("throws a RegistryError when the provider name does not match", () => {
  const registry = new ProviderRegistry();

  assert.throws(
    () => registry.register("git", new StubProvider("wordpress")),
    (error: unknown) => {
      assert.ok(error instanceof RegistryError);
      assert.match(error.message, /name mismatch/);
      return true;
    }
  );
});

test("throws a RegistryError when retrieving a missing provider", () => {
  const registry = new ProviderRegistry();

  assert.throws(
    () => registry.get("missing"),
    (error: unknown) => {
      assert.ok(error instanceof RegistryError);
      assert.equal(error.provider, "missing");
      assert.equal(error.operation, "resolve");
      assert.match(error.message, /not registered/);
      return true;
    }
  );
});

test("has returns false for unregistered providers", () => {
  const registry = new ProviderRegistry();
  assert.equal(registry.has("missing"), false);
});
