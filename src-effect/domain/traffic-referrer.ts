/**
 * Popular traffic referrer (Schema-first) — lean kitchen-sink peel (first traffic).
 *
 * Copy to: src-effect/domain/traffic-referrer.ts
 * Then export from domain/index.ts: `export * from "./traffic-referrer"`
 *
 * Fields cover legacy TrafficReferrer / writeKitchenSinkData
 * traffic-referrers.json in src/sync/sync-repository-kitchen-sink.ts:
 * referrer, count, uniques.
 *
 * Snapshot path this slice: `traffic/referrers.json` (lean JSON **array**
 * under config.directory — not kitchen-sink/). Kitchen-sink README OOS.
 * Distinct from SyncNetworkSummary (#240 — forks/subscribers/watchers counts).
 *
 * Wire via additive `GitHubClient.fetchTrafficReferrers` —
 * `GET /repos/{owner}/{repo}/traffic/popular/referrers` — see snippet.
 *
 * Paths / views / clones stay OUT OF SCOPE this peel.
 */
import { Schema } from "effect"

/**
 * Lean popular-referrer list row (last 14 days).
 */
export class TrafficReferrer extends Schema.Class<TrafficReferrer>(
  "TrafficReferrer"
)({
  referrer: Schema.String,
  count: Schema.Number,
  uniques: Schema.Number
}) {}

export const decodeTrafficReferrer = Schema.decodeUnknownSync(TrafficReferrer)
export const decodeTrafficReferrers = Schema.decodeUnknownSync(
  Schema.Array(TrafficReferrer)
)
