/**
 * Repository git ref (Schema-first) — lean kitchen-sink peel.
 *
 * Copy to: src-effect/domain/git-ref.ts
 * Then export from domain/index.ts: `export * from "./git-ref"`
 *
 * Fields cover legacy GitRef / writeKitchenSinkData git-refs.json in
 * src/sync/sync-repository-kitchen-sink.ts: ref, node_id → nodeId, url,
 * object.{type,sha,url}.
 *
 * Snapshot path this slice: `git/refs.json` (lean object `{ refs: GitRef[] }`
 * under config.directory — not kitchen-sink/; not a bare array).
 * Kitchen-sink README / enabledFeatures markdown OOS.
 * Distinct from SyncTags (lightweight tag list) and SyncSearchCommitRefs
 * (search hits with issue references).
 *
 * Wire via additive `GitHubClient.fetchGitRefs` —
 * `GET /repos/{owner}/{repo}/git/refs?page=&per_page=` — see snippet.
 *
 * Remaining kitchen-sink leftovers (assignee suggestions, vuln reporting,
 * traffic) stay OUT OF SCOPE.
 */
import { Schema } from "effect"

/** Target object pointed to by a git ref. */
export const GitRefObject = Schema.Struct({
  type: Schema.String,
  sha: Schema.String,
  url: Schema.String
})
export type GitRefObject = typeof GitRefObject.Type

/**
 * Lean repository git-ref list row (branches, tags, etc.).
 */
export class GitRef extends Schema.Class<GitRef>("GitRef")({
  /** Fully-qualified ref name (e.g. `refs/heads/main`). */
  ref: Schema.String,
  /** Wire `node_id`. */
  nodeId: Schema.String,
  url: Schema.String,
  object: GitRefObject
}) {}

export const decodeGitRef = Schema.decodeUnknownSync(GitRef)
export const decodeGitRefs = Schema.decodeUnknownSync(Schema.Array(GitRef))
