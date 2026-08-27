import { fileURLToPath } from "node:url";
import { defineNexusConfig, GitProvider, NexusContent } from "@nexuscontent/core";

const contentPath =
  process.env.NEXUS_GIT_CONTENT_PATH ??
  fileURLToPath(new URL("./content", import.meta.url));

const nexus = new NexusContent(
  defineNexusConfig({
    providers: {
      git: { type: "git", options: { contentPath } },
    },
    schema: {
      models: {
        home: {
          kind: "singleton",
          source: { provider: "git", key: "home", mode: "page" },
          fields: {
            hero: {
              type: "object",
              fields: {
                heading: { type: "string" },
                intro: { type: "string" },
              },
            },
          },
        },
        blog: {
          kind: "collection",
          source: { provider: "git", key: "posts" },
        },
        site: {
          kind: "settings",
          source: { provider: "git", key: "site" },
          fields: {
            siteName: { type: "string" },
            locale: { type: "string" },
          },
        },
      },
    },
  }),
);

nexus.register("git", new GitProvider({ contentPath }));

const page = await nexus.getPage("home");
if (!page) {
  throw new Error('Required content "home" was not found.');
}

const settings = await nexus.getSettings("site");
if (!settings) {
  throw new Error('Required settings "site" were not found.');
}

const items = await nexus.getCollection("blog");
const item = await nexus.getItem("blog", items[0]?.key ?? "");

console.log(`Page:     ${page.title} (${page.meta.source})`);
console.log(`Site:     ${settings.data.siteName} (${settings.meta.source})`);
console.log(`Posts:    ${items.length} items`);
console.log(`First:    ${item?.title ?? "none"}`);