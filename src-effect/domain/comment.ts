/**
 * Issue / PR conversation comment + reaction summary (Schema-first).
 *
 * Copy to: src-effect/domain/comment.ts
 * Then export from domain/index.ts: `export * from "./comment"`
 *
 * Distinct from Issue.comments inline Struct (leave issue.ts alone) —
 * this Class mirrors ProviderComment / MarkdownComment + ProviderReactions
 * camelCase from src/types/provider.ts, plus subject identity for snapshot sync.
 */
import { Schema } from 'effect'

/** Matches ProviderReactions camelCase (GitHub wire: +1→plusOne, -1→minusOne). */
export class ReactionSummary extends Schema.Class<ReactionSummary>('ReactionSummary')({
  plusOne: Schema.Int,
  minusOne: Schema.Int,
  laugh: Schema.Int,
  hooray: Schema.Int,
  confused: Schema.Int,
  heart: Schema.Int,
  rocket: Schema.Int,
  eyes: Schema.Int,
  totalCount: Schema.Int,
}) {}

/**
 * Conversation comment on an issue or PR (issues comments API).
 * Review comments (`/pulls/{n}/comments`) are out of scope.
 */
export class Comment extends Schema.Class<Comment>('Comment')({
  id: Schema.Int,
  author: Schema.String,
  body: Schema.String,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  reactions: Schema.optional(ReactionSummary),
  subjectKind: Schema.Literals(['issue', 'pull']),
  subjectNumber: Schema.Int,
}) {}
