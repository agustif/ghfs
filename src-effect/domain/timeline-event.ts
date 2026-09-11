/**
 * Issue / PR timeline event (Schema-first).
 *
 * Copy to: src-effect/domain/timeline-event.ts
 * Then export from domain/index.ts: `export * from "./timeline-event"`
 *
 * Mirrors ProviderTimelineEventBase + kinds from src/types/provider.ts (~L135–184).
 * Kind-specific extras (sha, label, assignee, rename, review, …) live in optional
 * `payload` until per-kind Schema.Class deepen later — keep Schema-first, no
 * hand-rolled readonly interfaces.
 *
 * Legacy snapshot: `.timeline.jsonl` beside markdown (`getItemTimelinePath`).
 * This slice writes JSON arrays under `timeline/{issue|pull}-N.json` instead.
 * MirrorFs markdown embed is OUT OF SCOPE.
 */
import { Schema } from 'effect'

/**
 * Common GitHub Timeline API event names + `unknown` fallback.
 * Full ProviderTimelineEventKind set is broader; extras map to `unknown`
 * with `payload.rawKind` until the Literals list grows.
 */
export const TimelineEventKind = Schema.Literals([
  'committed',
  'closed',
  'reopened',
  'merged',
  'labeled',
  'unlabeled',
  'assigned',
  'unassigned',
  'review_requested',
  'review_request_removed',
  'reviewed',
  'review_dismissed',
  'commented',
  'renamed',
  'milestoned',
  'demilestoned',
  'transferred',
  'base_ref_changed',
  'head_ref_force_pushed',
  'head_ref_deleted',
  'head_ref_restored',
  'locked',
  'unlocked',
  'ready_for_review',
  'convert_to_draft',
  'pinned',
  'unpinned',
  'mentioned',
  'subscribed',
  'unsubscribed',
  'cross-referenced',
  'connected',
  'disconnected',
  'unknown',
])

export type TimelineEventKind = typeof TimelineEventKind.Type

/**
 * Flat timeline row for snapshot sync.
 * `payload` holds kind-specific extras (sha, label, assignee, rename, …)
 * until tagged per-kind Classes replace this Class.
 */
export class TimelineEvent extends Schema.Class<TimelineEvent>('TimelineEvent')({
  /** Legacy ProviderTimelineEvent uses string ids (`commit:sha`, numeric string, …). */
  id: Schema.String,
  kind: TimelineEventKind,
  createdAt: Schema.DateTimeUtc,
  actor: Schema.optional(Schema.String),
  subjectKind: Schema.Literals(['issue', 'pull']),
  subjectNumber: Schema.Int,
  /** Kind-specific extras until per-kind Schema.Class deepen later. */
  payload: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
}) {}
