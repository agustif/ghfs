/**
 * Repo discussion + category (Schema-first).
 *
 * Copy to: src-effect/domain/discussion.ts
 * Then export from domain/index.ts: `export * from "./discussion"`
 *
 * Fields cover legacy sync-discussions.ts usage (number, title, author, body, url,
 * category, locked, upvoteCount, createdAt/updatedAt/closedAt, answerChosenAt/By,
 * labels[{name,color}]). GraphQL node `id` is a String (not REST Int).
 *
 * Legacy wrote `discussions/<slug>/*.md` + `discussions.md` index — MirrorFs
 * markdown/layout is OUT OF SCOPE; this slice snapshots JSON under
 * `discussions/discussions.json`. Comments sync is a follow-up.
 */
import { Schema } from 'effect'

/** Lightweight category (optional fetch / enrichment). */
export class DiscussionCategory extends Schema.Class<DiscussionCategory>('DiscussionCategory')({
  id: Schema.String,
  name: Schema.String,
  slug: Schema.String,
  description: Schema.NullOr(Schema.String),
  isAnswerable: Schema.Boolean,
}) {}

/** Label chip on a discussion (name + color; prefer over bare string names). */
export const DiscussionLabel = Schema.Struct({
  name: Schema.String,
  color: Schema.String,
})
export type DiscussionLabel = typeof DiscussionLabel.Type

/**
 * Repo-level GitHub Discussion (GraphQL Discussion node).
 * REST has no list-discussions surface — wire via GraphQL client snippet.
 */
export class Discussion extends Schema.Class<Discussion>('Discussion')({
  /** GraphQL global node id (e.g. "D_kwDO…"). */
  id: Schema.String,
  number: Schema.Int,
  title: Schema.String,
  author: Schema.NullOr(Schema.String),
  body: Schema.NullOr(Schema.String),
  url: Schema.NullOr(Schema.String),
  categoryId: Schema.optional(Schema.String),
  categoryName: Schema.optional(Schema.String),
  locked: Schema.Boolean,
  upvoteCount: Schema.Int,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  closedAt: Schema.NullOr(Schema.DateTimeUtc),
  answerChosenAt: Schema.NullOr(Schema.DateTimeUtc),
  answerChosenBy: Schema.NullOr(Schema.String),
  labels: Schema.Array(DiscussionLabel),
}) {}
