import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  validateCollectionItem,
  validateNavigationContent,
  validatePageContent,
  validateSettingsContent,
  validateSingletonContent,
  validateWithSchema
} from "../../src/validation/index.ts";
import { ValidationError } from "../../src/core/index.ts";
import type {
  CollectionItem,
  NavigationContent,
  PageContent,
  SettingsContent,
  SingletonContent
} from "../../src/index.ts";

const validPage: PageContent = {
  id: "home",
  key: "home",
  slug: "home",
  title: "Home",
  seo: { title: "Home", description: "The homepage." },
  data: { hero: { heading: "Welcome" } },
  meta: { source: "git", sourceId: "pages/home.json", updatedAt: "2026-08-14T10:00:00Z" }
};

const validSingleton: SingletonContent = {
  id: "navigation",
  key: "navigation",
  data: {
    items: [{ label: "Home", href: "/" }]
  },
  meta: {
    source: "git",
    sourceId: "singletons/navigation.json",
    updatedAt: "2026-08-14T10:00:00Z"
  }
};

const validNavigation: NavigationContent = {
  id: "primary",
  key: "primary",
  items: [
    {
      label: "Resources",
      href: "/resources",
      children: [{ label: "Guides", href: "/guides" }]
    }
  ],
  meta: { source: "git", sourceId: "navigation/primary.json" }
};

const validSettings: SettingsContent = {
  id: "site",
  key: "site",
  data: { siteName: "NexusContent", locale: "en-ZA" },
  meta: { source: "git", sourceId: "settings/site.json" }
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

test("accepts valid singleton content", () => {
  assert.doesNotThrow(() => validateSingletonContent(validSingleton));
});

test("rejects singleton content missing required fields", () => {
  const broken = {
    ...validSingleton,
    key: undefined,
    meta: undefined
  } as unknown as SingletonContent;

  assert.throws(
    () => validateSingletonContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "key"));
      assert.ok(error.issues.some((issue) => issue.path === "meta"));
      return true;
    }
  );
});

test("rejects singleton content with invalid data", () => {
  const broken = {
    ...validSingleton,
    data: ["not", "an", "object"]
  } as unknown as SingletonContent;

  assert.throws(
    () => validateSingletonContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "data"));
      return true;
    }
  );
});

test("singleton validation errors carry structured details", () => {
  const broken = { ...validSingleton, id: 42 } as unknown as SingletonContent;

  assert.throws(
    () =>
      validateSingletonContent(broken, {
        provider: "git",
        content: "mainNavigation"
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.provider, "git");
      assert.equal(error.content, "mainNavigation");
      assert.equal(error.operation, "validate");
      assert.ok(error.issues.some((issue) => issue.path === "id" && issue.message));
      return true;
    }
  );
});

test("accepts valid recursive navigation content", () => {
  assert.doesNotThrow(() => validateNavigationContent(validNavigation));
});

test("rejects navigation items missing a label", () => {
  const broken = {
    ...validNavigation,
    items: [{ href: "/" }]
  } as unknown as NavigationContent;

  assert.throws(
    () => validateNavigationContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "items.0.label"));
      return true;
    }
  );
});

test("rejects navigation items missing an href", () => {
  const broken = {
    ...validNavigation,
    items: [{ label: "Home" }]
  } as unknown as NavigationContent;

  assert.throws(
    () => validateNavigationContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "items.0.href"));
      return true;
    }
  );
});

test("rejects invalid nested navigation children", () => {
  const broken = {
    ...validNavigation,
    items: [
      {
        label: "Resources",
        href: "/resources",
        children: [{ label: "Missing href" }]
      }
    ]
  } as unknown as NavigationContent;

  assert.throws(
    () => validateNavigationContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(
        error.issues.some(
          (issue) => issue.path === "items.0.children.0.href"
        )
      );
      return true;
    }
  );
});

test("rejects navigation content with invalid items", () => {
  const broken = {
    ...validNavigation,
    items: null
  } as unknown as NavigationContent;

  assert.throws(
    () => validateNavigationContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "items"));
      return true;
    }
  );
});

test("navigation validation errors carry structured details", () => {
  const broken = {
    ...validNavigation,
    items: [{ label: "Home" }]
  } as unknown as NavigationContent;

  assert.throws(
    () =>
      validateNavigationContent(broken, {
        provider: "git",
        content: "primary"
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.provider, "git");
      assert.equal(error.content, "primary");
      assert.equal(error.operation, "validate");
      return true;
    }
  );
});

test("accepts valid generic settings content", () => {
  assert.doesNotThrow(() => validateSettingsContent(validSettings));
});

test("rejects settings content with invalid data", () => {
  const broken = {
    ...validSettings,
    data: ["not", "an", "object"]
  } as unknown as SettingsContent;

  assert.throws(
    () => validateSettingsContent(broken),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.issues.some((issue) => issue.path === "data"));
      return true;
    }
  );
});

test("settings validation errors carry structured details", () => {
  const broken = { ...validSettings, id: 42 } as unknown as SettingsContent;

  assert.throws(
    () =>
      validateSettingsContent(broken, {
        provider: "git",
        content: "site"
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.provider, "git");
      assert.equal(error.content, "site");
      assert.equal(error.operation, "validate");
      assert.ok(error.issues.some((issue) => issue.path === "id"));
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
