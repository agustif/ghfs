/**
 * Status summary snapshot (Schema-first) — lean local SyncState observe
 * status for status/status.json.
 *
 * Copy to: src-effect/domain/status-summary.ts
 * Then export from domain/index.ts: `export * from "./status-summary"`
 *
 * Matches legacy `StatusSummary` shape in src/sync/status.ts:
 * `{ repo?, lastSyncedAt?, totalTracked, openCount, closedCount,
 *   executionRuns, lastSyncRun?, lastExecution? }`.
 *
 * LEAN by design:
 * - Counts + optional last-run / last-execution Structs only
 * - Tip Effect `SyncState` is thinner than legacy (no `lastSyncRun` /
 *   `executions`) — do NOT rewrite SyncState; optional nested fields stay
 *   undefined when absent (best-effort like me-summary)
 * - Pure `buildStatusSummary` takes lean `StatusSummaryInput` (tests/CLI
 *   may supply lastSyncRun / lastExecution; service maps tip SyncState)
 *
 * Snapshot path this slice: `status/status.json`
 * Legacy CLI `status` table printer is separate (see cli-status.snippet.ts);
 * MirrorFs markdown OOS.
 *
 * NO GitHubClient fetch — local MirrorFs.readSyncState() only.
 */
import { Schema } from 'effect'

/** Cue lastSyncRun.counters — integer tallies only. */
export const StatusSyncRunCounters = Schema.Struct({
  scanned: Schema.Int,
  selected: Schema.Int,
  processed: Schema.Int,
  skipped: Schema.Int,
  written: Schema.Int,
  moved: Schema.Int,
  patchesWritten: Schema.Int,
  patchesDeleted: Schema.Int,
})
export type StatusSyncRunCounters = typeof StatusSyncRunCounters.Type

/** Cue lastSyncRun.stages — stage duration tallies (ms ints). */
export const StatusSyncRunStages = Schema.Struct({
  metadata: Schema.Int,
  pagination: Schema.Int,
  fetch: Schema.Int,
  materialize: Schema.Int,
  prune: Schema.Int,
  save: Schema.Int,
})
export type StatusSyncRunStages = typeof StatusSyncRunStages.Type

/**
 * Optional last sync-run telemetry (legacy SyncState.lastSyncRun).
 * Tip Effect SyncState omits this — Schema kept for product parity when
 * callers/tests supply it; service leaves undefined on tip SyncState.
 */
export const StatusLastSyncRun = Schema.Struct({
  runId: Schema.String,
  startedAt: Schema.String,
  finishedAt: Schema.String,
  durationMs: Schema.Int,
  requestCount: Schema.Int,
  since: Schema.optional(Schema.String),
  numbersCount: Schema.optional(Schema.Int),
  counters: StatusSyncRunCounters,
  stages: StatusSyncRunStages,
})
export type StatusLastSyncRun = typeof StatusLastSyncRun.Type

/**
 * Optional last execution row (legacy SyncState.executions[0]).
 * Tip Effect SyncState has no executions — optional for parity / tests.
 */
export const StatusLastExecution = Schema.Struct({
  runId: Schema.String,
  createdAt: Schema.String,
  mode: Schema.Literals(['report', 'apply']),
  planned: Schema.Int,
  applied: Schema.Int,
  failed: Schema.Int,
})
export type StatusLastExecution = typeof StatusLastExecution.Type

/**
 * Transient scan input for `buildStatusSummary` — enough to count
 * open/closed + optional cue telemetry. NOT a full legacy SyncState dump.
 *
 * Tip Effect SyncState has repo / lastSyncedAt / items only (no executions /
 * lastSyncRun). Service best-effort map leaves those optional.
 */
export interface StatusSummaryInput {
  readonly repo?: string
  readonly lastSyncedAt?: string
  readonly items: ReadonlyArray<{ readonly state: 'open' | 'closed' }>
  readonly executionRuns?: number
  readonly lastSyncRun?: StatusLastSyncRun
  readonly lastExecution?: StatusLastExecution
}

/**
 * Lean status snapshot (single resource after local SyncState scan).
 * No GitHub fetch.
 */
export class StatusSummary extends Schema.Class<StatusSummary>('StatusSummary')({
  repo: Schema.optional(Schema.String),
  lastSyncedAt: Schema.optional(Schema.String),
  totalTracked: Schema.Int,
  openCount: Schema.Int,
  closedCount: Schema.Int,
  executionRuns: Schema.Int,
  lastSyncRun: Schema.optional(StatusLastSyncRun),
  lastExecution: Schema.optional(StatusLastExecution),
}) {}

export const decodeStatusSummary = Schema.decodeUnknownSync(StatusSummary)
export const decodeStatusLastSyncRun =
  Schema.decodeUnknownSync(StatusLastSyncRun)
export const decodeStatusLastExecution =
  Schema.decodeUnknownSync(StatusLastExecution)
export const decodeStatusSyncRunCounters =
  Schema.decodeUnknownSync(StatusSyncRunCounters)
export const decodeStatusSyncRunStages =
  Schema.decodeUnknownSync(StatusSyncRunStages)

/**
 * Pure aggregator — mirrors legacy src/sync/status.ts `getStatusSummary`
 * over lean `StatusSummaryInput` (not full SyncState kitchen-sink).
 *
 * Empty `items` → zero counts. Tip SyncState has no executions / lastSyncRun
 * → defaults `executionRuns` to 0 and omits lastSyncRun / lastExecution
 * unless supplied on the input.
 */
export function buildStatusSummary(input: StatusSummaryInput): StatusSummary {
  const openCount = input.items.filter((item) => item.state === 'open').length
  const closedCount = input.items.filter((item) => item.state === 'closed').length

  return StatusSummary.make({
    ...(input.repo !== undefined ? { repo: input.repo } : {}),
    ...(input.lastSyncedAt !== undefined
      ? { lastSyncedAt: input.lastSyncedAt }
      : {}),
    totalTracked: input.items.length,
    openCount,
    closedCount,
    executionRuns: input.executionRuns ?? 0,
    ...(input.lastSyncRun !== undefined
      ? { lastSyncRun: input.lastSyncRun }
      : {}),
    ...(input.lastExecution !== undefined
      ? { lastExecution: input.lastExecution }
      : {}),
  })
}
