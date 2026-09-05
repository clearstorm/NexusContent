import node from "@astrojs/node";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  adapter: node({ mode: "standalone" }),
  vite: {
    envPrefix: ["NEXUS_", "WORDPRESS_"]
  }
});