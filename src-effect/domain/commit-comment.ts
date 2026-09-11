/**
 * Repo-level commit comment (Schema-first) — NOT issue/PR SyncComments.
 *
 * Copy to: src-effect/domain/commit-comment.ts
 * Then export from domain/index.ts: `export * from "./commit-comment"`
 *
 * Fields cover legacy ProviderCommitComment / writeCommitComments in
 * src/sync/extended-metadata.ts: id, body, createdAt, updatedAt, author,
 * authorAvatarUrl?, commitId, path, line, position, htmlUrl?.
 *
 * Snapshot path this slice: `commit-comments.json` (lean JSON **array** at
 * mirror root). Legacy cue wrote `commit-comments.jsonl` NDJSON — Effect peel
 * uses a lean array `.json` (no kitchen-sink wrapper, no markdown).
 *
 * Wire via additive `GitHubClient.fetchCommitComments` —
 * `GET /repos/{owner}/{repo}/comments` — see snippet. Cue limit 30.
 */
import { Schema } from "effect"

/**
 * Single commit-line / commit discussion comment on a repo (commits comments API).
 * Distinct from domain `Comment` (issue/PR conversation comments).
 */
export class CommitComment extends Schema.Class<CommitComment>("CommitComment")({
  id: Schema.Int,
  body: Schema.NullOr(Schema.String),
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  author: Schema.NullOr(Schema.String),
  authorAvatarUrl: Schema.optional(Schema.String),
  /** Commit SHA the comment is attached to. */
  commitId: Schema.String,
  path: Schema.NullOr(Schema.String),
  line: Schema.NullOr(Schema.Int),
  position: Schema.NullOr(Schema.Int),
  htmlUrl: Schema.optional(Schema.String)
}) {}
