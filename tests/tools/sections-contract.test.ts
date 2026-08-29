import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classify,
  loadBaseSections,
  loadContract,
  normalizeCustomSections,
  phpString,
  renderPhp
} from "../../scripts/sections-contract.mjs";

const base = loadBaseSections();

const CUSTOM_RAW = [
  {
    type: "services_list",
    label: "Services List",
    fixed: true,
    fields: [
      { name: "heading", type: "string" },
      { name: "icon", type: "media" }
    ]
  },
  {
    type: "promo",
    fields: [
      { name: "code", type: "string", required: true }
    ]
  },
  {
    type: "unused_type",
    fields: [{ name: "title", type: "string" }]
  }
];

function custom() {
  return normalizeCustomSections(CUSTOM_RAW, base);
}

test("classify splits installed, custom, and missing, catching unused declarations", () => {
  const contract = loadContract({
    components: ["servicesList"],
    sectionTypes: ["hero", "services_list", "promo", "mystery"],
    componentTypeMap: { servicesList: "services_list" }
  });
  const state = classify({ base, custom: custom(), contract });
  assert.deepEqual(state.installed, ["hero"]);
  assert.deepEqual(state.emittedTypes, ["services_list", "promo"]);
  assert.deepEqual(state.missing, ["mystery"]);
  assert.deepEqual(state.unusedCustom, ["unused_type"]);
});

test("expected types resolve through componentTypeMap and include sectionTypes", () => {
  const contract = loadContract({
    components: ["mapToInstalled", "mapToCustom", "noMap"],
    sectionTypes: [],
    componentTypeMap: {
      mapToInstalled: "features",
      mapToCustom: "promo"
    }
  });
  const state = classify({ base, custom: custom(), contract });
  assert.deepEqual(state.installed, ["features"]);
  assert.deepEqual(state.emittedTypes, ["promo"]);
  assert.deepEqual(state.missing, []);
});

test("without a contract every declared custom section is emitted", () => {
  const state = classify({ base, custom: custom(), contract: null });
  assert.deepEqual(state.installed, []);
  assert.deepEqual(state.emittedTypes, ["services_list", "promo", "unused_type"]);
  assert.deepEqual(state.missing, []);
});

test("custom sections reject reserved prefixes and built-in collisions", () => {
  const reserved = normalizeCustomSections;
  assert.throws(() => reserved([{ type: "nc_badge", fields: [] }], base), /reserved/);
  assert.throws(() => reserved([{ type: "nexus_badge", fields: [] }], base), /reserved/);
  assert.throws(() => reserved([{ type: "hero", fields: [] }], base), /collides/);
});

test("custom sections reject disallowed field types and bad names", () => {
  assert.throws(
    () => normalizeCustomSections([{ type: "thing", fields: [{ name: "x", type: "yaml" }] }], base),
    /unsupported type "yaml"/
  );
  assert.throws(
    () => normalizeCustomSections([{ type: "thing", fields: [{ name: "bad name", type: "string" }] }], base),
    /invalid "name"/
  );
});

test("phpString escapes single quotes and backslashes", () => {
  assert.equal(phpString("user's \\ path"), "'user\\'s \\\\ path'");
  assert.equal(phpString(true), "true");
  assert.equal(phpString(3), "3");
  assert.equal(phpString(null), "null");
});

test("renderPhp is deterministic, emits both filters, and lints under php", () => {
  const state = classify({ base, custom: custom(), contract: loadContract({ sectionTypes: ["services_list", "promo"] }) });
  const first = renderPhp(state.emitted);
  const second = renderPhp(state.emitted);
  assert.equal(first, second);
  assert.ok(first.startsWith("<?php"));
  assert.ok(first.includes("'nexuscontent_section_definitions'"));
  assert.ok(first.includes("'nexuscontent_block_implementations'"));
  assert.ok(first.includes("'services_list' => array("));
  assert.ok(first.includes("'fixed' => true,"));
  assert.ok(first.includes("array( 'name' => 'icon', 'type' => 'media' ),"));
  assert.ok(first.includes("'services_list', 'promo'"));

  const dir = mkdtempSync(path.join(tmpdir(), "nexus-sections-"));
  try {
    const file = path.join(dir, "nexuscontent-sections.php");
    writeFileSync(file, first);
    execFileSync("php", ["-l", file], { stdio: "pipe" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a contract sectionType with no definition is classified as missing, not emitted", () => {
  const contract = loadContract({ sectionTypes: ["promo", "services_list", "unknown_section"] });
  const state = classify({ base, custom: custom(), contract });
  assert.deepEqual(state.missing, ["unknown_section"]);
  assert.deepEqual(state.emittedTypes, ["promo", "services_list"]);
});