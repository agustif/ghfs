/**
 * Popular traffic path (Schema-first) — lean kitchen-sink peel (second traffic).
 *
 * Copy to: src-effect/domain/traffic-path.ts
 * Then export from domain/index.ts: `export * from "./traffic-path"`
 *
 * Fields cover legacy TrafficPath / writeKitchenSinkData traffic-paths.json
 * in src/sync/sync-repository-kitchen-sink.ts: path, title, count, uniques.
 *
 * Snapshot path this slice: `traffic/paths.json` (lean JSON **array** under
 * config.directory — not kitchen-sink/). Kitchen-sink README OOS.
 * Distinct from TrafficReferrer / SyncTrafficReferrers (#254).
 *
 * Wire via additive `GitHubClient.fetchTrafficPaths` —
 * `GET /repos/{owner}/{repo}/traffic/popular/paths` — see snippet.
 *
 * Views / clones stay OUT OF SCOPE this peel.
 */
import { Schema } from "effect"

/**
 * Lean popular-path list row (last 14 days).
 */
export class TrafficPath extends Schema.Class<TrafficPath>("TrafficPath")({
  path: Schema.String,
  title: Schema.String,
  count: Schema.Number,
  uniques: Schema.Number
}) {}

export const decodeTrafficPath = Schema.decodeUnknownSync(TrafficPath)
export const decodeTrafficPaths = Schema.decodeUnknownSync(
  Schema.Array(TrafficPath)
)
