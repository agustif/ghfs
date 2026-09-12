/**
 * Repo traffic views (Schema-first) — lean kitchen-sink peel (third traffic).
 *
 * Copy to: src-effect/domain/traffic-views.ts
 * Then export from domain/index.ts: `export * from "./traffic-views"`
 *
 * Fields cover legacy TrafficViews / writeKitchenSinkData traffic-views.json
 * in src/sync/sync-repository-kitchen-sink.ts: count, uniques,
 * views[{ timestamp, count, uniques }].
 *
 * Snapshot path this slice: `traffic/views.json` (lean JSON **object** under
 * config.directory — not kitchen-sink/). Kitchen-sink README OOS.
 * Distinct from TrafficReferrer / TrafficPath list peels.
 *
 * Wire via additive `GitHubClient.fetchTrafficViews` —
 * `GET /repos/{owner}/{repo}/traffic/views` — see snippet.
 *
 * Clones stay OUT OF SCOPE this peel.
 */
import { Schema } from "effect"

/** Daily view bucket inside TrafficViews. */
export const TrafficViewDay = Schema.Struct({
  timestamp: Schema.String,
  count: Schema.Number,
  uniques: Schema.Number
})
export type TrafficViewDay = typeof TrafficViewDay.Type

/**
 * Lean traffic-views snapshot (single resource — totals + daily series).
 */
export class TrafficViews extends Schema.Class<TrafficViews>("TrafficViews")({
  count: Schema.Number,
  uniques: Schema.Number,
  views: Schema.Array(TrafficViewDay)
}) {}

export const decodeTrafficViews = Schema.decodeUnknownSync(TrafficViews)
