// One-off push of this example consumer's project contract to the
// NexusContent companion plugin's POST /wp-json/nexuscontent/v1/project-contract.
// Reads the same WORDPRESS_API_URL / WORDPRESS_USERNAME / WORDPRESS_APP_PASSWORD
// the example uses; run via `npm run push:project-contract` here in the
// example directory, which loads examples/astro-wordpress/.env.
import { WordPressProvider } from "@nexuscontent/core";
import { schema } from "../src/schema/schema.ts";

const baseUrl = process.env.WORDPRESS_API_URL;
const username = process.env.WORDPRESS_USERNAME;
const appPassword = process.env.WORDPRESS_APP_PASSWORD;

function fail(message) {
  throw new Error(`push-project-contract: ${message}`);
}

if (!baseUrl || !username || !appPassword) {
  fail(
    "WORDPRESS_API_URL, WORDPRESS_USERNAME and WORDPRESS_APP_PASSWORD must be set " +
      "(they live in .env; run via npm run push:project-contract in this example).",
  );
}

const authHeader = {
  Authorization: `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`,
};

const wordpress = new WordPressProvider({
  baseUrl,
  headers: authHeader,
  apiStrategy: "core",
});

const contract = wordpress.projectComponentContract(schema);

const apiRoot = new URL(baseUrl);
const wpJsonIndex = apiRoot.pathname.indexOf("/wp-json");
apiRoot.pathname =
  (wpJsonIndex >= 0 ? apiRoot.pathname.slice(0, wpJsonIndex) : apiRoot.pathname).replace(/\/+$/, "") +
  "/wp-json/nexuscontent/v1/project-contract";
const pushUrl = apiRoot.toString();

const response = await fetch(pushUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...authHeader,
  },
  body: JSON.stringify(contract),
});

if (!response.ok) {
  let detail = `${response.status} ${response.statusText}`;
  try {
    const body = await response.json();
    if (body?.message) detail = `${response.status} ${body.message}`;
  } catch {
    // Non-JSON error body; the status line is enough.
  }
  fail(
    `${detail}. Check that WORDPRESS_API_URL points at this site, the plugin is active, ` +
      "and the app-password user has manage_options.",
  );
}

const stored = await response.json();
console.log(
  `Pushed project contract to ${pushUrl}: ` +
    `${stored.components.length} components [${stored.components.join(", ")}], ` +
    `${stored.sectionTypes.length} section types [${stored.sectionTypes.join(", ")}]. ` +
    "Refresh the plugin admin page to see the contract and drift.",
);