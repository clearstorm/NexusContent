import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  validateCollectionItem,
  validatePageContent,
  validateWithSchema
} from "../../src/validation/index.ts";
import { ValidationError } from "../../src/core/index.ts";
import type { CollectionItem, PageContent } from "../../src/index.ts";

const validPage: PageContent = {
  id: "home",
  key: "home",
  slug: "home",
  title: "Home",
  seo: { title: "Home", description: "The homepage." },
  data: { hero: { heading: "Welcome" } },
  meta: { source: "git", sourceId: "pages/home.json", updatedAt: "2026-08-14T10:00:00Z" }
};

const validItem: CollectionItem = {
  id: "hello-world",
  key: "hello-world",
  slug: "hello-world",
  title: "Hello World",
  data: { body: "First post." },
  meta: { source: "git" }
};

test("accepts valid page content", () => {
  assert.doesNotThrow(() => validatePageContent(validPage));
});

test("accepts minimal valid page content", () => {
  const minimal: PageContent = {
    id: "home",
    key: "home",
    data: {},
    meta: { source: "git" }
  };

  assert.doesNotThrow(() => validatePageContent(minimal));
});

test("rejects page content missing the key", () => {
  const broken = { ...validPage, key: undefined } as unknown as PageContent;

  assert.throws(
    () => validatePageContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "key"));
      return true;
    }
  );
});

test("rejects page content with an invalid id type", () => {
  const broken = { ...validPage, id: 42 } as unknown as PageContent;

  assert.throws(
    () => validatePageContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "id"));
      return true;
    }
  );
});

test("rejects page content with invalid data", () => {
  const broken = { ...validPage, data: [1, 2] } as unknown as PageContent;

  assert.throws(
    () => validatePageContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "data"));
      return true;
    }
  );
});

test("rejects page content missing meta", () => {
  const broken = { ...validPage, meta: undefined } as unknown as PageContent;

  assert.throws(
    () => validatePageContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "meta"));
      return true;
    }
  );
});

test("rejects page content with invalid seo types", () => {
  const broken = { ...validPage, seo: { title: 42 } } as unknown as PageContent;

  assert.throws(
    () => validatePageContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path.startsWith("seo")));
      return true;
    }
  );
});

test("validation errors carry structured details", () => {
  const broken = { ...validPage, key: undefined } as unknown as PageContent;

  assert.throws(
    () => validatePageContent(broken, { provider: "git", content: "home" }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.provider, "git");
      assert.equal(error.content, "home");
      assert.equal(error.operation, "validate");
      assert.ok(error.issues.length > 0);
      assert.ok(error.issues.every((issue) => issue.path !== "" && issue.message));
      return true;
    }
  );
});

test("accepts valid collection items", () => {
  assert.doesNotThrow(() => validateCollectionItem(validItem));
});

test("rejects collection items missing required fields", () => {
  const broken = { ...validItem, data: undefined } as unknown as CollectionItem;

  assert.throws(
    () => validateCollectionItem(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "data"));
      return true;
    }
  );
});

test("validates project level schemas with validateWithSchema", () => {
  const aboutSchema = z.object({
    story: z.object({
      heading: z.string(),
      content: z.string()
    })
  });

  const result = validateWithSchema(aboutSchema, {
    story: { heading: "Our story", content: "Text." }
  });
  assert.equal(result.story.heading, "Our story");

  assert.throws(
    () => validateWithSchema(aboutSchema, { story: { heading: 42 } }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "story.heading"));
      return true;
    }
  );
});
