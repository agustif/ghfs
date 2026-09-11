/**
 * Repo commit participation stats (Schema-first) — lean kitchen-sink peel.
 *
 * Copy to: src-effect/domain/participation.ts
 * Then export from domain/index.ts: `export * from "./participation"`
 *
 * Fields cover legacy ParticipationStats / writeKitchenSinkData
 * participation-stats.json in src/sync/sync-repository-kitchen-sink.ts:
 * all (weekly commit counts, all contributors), owner (owner-only).
 *
 * Snapshot path this slice: `participation/participation.json`
 * (lean JSON object under config.directory; sibling commit-activity/ style —
 * not kitchen-sink/ wrapper). Kitchen-sink README / enabledFeatures
 * markdown OOS. Distinct from SyncCommitActivity (weekly day breakdown).
 *
 * Wire via additive `GitHubClient.fetchParticipation` —
 * `GET /repos/{owner}/{repo}/stats/participation` — see snippet.
 * Stats may return 202 (computing) → treat as { all: [], owner: [] }.
 *
 * Remaining kitchen-sink leftovers (tags, git refs, assignee suggestions,
 * vuln reporting, traffic) stay OUT OF SCOPE.
 */
import { Schema } from "effect"

/**
 * Lean participation snapshot (single resource — owner vs all weekly totals).
 */
export class Participation extends Schema.Class<Participation>("Participation")({
  /** Weekly commit counts for all contributors (wire `all`). */
  all: Schema.Array(Schema.Number),
  /** Weekly commit counts for the repo owner (wire `owner`). */
  owner: Schema.Array(Schema.Number)
}) {}

export const decodeParticipation = Schema.decodeUnknownSync(Participation)
