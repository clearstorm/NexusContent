import { GitProvider, NexusContent } from "@nexuscontent/core";
import { gitProviderOptions, nexusConfig } from "./nexus.config";

export const nexus = new NexusContent(nexusConfig);

nexus.register("git", new GitProvider(gitProviderOptions));
