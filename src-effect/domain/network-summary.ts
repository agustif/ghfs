/**
 * Repo network counts (Schema-first) — tiny observe snapshot.
 *
 * Copy to: src-effect/domain/network-summary.ts
 * Then export from domain/index.ts: `export * from "./network-summary"`
 *
 * Fields cover legacy ProviderNetworkSummary / writeNetworkSummary in
 * src/sync/extended-metadata.ts: forks, subscribers, watchers, networkCount.
 *
 * Snapshot path this slice: `network-summary.json` (mirror root; matches
 * NETWORK_SUMMARY_FILE_NAME). Kitchen-sink wrappers OOS.
 * Do not rewrite SyncMetadata / SyncForkStatus.
 *
 * Wire via additive `GitHubClient.fetchNetworkSummary` — see snippet
 * (GET /repos/{owner}/{repo} → forks_count / subscribers_count /
 * watchers_count / network_count).
 */
import { Schema } from "effect"

/**
 * Lean network-summary snapshot (single resource, not a list).
 */
export class NetworkSummary extends Schema.Class<NetworkSummary>("NetworkSummary")({
  forks: Schema.Int,
  subscribers: Schema.Int,
  watchers: Schema.Int,
  networkCount: Schema.Int
}) {}
