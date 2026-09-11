/**
 * Weekly commit activity row (Schema-first) — lean kitchen-sink peel.
 *
 * Copy to: src-effect/domain/commit-activity.ts
 * Then export from domain/index.ts: `export * from "./commit-activity"`
 *
 * Fields cover legacy CommitActivity / writeKitchenSinkData
 * commit-activity.json in src/sync/sync-repository-kitchen-sink.ts:
 * days (7 ints Sun→Sat), total, week (unix seconds).
 *
 * Snapshot path this slice: `commit-activity/commit-activity.json`
 * (lean JSON array under config.directory; sibling custom-properties/ style —
 * not kitchen-sink/ wrapper). Kitchen-sink README / enabledFeatures
 * markdown OOS. Distinct from ActivitySummary (events) and SyncActivityEvents.
 *
 * Wire via additive `GitHubClient.fetchCommitActivity` —
 * `GET /repos/{owner}/{repo}/stats/commit_activity` — see snippet.
 * Stats may return 202 (computing) → treat as [].
 *
 * Other kitchen-sink leftovers (participation, tags, git refs, assignee
 * suggestions, vuln reporting, traffic) stay OUT OF SCOPE.
 */
import { Schema } from "effect"

/**
 * Lean weekly commit-activity list row (one week of the past year).
 */
export class CommitActivity extends Schema.Class<CommitActivity>("CommitActivity")({
  /** Commits per day Sun→Sat (wire `days`, length 7). */
  days: Schema.Array(Schema.Number),
  /** Total commits in the week (wire `total`). */
  total: Schema.Number,
  /** Unix timestamp for the start of the week (wire `week`). */
  week: Schema.Number
}) {}

export const decodeCommitActivity = Schema.decodeUnknownSync(CommitActivity)
export const decodeCommitActivities = Schema.decodeUnknownSync(
  Schema.Array(CommitActivity)
)
