import { NexusContent, WordPressProvider } from "@nexuscontent/core";
import { nexusConfig, wordpressProviderOptions } from "./nexus.config";

const nexus = new NexusContent(nexusConfig);

nexus.register("wordpress", new WordPressProvider(wordpressProviderOptions));

export { nexus };