import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  vite: {
    envPrefix: ["NEXUS_", "WORDPRESS_"]
  }
});