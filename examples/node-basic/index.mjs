import { fileURLToPath } from "node:url";
import { GitProvider, NexusContent } from "@nexuscontent/core";

const contentPath =
  process.env.NEXUS_GIT_CONTENT_PATH ??
  fileURLToPath(new URL("./content", import.meta.url));

const nexus = new NexusContent({
  providers: {
    git: { type: "git", options: { contentPath } }
  },
  content: {
    home: { provider: "git", key: "home" },
    blog: { provider: "git", key: "posts" }
  }
});

nexus.register("git", new GitProvider({ contentPath }));

const page = await nexus.getPage("home");
if (!page) {
  throw new Error("Required content \"home\" was not found.");
}

const items = await nexus.getCollection("blog");
const item = await nexus.getItem("blog", items[0]?.key ?? "");

console.log(`Page:  ${page.title} (${page.meta.source})`);
console.log(`Posts: ${items.length} items`);
console.log(`First: ${item?.title ?? "none"}`);
