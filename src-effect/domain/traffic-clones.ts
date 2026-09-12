/**
 * Repo traffic clones (Schema-first) — lean kitchen-sink peel (LAST traffic /
 * last kitchen-sink leftover).
 *
 * Copy to: src-effect/domain/traffic-clones.ts
 * Then export from domain/index.ts: `export * from "./traffic-clones"`
 *
 * Fields cover legacy TrafficClones / writeKitchenSinkData traffic-clones.json
 * in src/sync/sync-repository-kitchen-sink.ts: count, uniques,
 * clones[{ timestamp, count, uniques }].
 *
 * Snapshot path this slice: `traffic/clones.json` (lean JSON **object** under
 * config.directory — not kitchen-sink/). Kitchen-sink README OOS.
 * Distinct from TrafficViews (views[] vs clones[]).
 *
 * Wire via additive `GitHubClient.fetchTrafficClones` —
 * `GET /repos/{owner}/{repo}/traffic/clones` — see snippet.
 *
 * Do not re-drop views / paths / referrers.
 */
import { Schema } from "effect"

/** Daily clone bucket inside TrafficClones. */
export const TrafficCloneDay = Schema.Struct({
  timestamp: Schema.String,
  count: Schema.Number,
  uniques: Schema.Number
})
export type TrafficCloneDay = typeof TrafficCloneDay.Type

/**
 * Lean traffic-clones snapshot (single resource — totals + daily series).
 */
export class TrafficClones extends Schema.Class<TrafficClones>("TrafficClones")({
  count: Schema.Number,
  uniques: Schema.Number,
  clones: Schema.Array(TrafficCloneDay)
}) {}

export const decodeTrafficClones = Schema.decodeUnknownSync(TrafficClones)
