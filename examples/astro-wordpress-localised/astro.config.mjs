import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  vite: {
    envPrefix: ["WORDPRESS_"]
  }
});
