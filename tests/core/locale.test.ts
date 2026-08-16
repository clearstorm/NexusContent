import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ConfigError,
  LocaleResolver,
  UnsupportedLocaleError
} from "../../src/core/index.ts";

test("resolves the configured default locale when none is requested", () => {
  const resolver = new LocaleResolver({
    default: "en",
    supported: ["en", "en-ZA", "zu-ZA"]
  });

  const resolution = resolver.resolve();

  assert.equal(resolution.requested, "en");
  assert.deepEqual(resolution.chain, ["en"]);
  assert.equal(resolution.strict, false);
});

test("resolves an explicitly requested locale", () => {
  const resolver = new LocaleResolver({
    default: "en",
    supported: ["en", "en-ZA"]
  });

  const resolution = resolver.resolve("en-ZA");

  assert.equal(resolution.requested, "en-ZA");
  assert.deepEqual(resolution.chain, ["en-ZA", "en"]);
  assert.equal(resolution.strict, false);
});

test("falls back to a single locale legacy behaviour without configuration", () => {
  const resolver = new LocaleResolver();

  assert.equal(resolver.defaultLocale, "en");
  assert.deepEqual(resolver.supportedLocales, ["en"]);
  assert.deepEqual(resolver.resolve().chain, ["en"]);
});

test("rejects a locale that is not supported", () => {
  const resolver = new LocaleResolver({
    default: "en",
    supported: ["en", "en-ZA"]
  });

  assert.throws(
    () => resolver.resolve("fr"),
    (error: unknown) => {
      assert.ok(error instanceof UnsupportedLocaleError);
      assert.equal(error.locale, "fr");
      assert.deepEqual(error.supportedLocales, ["en", "en-ZA"]);
      assert.match(error.message, /"fr"/);
      return true;
    }
  );
});

test("builds an explicit multi-step fallback chain", () => {
  const resolver = new LocaleResolver({
    default: "en",
    supported: ["en", "en-ZA", "zu-ZA", "af"],
    fallback: { "en-ZA": "af", af: "zu-ZA" }
  });

  const resolution = resolver.resolve("en-ZA");

  assert.deepEqual(resolution.chain, ["en-ZA", "af", "zu-ZA", "en"]);
});

test("implicitly falls back to the default locale when no entry exists", () => {
  const resolver = new LocaleResolver({
    default: "en",
    supported: ["en", "zu-ZA"]
  });

  const resolution = resolver.resolve("zu-ZA");

  assert.deepEqual(resolution.chain, ["zu-ZA", "en"]);
});

test("stops the chain at an explicit null fallback", () => {
  const resolver = new LocaleResolver({
    default: "en",
    supported: ["en", "en-ZA"],
    fallback: { "en-ZA": null }
  });

  const resolution = resolver.resolve("en-ZA");

  assert.deepEqual(resolution.chain, ["en-ZA"]);
  assert.equal(resolution.strict, false);
});

test("does not fall back from the default locale", () => {
  const resolver = new LocaleResolver({
    default: "en",
    supported: ["en", "en-ZA"]
  });

  assert.deepEqual(resolver.resolve("en").chain, ["en"]);
});

test("disables fallback and marks strict when fallback is disabled", () => {
  const resolver = new LocaleResolver({
    default: "en",
    supported: ["en", "en-ZA", "zu-ZA"],
    fallback: { "en-ZA": "zu-ZA" }
  });

  const resolution = resolver.resolve("en-ZA", false);

  assert.deepEqual(resolution.chain, ["en-ZA"]);
  assert.equal(resolution.strict, true);
});

test("rejects configuration whose default is missing from supported", () => {
  assert.throws(
    () =>
      new LocaleResolver({
        default: "fr",
        supported: ["en"]
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /must be listed in supported locales/);
      return true;
    }
  );
});

test("rejects duplicate supported locales", () => {
  assert.throws(
    () =>
      new LocaleResolver({
        default: "en",
        supported: ["en", "en"]
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /more than once/);
      return true;
    }
  );
});

test("rejects an invalid locale tag", () => {
  assert.throws(
    () =>
      new LocaleResolver({
        default: "en",
        supported: ["en", "en_ZA"]
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /Invalid locale tag/);
      return true;
    }
  );
});

test("rejects an empty supported list", () => {
  assert.throws(
    () =>
      new LocaleResolver({
        default: "en",
        supported: []
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /non-empty supported list/);
      return true;
    }
  );
});

test("rejects a fallback source that is not supported", () => {
  assert.throws(
    () =>
      new LocaleResolver({
        default: "en",
        supported: ["en"],
        fallback: { fr: null }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /source locale "fr" is not supported/);
      return true;
    }
  );
});

test("rejects a fallback target that is not supported", () => {
  assert.throws(
    () =>
      new LocaleResolver({
        default: "en",
        supported: ["en"],
        fallback: { en: "fr" }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /target locale "fr" is not supported/);
      return true;
    }
  );
});

test("rejects a circular fallback chain", () => {
  assert.throws(
    () =>
      new LocaleResolver({
        default: "en",
        supported: ["en", "en-ZA", "zu-ZA", "af"],
        fallback: { "en-ZA": "af", af: "en-ZA" }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /contains a cycle/);
      assert.ok(error.chain && error.chain.length > 0);
      return true;
    }
  );
});

test("rejects a fallback cycle that returns through the default locale", () => {
  assert.throws(
    () =>
      new LocaleResolver({
        default: "en",
        supported: ["en", "en-ZA"],
        fallback: { en: "en-ZA" }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /contains a cycle/);
      return true;
    }
  );
});
