/**
 * Repository git tag (Schema-first) — lean kitchen-sink peel.
 *
 * Copy to: src-effect/domain/repo-tag.ts
 * Then export from domain/index.ts: `export * from "./repo-tag"`
 *
 * Fields cover legacy RepositoryTag / writeKitchenSinkData tags.json in
 * src/sync/sync-repository-kitchen-sink.ts: name, commit.{sha,url},
 * zipball_url → zipballUrl, tarball_url → tarballUrl, node_id → nodeId.
 *
 * Snapshot path this slice: `tags/tags.json` (lean JSON array under
 * config.directory; sibling participation/ style — not kitchen-sink/).
 * Kitchen-sink README / enabledFeatures markdown OOS.
 * Distinct from SyncReleases (release objects, not lightweight tags).
 *
 * Wire via additive `GitHubClient.fetchTags` —
 * `GET /repos/{owner}/{repo}/tags?page=&per_page=` — see snippet.
 *
 * Remaining kitchen-sink leftovers (git refs, assignee suggestions,
 * vuln reporting, traffic) stay OUT OF SCOPE.
 */
import { Schema } from "effect"

/** Commit pointer on a lightweight tag list row. */
export const RepoTagCommit = Schema.Struct({
  sha: Schema.String,
  url: Schema.String
})
export type RepoTagCommit = typeof RepoTagCommit.Type

/**
 * Lean repository tag list row (lightweight tags; not SyncReleases).
 */
export class RepoTag extends Schema.Class<RepoTag>("RepoTag")({
  name: Schema.String,
  commit: RepoTagCommit,
  /** Wire `zipball_url`. */
  zipballUrl: Schema.String,
  /** Wire `tarball_url`. */
  tarballUrl: Schema.String,
  /** Wire `node_id`. */
  nodeId: Schema.String
}) {}

export const decodeRepoTag = Schema.decodeUnknownSync(RepoTag)
export const decodeRepoTags = Schema.decodeUnknownSync(Schema.Array(RepoTag))
