import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jsonFormatAdapter
} from "../../src/formats/index.ts";
import { ProviderError, NexusContentError } from "../../src/core/errors.ts";

test("parses a valid JSON object with nested structures", () => {
  const result = jsonFormatAdapter.parse(
    `{ "hero": { "heading": "Hello" }, "items": [1, 2, 3] }`
  );

  assert.deepEqual(result, {
    hero: { heading: "Hello" },
    items: [1, 2, 3]
  });
});

test("parses an empty object", () => {
  assert.deepEqual(jsonFormatAdapter.parse("{}"), {});
});

test("parses an empty array", () => {
  assert.deepEqual(jsonFormatAdapter.parse("[]"), []);
});

test("parses Unicode content", () => {
  assert.deepEqual(
    jsonFormatAdapter.parse(`{ "title": "Héllo — 你好" }`),
    { title: "Héllo — 你好" }
  );
});

test("rejects malformed JSON", () => {
  assert.throws(
    () => jsonFormatAdapter.parse(`{ "title": "broken",,`),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.ok(error instanceof NexusContentError);
      assert.match(error.message, /malformed JSON/);
      assert.match(error.reason ?? "", /JSON|position/i);
      return true;
    }
  );
});

test("includes the file path in malformed JSON errors when context provides it", () => {
  assert.throws(
    () =>
      jsonFormatAdapter.parse(`{ broken`, {
        filePath: "pages/about.json",
        provider: "git",
        operation: "load"
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match(error.message, /pages\/about\.json/);
      assert.equal(error.provider, "git");
      assert.equal(error.operation, "load");
      assert.equal(error.content, "pages/about.json");
      return true;
    }
  );
});

test("serializes and round-trips a value", () => {
  const value = { hero: { heading: "Hello" }, items: [1, 2, 3] };
  const output = jsonFormatAdapter.serialize(value);
  const parsed = jsonFormatAdapter.parse(output);

  assert.deepEqual(parsed, value);
});

test("serializes with two space indentation and a trailing newline", () => {
  const output = jsonFormatAdapter.serialize({ a: 1, b: { c: true } });

  assert.equal(output, `{\n  "a": 1,\n  "b": {\n    "c": true\n  }\n}\n`);
});

test("exposes its id and supported extensions", () => {
  assert.equal(jsonFormatAdapter.id, "json");
  assert.deepEqual(jsonFormatAdapter.extensions, [".json"]);
});

test("rejects values that cannot be serialized", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;

  assert.throws(
    () =>
      jsonFormatAdapter.serialize(cyclic, {
        filePath: "pages/cyclic.json",
        provider: "git",
        operation: "save"
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match(error.message, /pages\/cyclic\.json/);
      assert.match(error.reason ?? "", /circular/i);
      return true;
    }
  );
});
