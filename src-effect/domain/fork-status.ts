/**
 * Repo fork parent/source status (Schema-first) — tiny observe snapshot.
 *
 * Copy to: src-effect/domain/fork-status.ts
 * Then export from domain/index.ts: `export * from "./fork-status"`
 *
 * Fields cover legacy ProviderForkStatus / writeForkStatus in
 * src/sync/extended-metadata.ts: isFork, parent?, source?.
 *
 * Snapshot path this slice: `fork-status.json` (mirror root; matches
 * FORK_STATUS_FILE_NAME). Kitchen-sink wrappers OOS. Do not rewrite SyncMetadata.
 *
 * Wire via additive `GitHubClient.fetchForkStatus` — see snippet
 * (GET /repos/{owner}/{repo} → fork + parent + source).
 */
import { Schema } from "effect"

/** Immediate parent repo when this repo is a fork. */
export const ForkParent = Schema.Struct({
  fullName: Schema.String,
  htmlUrl: Schema.String,
  defaultBranch: Schema.String
})
export type ForkParent = typeof ForkParent.Type

/** Ultimate source repo for a fork network. */
export const ForkSource = Schema.Struct({
  fullName: Schema.String,
  htmlUrl: Schema.String
})
export type ForkSource = typeof ForkSource.Type

/**
 * Lean fork-status snapshot (single resource, not a list).
 */
export class ForkStatus extends Schema.Class<ForkStatus>("ForkStatus")({
  isFork: Schema.Boolean,
  parent: Schema.NullOr(ForkParent),
  source: Schema.NullOr(ForkSource)
}) {}
