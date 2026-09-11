/**
 * Me summary snapshot (Schema-first) — lean assigned / review-requested /
 * mentions rows for me-summary.json.
 *
 * Copy to: src-effect/domain/me-summary.ts
 * Then export from domain/index.ts: `export * from "./me-summary"`
 *
 * Matches legacy `MeSummary` shape in src/sync/me-summary.ts:
 * `{ assigned, reviewRequested, mentions, syncedAt }`.
 *
 * LEAN by design:
 * - Persisted rows are slim cue fields only (number/kind/title/state/updatedAt
 *   + mention context) — NOT full SyncItemCanonicalData / ProviderItem dumps
 * - Scan input (`MeSummaryItemInput`) carries optional assignees /
 *   requestedReviewers / body / comments for pure `buildMeSummary` only
 * - Effect tip `SyncItemState` is thinner than legacy (no `data.item` /
 *   assignees / body / comments / title) — do NOT rewrite SyncItemState /
 *   engines; service maps best-effort (empty scan fields → empty lists)
 *
 * Snapshot path this slice: `me-summary/me-summary.json`
 * Legacy `renderMeSummary` → `me.md` style markdown is OUT OF SCOPE
 * (JSON snapshot only). MirrorFs markdown OOS.
 *
 * Wire via additive GitHubClient.fetchAuthenticatedUser — see snippet.
 * Items come from MirrorFs.readSyncState() (local) + optional richer
 * MeSummaryItemInput fed by CLI/tests — not a GitHub issues list fetch.
 */
import { Schema } from 'effect'

/**
 * Transient scan row for `buildMeSummary` — enough to mirror cue
 * assignees / requestedReviewers / @mention checks.
 * NOT the full legacy SyncItemState.data kitchen-sink.
 *
 * Tip Effect SyncItemState lacks these optional fields; callers/tests may
 * supply them. Service best-effort map leaves them empty when absent.
 */
export interface MeSummaryItemInput {
  readonly number: number
  readonly kind: 'issue' | 'pull'
  readonly state: 'open' | 'closed'
  readonly title: string
  readonly updatedAt: string
  readonly assignees?: ReadonlyArray<string>
  readonly requestedReviewers?: ReadonlyArray<string>
  readonly body?: string | null
  readonly comments?: ReadonlyArray<{ readonly body?: string | null }>
}

/** Lean authenticated user from GET /user — me-summary only needs login. */
export interface AuthenticatedUserInput {
  readonly login: string
}

/** Slim assigned row (issue or pull). */
export const MeAssignedItem = Schema.Struct({
  number: Schema.Int,
  kind: Schema.Literals(['issue', 'pull']),
  title: Schema.String,
  state: Schema.Literals(['open', 'closed']),
  updatedAt: Schema.String,
})
export type MeAssignedItem = typeof MeAssignedItem.Type

/** Slim review-requested row (pulls only in cue). */
export const MeReviewRequestedItem = Schema.Struct({
  number: Schema.Int,
  title: Schema.String,
  state: Schema.Literals(['open', 'closed']),
  updatedAt: Schema.String,
})
export type MeReviewRequestedItem = typeof MeReviewRequestedItem.Type

/** Slim mention row — `context` is `"body"` | `"comment"` (string, lean). */
export const MeMentionItem = Schema.Struct({
  number: Schema.Int,
  kind: Schema.Literals(['issue', 'pull']),
  title: Schema.String,
  state: Schema.Literals(['open', 'closed']),
  updatedAt: Schema.String,
  context: Schema.String,
})
export type MeMentionItem = typeof MeMentionItem.Type

/**
 * Lean me-summary snapshot (single resource after one authenticated-user
 * fetch + local SyncState scan).
 */
export class MeSummary extends Schema.Class<MeSummary>('MeSummary')({
  assigned: Schema.Array(MeAssignedItem),
  reviewRequested: Schema.Array(MeReviewRequestedItem),
  mentions: Schema.Array(MeMentionItem),
  syncedAt: Schema.String,
}) {}

export const decodeMeSummary = Schema.decodeUnknownSync(MeSummary)
export const decodeMeAssignedItem = Schema.decodeUnknownSync(MeAssignedItem)
export const decodeMeReviewRequestedItem =
  Schema.decodeUnknownSync(MeReviewRequestedItem)
export const decodeMeMentionItem = Schema.decodeUnknownSync(MeMentionItem)

function sortByUpdatedAtDesc<T extends { readonly updatedAt: string }>(
  rows: Array<T>,
): Array<T> {
  return rows.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

/**
 * Pure aggregator — mirrors legacy src/sync/me-summary.ts `buildMeSummary`
 * over lean `MeSummaryItemInput` rows (not full SyncItemState.data).
 *
 * Deviation from cue: always returns `MeSummary` (never `null`). When
 * `currentUser` is null/empty, emits empty lists + `syncedAt` so observe
 * sync can still write a snapshot (match other summary satellites).
 */
export function buildMeSummary(input: {
  readonly items: ReadonlyArray<MeSummaryItemInput>
  readonly currentUser: string | null
  readonly syncedAt: string
}): MeSummary {
  const currentUser = input.currentUser?.trim() || null
  if (!currentUser) {
    return MeSummary.make({
      assigned: [],
      reviewRequested: [],
      mentions: [],
      syncedAt: input.syncedAt,
    })
  }

  const assigned: Array<MeAssignedItem> = []
  const reviewRequested: Array<MeReviewRequestedItem> = []
  const mentions: Array<MeMentionItem> = []

  for (const item of input.items) {
    if (item.assignees?.includes(currentUser)) {
      assigned.push(
        MeAssignedItem.make({
          number: item.number,
          kind: item.kind,
          title: item.title,
          state: item.state,
          updatedAt: item.updatedAt,
        }),
      )
    }

    if (
      item.kind === 'pull' &&
      item.requestedReviewers?.includes(currentUser)
    ) {
      reviewRequested.push(
        MeReviewRequestedItem.make({
          number: item.number,
          title: item.title,
          state: item.state,
          updatedAt: item.updatedAt,
        }),
      )
    }

    const mentionNeedle = `@${currentUser}`
    if (item.body?.includes(mentionNeedle)) {
      mentions.push(
        MeMentionItem.make({
          number: item.number,
          kind: item.kind,
          title: item.title,
          state: item.state,
          updatedAt: item.updatedAt,
          context: 'body',
        }),
      )
    }

    for (const comment of item.comments ?? []) {
      if (comment.body?.includes(mentionNeedle)) {
        mentions.push(
          MeMentionItem.make({
            number: item.number,
            kind: item.kind,
            title: item.title,
            state: item.state,
            updatedAt: item.updatedAt,
            context: 'comment',
          }),
        )
        break
      }
    }
  }

  return MeSummary.make({
    assigned: sortByUpdatedAtDesc(assigned),
    reviewRequested: sortByUpdatedAtDesc(reviewRequested),
    mentions: sortByUpdatedAtDesc(mentions),
    syncedAt: input.syncedAt,
  })
}
