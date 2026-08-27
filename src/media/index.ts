export type { MediaProvider } from "./types.ts";
export type {
  MediaAsset,
  MediaReference
} from "./types.ts";
export { MediaProviderRegistry } from "./registry.ts";
export {
  ResolveMediaService,
  validateReference
} from "./resolve.ts";
export type { ResolveMediaOptions } from "./resolve.ts";
export {
  defineLocalMediaProvider
} from "./providers/local.ts";
export type { LocalMediaProviderOptions } from "./providers/local.ts";
export {
  defineRemoteMediaProvider,
  validateRemoteUrl
} from "./providers/remote.ts";
export type { RemoteMediaProviderOptions } from "./providers/remote.ts";