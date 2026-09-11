/**
 * Activity summary snapshot (Schema-first) — lean recent repo events for
 * activity-summary.json.
 *
 * Copy to: src-effect/domain/activity-summary.ts
 * Then export from domain/index.ts: `export * from "./activity-summary"`
 *
 * Matches legacy `buildActivitySummary` shape in src/sync/activity-summary.ts:
 * `{ events: [{ id, type, actor, createdAt, description }], syncedAt }`.
 *
 * LEAN by design:
 * - Persisted events are slim rows only (id, type, actor, createdAt, description)
 * - Do NOT embed wire `payload` / full ProviderEvent kitchen-sink on the snapshot
 * - `formatEventDescription` uses transient payload at build time only
 *
 * Snapshot path this slice: `activity-summary/activity-summary.json`
 * Legacy wrote storage-root `activity.md` via extended-metadata-ergonomics —
 * sibling-style dir under activity-summary/ matches interaction-limits / security-summary.
 * MirrorFs markdown OOS.
 *
 * Wire via additive GitHubClient.fetchActivityEvents — see snippet.
 */
import { Schema } from 'effect'

/**
 * Transient fetch row from fetchActivityEvents — payload is for
 * formatEventDescription only and is NEVER written to the snapshot.
 */
export interface ActivityEventInput {
  readonly id: string
  readonly type: string
  readonly actor: string | null
  readonly createdAt: string
  readonly payload?: Record<string, unknown> | null
}

/**
 * Slim activity event row persisted on ActivitySummary (NOT ProviderEvent).
 */
export class ActivityEvent extends Schema.Class<ActivityEvent>('ActivityEvent')({
  id: Schema.String,
  type: Schema.String,
  actor: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  description: Schema.String,
}) {}

/**
 * Lean activity-summary snapshot (single resource after one limited events fetch).
 * Wire via additive fetchActivityEvents — see snippet.
 */
export class ActivitySummary extends Schema.Class<ActivitySummary>(
  'ActivitySummary',
)({
  events: Schema.Array(ActivityEvent),
  syncedAt: Schema.String,
}) {}

/**
 * Pure description formatter — mirrors legacy
 * src/sync/activity-summary.ts formatEventDescription.
 * Payload is read only here; never stored on ActivityEvent.
 */
export function formatEventDescription(event: {
  readonly type: string
  readonly payload?: Record<string, unknown> | null
}): string {
  const payload = event.payload ?? {}

  switch (event.type) {
    case 'PushEvent':
      return `pushed ${payload.size ?? 0} commit(s) to ${payload.ref ?? 'unknown'}`
    case 'PullRequestEvent':
      return `${payload.action ?? 'opened'} pull request #${payload.number ?? 'unknown'}`
    case 'IssuesEvent':
      return `${payload.action ?? 'opened'} issue #${payload.number ?? 'unknown'}`
    case 'IssueCommentEvent': {
      const issue = payload.issue as { number?: number } | undefined
      return `commented on #${issue?.number ?? 'unknown'}`
    }
    case 'CreateEvent':
      return `created ${payload.ref_type ?? 'ref'} ${payload.ref ?? ''}`
    case 'DeleteEvent':
      return `deleted ${payload.ref_type ?? 'ref'} ${payload.ref ?? ''}`
    case 'ForkEvent': {
      const forkee = payload.forkee as { full_name?: string } | undefined
      return `forked to ${forkee?.full_name ?? 'unknown'}`
    }
    case 'WatchEvent':
      return `starred the repository`
    case 'ReleaseEvent': {
      const release = payload.release as { tag_name?: string } | undefined
      return `${payload.action ?? 'published'} release ${release?.tag_name ?? 'unknown'}`
    }
    default:
      return event.type.replace(/Event$/, '').toLowerCase()
  }
}

/**
 * Pure aggregator — mirrors legacy src/sync/activity-summary.ts
 * buildActivitySummary but emits slim events (no payload on snapshot).
 */
export function buildActivitySummary(input: {
  readonly events: ReadonlyArray<ActivityEventInput>
  readonly syncedAt: string
}): ActivitySummary {
  return new ActivitySummary({
    events: input.events.map(
      (event) =>
        new ActivityEvent({
          id: event.id,
          type: event.type,
          actor: event.actor,
          createdAt: event.createdAt,
          description: formatEventDescription(event),
        }),
    ),
    syncedAt: input.syncedAt,
  })
}
