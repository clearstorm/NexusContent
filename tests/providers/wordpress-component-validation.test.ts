import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ProviderError,
  WordPressProvider,
  buildSectionRegistry,
  validateWordPressComponents,
  type ComponentSchema
} from "../../src/index.ts";

const registry = buildSectionRegistry();

const components: Record<string, ComponentSchema> = {
  hero: {
    fields: {
      eyebrow: { type: "string" },
      heading: { type: "string", required: true },
      body: { type: "richText", required: true },
      image: { type: "media" },
      buttons: {
        type: "object",
        list: true,
        fields: {
          label: { type: "string" },
          url: { type: "string" },
          variant: { type: "string" }
        }
      }
    }
  },
  servicesList: {
    fields: {
      heading: { type: "string", required: true },
      items: { type: "object", list: true, required: true, fields: {} }
    }
  },
  madeUp: {
    fields: {
      heading: { type: "string" }
    }
  }
};

function makeProvider(
  options: Omit<ConstructorParameters<typeof WordPressProvider>[0], "baseUrl"> = {}
): WordPressProvider {
  return new WordPressProvider({ baseUrl: "https://example.com/wp-json/wp/v2", ...options });
}

test("validateWordPressComponents resolves canonical names against the registry", () => {
  const result = validateWordPressComponents({ hero: components["hero"]! }, { registry });
  assert.equal(result.unknownComponents.length, 0);
  assert.equal(result.components[0]?.source, "registry");
  assert.equal(result.components[0]?.sectionType, "hero");
});

test("validateWordPressComponents reports unknown components as hard errors", () => {
  const result = validateWordPressComponents(
    { madeUp: components["madeUp"]! },
    { registry }
  );
  assert.deepEqual(result.unknownComponents, ["madeUp"]);
});

test("validateWordPressComponents reports canonical field deltas", () => {
  const result = validateWordPressComponents(
    { hero: { fields: { headline: { type: "string", required: true } } } },
    { registry }
  );
  assert.equal(result.fieldDeltas.length, 1);
  const delta = result.fieldDeltas[0]!;
  assert.equal(delta.component, "hero");
  assert.ok(delta.missingFields.length > 0, "expected missing canonical fields");
  assert.deepEqual(delta.extraFields, ["headline"]);
});

test("componentTypeMap bridges consumer names to canonical section types", () => {
  const result = validateWordPressComponents(
    { servicesList: components["servicesList"]! },
    { registry, componentTypeMap: { servicesList: "features" } }
  );
  assert.equal(result.unknownComponents.length, 0);
  assert.equal(result.components[0]?.source, "mapped");
  assert.equal(result.components[0]?.sectionType, "features");
});

test("provider.validateComponents throws on unknown components", () => {
  const wp = makeProvider();
  assert.throws(
    () => wp.validateComponents({ madeUp: components["madeUp"]! }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match(error.reason ?? "", /madeUp/);
      return true;
    }
  );
});

test("provider.validateComponents accepts resolvable components", () => {
  const wp = makeProvider({ componentTypeMap: { servicesList: "features" } });
  const result = wp.validateComponents({
    servicesList: components["servicesList"]!,
    hero: components["hero"]!
  });
  assert.equal(result.unknownComponents.length, 0);
});

test("strictFields promotes field deltas to a hard error", () => {
  const wp = makeProvider({ strictFields: true });
  assert.throws(
    () => wp.validateComponents({ hero: { fields: { headline: { type: "string" } } } }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.match(error.message ?? "", /fields do not match/);
      return true;
    }
  );
});

test("projectComponentContract derives component usage from a consumer schema", () => {
  const wp = makeProvider({ componentTypeMap: { servicesList: "features" } });
  const contract = wp.projectComponentContract({
    models: {
      home: {
        kind: "singleton",
        source: { provider: "wordpress", key: "home" },
        fields: {
          hero: { type: "component", component: "hero" },
          services: { type: "component", component: "servicesList" },
          blocks: {
            type: "blocks",
            list: true,
            allowedComponents: ["hero"]
          }
        }
      }
    },
    components: {
      hero: components["hero"]!,
      servicesList: components["servicesList"]!
    }
  });
  assert.deepEqual(contract.components, ["hero", "servicesList"]);
  assert.deepEqual(contract.sectionTypes, ["features", "hero"]);
});