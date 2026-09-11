/**
 * Raw repo activity event row (Schema-first) — DISTINCT from ActivityEvent
 * (slim summary row with `description`, no payload).
 *
 * Copy to: src-effect/domain/repo-activity-event.ts
 * Then export from domain/index.ts: `export * from "./repo-activity-event"`
 *
 * Fields cover legacy ProviderActivityEvent / writeActivityEvents in
 * src/sync/extended-metadata.ts: id, type, actor, createdAt, payload.
 *
 * Snapshot path this slice: `activity.json` (lean JSON **array** at mirror root).
 * Legacy cue wrote `activity.jsonl` NDJSON — Effect peel uses lean `.json`
 * array (same rule as commit-comments peel). Kitchen-sink wrappers OOS.
 *
 * Wire: REUSE tip `GitHubClient.fetchActivityEvents` (already on tip from
 * SyncActivitySummary) with `{ limit: 100 }`. Map ActivityEventInput →
 * RepoActivityEvent (keep payload). Do NOT rewrite SyncActivitySummary.
 */
import { Schema } from "effect"

/**
 * Raw listRepoEvents row persisted on the activity-events snapshot.
 * Includes wire `payload` (summary ActivityEvent intentionally omits it).
 */
export class RepoActivityEvent extends Schema.Class<RepoActivityEvent>(
  "RepoActivityEvent"
)({
  id: Schema.String,
  type: Schema.String,
  actor: Schema.NullOr(Schema.String),
  /** ISO-8601 timestamp string (matches tip ActivityEventInput / ProviderActivityEvent). */
  createdAt: Schema.String,
  payload: Schema.Record(Schema.String, Schema.Unknown)
}) {}
