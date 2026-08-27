import { GitProvider, NexusContent } from "@nexuscontent/core";
import { gitProviderOptions, nexusConfig } from "./nexus.config";

// The NexusContent instance is exported directly. Model names and data shapes
// are inferred from the const schema in ./schema/schema, so consumers do not
// need pass-through wrapper functions or explicit generic parameters.
export const nexus = new NexusContent(nexusConfig);

nexus.register("git", new GitProvider(gitProviderOptions));