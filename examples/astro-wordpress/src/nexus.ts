import { GitProvider, NexusContent, WordPressProvider } from "@nexuscontent/core";
import {
  gitProviderOptions,
  nexusConfig,
  wordpressProviderOptions
} from "./nexus.config";
import { schema } from "./schema/schema";

// The NexusContent instance is exported directly. Model names and data shapes
// are inferred from the const schema in ./schema/schema, so consumers do not
// need pass-through wrapper functions or explicit generic parameters.
const nexus = new NexusContent(nexusConfig);

nexus.register("git", new GitProvider(gitProviderOptions));

const wordpress = new WordPressProvider(wordpressProviderOptions);
nexus.register("wordpress", wordpress);

// Fail fast on components the WordPress install could never produce. With the
// canonical 12-section component names this validates the provider's section
// registry admits every declared consumer component; it is plugin-independent
// and runs at build time.
wordpress.validateComponents(schema.components);

export { nexus };