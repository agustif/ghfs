/**
 * Authenticated viewer star/watch status for the mirror repo (Schema-first).
 *
 * Copy to: src-effect/domain/viewer-status.ts
 * Then export from domain/index.ts: `export * from "./viewer-status"`
 *
 * Fields cover legacy ProviderViewerStatus / writeViewerStatus in
 * src/sync/extended-metadata.ts: starred, subscription.
 *
 * Snapshot path this slice: `viewer-status.json` (repo root under config.directory;
 * matches VIEWER_STATUS_FILE_NAME cue). Kitchen-sink wrappers OOS.
 *
 * Wire via additive `GitHubClient.fetchViewerStatus` — see snippet.
 */
import { Schema } from "effect"

/**
 * GitHub activity subscription kind for the authenticated user on this repo.
 * `null` when not watching / API returned no subscription.
 */
export const ViewerSubscription = Schema.NullOr(
  Schema.Literals(["subscribed", "ignored"])
)
export type ViewerSubscription = typeof ViewerSubscription.Type

/**
 * Lean viewer-status snapshot (single resource, not a list).
 */
export class ViewerStatus extends Schema.Class<ViewerStatus>("ViewerStatus")({
  /** Whether the authenticated user has starred the repo. */
  starred: Schema.Boolean,
  /** Watch subscription: subscribed | ignored | null. */
  subscription: ViewerSubscription
}) {}
