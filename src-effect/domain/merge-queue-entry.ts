/**
 * Merge queue entry (Schema-first) — lean flat fields.
 *
 * Copy to: src-effect/domain/merge-queue-entry.ts
 * Then export from domain/index.ts: `export * from "./merge-queue-entry"`
 *
 * Fields cover legacy `ProviderMergeQueueEntry` + `sync-merge-queue.ts` cues
 * (position, state, enqueuedAt, estimatedTimeToMerge?, PR number/title/author/url,
 * base/head sha). Prefer flat lean fields over nested pullRequest Struct for
 * this first slice.
 *
 * Snapshot path this slice: `merge-queue/entries.json` (JSON array).
 * Legacy wrote kitchen-sink `merge-queue.md` — MirrorFs markdown OUT OF SCOPE.
 *
 * Transport: GraphQL `repository.mergeQueue.entries` (REST is weak for merge queue).
 */
import { Schema } from 'effect'

/**
 * Known GitHub `MergeQueueEntryState` values, with String fallback for
 * forward-compat.
 */
export const MergeQueueEntryState = Schema.Union([
  Schema.Literals([
    'AWAITING_CHECKS',
    'LOCKED',
    'MERGEABLE',
    'QUEUED',
    'UNMERGEABLE',
  ]),
  Schema.String,
])
export type MergeQueueEntryState = typeof MergeQueueEntryState.Type

/**
 * One entry in the repo default-branch merge queue.
 * Wire via additive `GitHubClient.fetchMergeQueueEntries` — see snippet.
 */
export class MergeQueueEntry extends Schema.Class<MergeQueueEntry>('MergeQueueEntry')({
  position: Schema.Int,
  state: MergeQueueEntryState,
  enqueuedAt: Schema.DateTimeUtc,
  /** GraphQL Int (seconds) mapped to string in the client; may be absent/null. */
  estimatedTimeToMerge: Schema.optional(Schema.NullOr(Schema.String)),
  pullRequestNumber: Schema.Int,
  pullRequestTitle: Schema.String,
  pullRequestAuthor: Schema.NullOr(Schema.String),
  pullRequestUrl: Schema.NullOr(Schema.String),
  baseSha: Schema.optional(Schema.NullOr(Schema.String)),
  headSha: Schema.optional(Schema.NullOr(Schema.String)),
}) {}
