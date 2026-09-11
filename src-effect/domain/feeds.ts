/**
 * Authenticated user activity feed URLs (Schema-first) — tiny observe snapshot.
 *
 * Copy to: src-effect/domain/feeds.ts
 * Then export from domain/index.ts: `export * from "./feeds"`
 *
 * Fields cover legacy ProviderFeeds / writeFeeds in
 * src/sync/extended-metadata.ts: timelineUrl, userUrl.
 *
 * Snapshot path this slice: `feeds.json` (mirror root; matches FEEDS_FILE_NAME).
 * Kitchen-sink wrappers OOS. Last extended-metadata writer peel.
 * Do not rewrite SyncActivityEvents / SyncActivitySummary.
 *
 * Wire via additive `GitHubClient.fetchFeeds` — see snippet
 * (`GET /feeds` → timeline_url / user_url; not repo-scoped).
 */
import { Schema } from "effect"

/**
 * Lean feeds snapshot (single resource, not a list).
 */
export class Feeds extends Schema.Class<Feeds>("Feeds")({
  timelineUrl: Schema.NullOr(Schema.String),
  userUrl: Schema.NullOr(Schema.String)
}) {}
