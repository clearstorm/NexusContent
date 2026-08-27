import type { MediaAsset, MediaReference } from "../core/types.ts";

/**
 * Framework neutral media provider contract.
 *
 * Media providers resolve media references into normalized `MediaAsset`
 * values. They are read-only: no upload, delete, or transform APIs are part
 * of this contract.
 */
export interface MediaProvider {
  readonly name: string;

  resolve(reference: MediaReference): Promise<MediaAsset | null>;
}

export type { MediaAsset, MediaReference } from "../core/types.ts";