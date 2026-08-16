import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const statePath = path.join(root, "project.state.json");
const packagePath = path.join(root, "package.json");
const featuresPath = path.join(root, "FEATURES.md");

const VALID_STATUSES = new Set([
  "implemented",
  "in_progress",
  "planned",
  "blocked",
  "deferred",
]);
function fail(message) {
  throw new Error(`Project state validation failed: ${message}`);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(
      `${path.relative(root, filePath)} is not valid JSON (${error.message})`,
    );
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    fail(`${label} must be an array of strings`);
  }
}

const state = await readJson(statePath);
const packageManifest = await readJson(packagePath);
const featureMarkdown = await readFile(featuresPath, "utf8");

assertString(state.project?.name, "project.name");
assertString(state.project?.version, "project.version");
assertString(state.project?.milestone, "project.milestone");
assertString(packageManifest.name, "package.name");
assertString(packageManifest.version, "package.version");

if (state.project.name !== "NexusContent") {
  fail(`project.name must be NexusContent, received ${state.project.name}`);
}
if (state.project.version !== packageManifest.version) {
  fail(
    `project version ${state.project.version} does not match package.json version ${packageManifest.version}`,
  );
}

const featureGroups = state.features;
if (!featureGroups || typeof featureGroups !== "object") {
  fail("features must be an object");
}

const allStateIds = [];
for (const [status, ids] of Object.entries(featureGroups)) {
  if (
    !["implemented", "inProgress", "planned", "blocked", "deferred"].includes(
      status,
    )
  ) {
    fail(`unknown feature group ${status}`);
  }
  assertStringArray(ids, `features.${status}`);
  for (const id of ids) {
    if (!/^[a-z0-9]+(?:\.[a-z0-9-]+)+$/.test(id)) {
      fail(`feature ID ${id} is not machine-friendly`);
    }
    allStateIds.push(id);
  }
}

const duplicateIds = allStateIds.filter(
  (id, index) => allStateIds.indexOf(id) !== index,
);
if (duplicateIds.length > 0) {
  fail(`feature IDs are duplicated: ${[...new Set(duplicateIds)].join(", ")}`);
}

const featureRows = featureMarkdown
  .split("\n")
  .map((line) =>
    line.match(
      /^\|\s*`([a-z0-9]+(?:\.[a-z0-9-]+)+)`[^|]*\|\s*(implemented|in_progress|planned|blocked|deferred)\s*\|/,
    ),
  )
  .filter(Boolean)
  .map((match) => ({ id: match[1], status: match[2] }));
const markdownIds = featureRows.map((row) => row.id);
const duplicateMarkdownIds = markdownIds.filter(
  (id, index) => markdownIds.indexOf(id) !== index,
);
if (duplicateMarkdownIds.length > 0) {
  fail(
    `FEATURES.md repeats feature IDs: ${[...new Set(duplicateMarkdownIds)].join(", ")}`,
  );
}

const stateIdSet = new Set(allStateIds);
const markdownIdSet = new Set(markdownIds);
const missingFromMarkdown = allStateIds.filter((id) => !markdownIdSet.has(id));
const missingFromState = markdownIds.filter((id) => !stateIdSet.has(id));
if (missingFromMarkdown.length > 0) {
  fail(
    `state feature IDs missing from FEATURES.md: ${missingFromMarkdown.join(", ")}`,
  );
}
if (missingFromState.length > 0) {
  fail(
    `FEATURES.md feature IDs missing from project.state.json: ${missingFromState.join(", ")}`,
  );
}

if (state.currentFocus?.status !== "unassigned") {
  fail(
    "currentFocus.status must be unassigned when no active implementation is identified",
  );
}
if (state.currentFocus.id !== null || state.currentFocus.label !== null) {
  fail("unassigned currentFocus must have null id and label");
}

if (
  !state.recommendedNextFocus ||
  state.recommendedNextFocus.status !== "planned"
) {
  fail("recommendedNextFocus must identify a planned feature");
}
if (!stateIdSet.has(state.recommendedNextFocus.id)) {
  fail(
    "recommendedNextFocus.id must reference a feature in project.state.json",
  );
}

assertStringArray(state.next, "next");
for (const id of state.next) {
  if (!stateIdSet.has(id)) {
    fail(`next feature ID ${id} is not listed in project.state.json`);
  }
}

for (const status of [
  "implemented",
  "inProgress",
  "planned",
  "blocked",
  "deferred",
]) {
  const expectedStatus = status === "inProgress" ? "in_progress" : status;

  for (const id of featureGroups[status]) {
    const hasMatchingRow = featureRows.some(
      (row) => row.id === id && row.status === expectedStatus,
    );

    if (!hasMatchingRow) {
      fail(`${id} does not have status ${expectedStatus} in FEATURES.md`);
    }
  }
}

for (const [id, target] of Object.entries(state.roadmapTargets ?? {})) {
  assertString(target, `roadmapTargets.${id}`);
  if (!stateIdSet.has(id)) {
    fail(`roadmap target ${id} is not listed in project.state.json`);
  }
}

for (const status of [
  "implemented",
  "in_progress",
  "planned",
  "blocked",
  "deferred",
]) {
  if (!VALID_STATUSES.has(status)) {
    fail(`internal status vocabulary is invalid: ${status}`);
  }
}

console.log(
  `Project state is valid: ${allStateIds.length} feature IDs, version ${state.project.version}.`,
);
