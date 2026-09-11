/**
 * StatusLastSyncRun / StatusLastExecution / StatusSummary Schema round-trips
 * + buildStatusSummary scan + stream stub.
 *
 * Copy to: src-effect/domain/status-summary.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  buildStatusSummary,
  decodeStatusLastExecution,
  decodeStatusLastSyncRun,
  decodeStatusSummary,
  StatusLastExecution,
  StatusLastSyncRun,
  StatusSummary,
  StatusSyncRunCounters,
  StatusSyncRunStages,
  type StatusSummaryInput
} from "./status-summary"

const sampleCounters = StatusSyncRunCounters.make({
  scanned: 10,
  selected: 8,
  processed: 7,
  skipped: 1,
  written: 6,
  moved: 0,
  patchesWritten: 2,
  patchesDeleted: 0
})

const sampleStages = StatusSyncRunStages.make({
  metadata: 5,
  pagination: 10,
  fetch: 20,
  materialize: 50,
  prune: 2,
  save: 5
})

const sampleLastSyncRun = StatusLastSyncRun.make({
  runId: "sync_123",
  startedAt: "2026-09-10T12:00:00.000Z",
  finishedAt: "2026-09-10T12:00:01.000Z",
  durationMs: 1000,
  requestCount: 10,
  since: "2026-09-09T00:00:00.000Z",
  numbersCount: 3,
  counters: sampleCounters,
  stages: sampleStages
})

const sampleLastExecution = StatusLastExecution.make({
  runId: "exec_9",
  createdAt: "2026-09-11T15:00:00.000Z",
  mode: "apply",
  planned: 4,
  applied: 3,
  failed: 1
})

const thinItems: StatusSummaryInput = {
  repo: "owner/repo",
  lastSyncedAt: "2026-09-11T16:00:00.000Z",
  items: [
    { state: "open" },
    { state: "open" },
    { state: "closed" }
  ],
  executionRuns: 0
}

describe("StatusLastSyncRun / StatusLastExecution schemas", () => {
  it("makes and round-trips nested lastSyncRun / lastExecution Structs", () => {
    const encodedRun = Schema.encodeSync(StatusLastSyncRun)(sampleLastSyncRun)
    expect(encodedRun.runId).toBe("sync_123")
    expect(encodedRun.counters.processed).toBe(7)
    expect(encodedRun.stages.materialize).toBe(50)
    expect(encodedRun.since).toBe("2026-09-09T00:00:00.000Z")
    expect(decodeStatusLastSyncRun(encodedRun).requestCount).toBe(10)

    const encodedExec = Schema.encodeSync(StatusLastExecution)(
      sampleLastExecution
    )
    expect(encodedExec.mode).toBe("apply")
    expect(encodedExec).not.toHaveProperty("dry-run")
    expect(decodeStatusLastExecution(encodedExec).failed).toBe(1)
  })

  it("omits optional since / numbersCount when absent", () => {
    const lean = StatusLastSyncRun.make({
      runId: "sync_lean",
      startedAt: "2026-09-11T00:00:00.000Z",
      finishedAt: "2026-09-11T00:00:02.000Z",
      durationMs: 2000,
      requestCount: 1,
      counters: sampleCounters,
      stages: sampleStages
    })
    const encoded = Schema.encodeSync(StatusLastSyncRun)(lean)
    expect(encoded).not.toHaveProperty("since")
    expect(encoded).not.toHaveProperty("numbersCount")
  })
})

describe("buildStatusSummary", () => {
  it("counts open/closed from lean items (tip SyncState shape)", () => {
    const summary = buildStatusSummary(thinItems)

    expect(summary.repo).toBe("owner/repo")
    expect(summary.lastSyncedAt).toBe("2026-09-11T16:00:00.000Z")
    expect(summary.totalTracked).toBe(3)
    expect(summary.openCount).toBe(2)
    expect(summary.closedCount).toBe(1)
    expect(summary.executionRuns).toBe(0)
    expect(summary.lastSyncRun).toBeUndefined()
    expect(summary.lastExecution).toBeUndefined()

    const encoded = Schema.encodeSync(StatusSummary)(summary)
    expect(encoded).not.toHaveProperty("lastSyncRun")
    expect(encoded).not.toHaveProperty("lastExecution")
    expect(JSON.stringify(encoded)).not.toMatch(/"executions"/)
    expect(JSON.stringify(encoded)).not.toMatch(/"items"/)

    const roundTrip = decodeStatusSummary(encoded)
    expect(roundTrip.totalTracked).toBe(3)
    expect(roundTrip.openCount).toBe(2)
  })

  it("includes optional lastSyncRun / lastExecution when supplied (parity)", () => {
    const summary = buildStatusSummary({
      ...thinItems,
      executionRuns: 2,
      lastSyncRun: sampleLastSyncRun,
      lastExecution: sampleLastExecution
    })

    expect(summary.executionRuns).toBe(2)
    expect(summary.lastSyncRun?.runId).toBe("sync_123")
    expect(summary.lastSyncRun?.counters.written).toBe(6)
    expect(summary.lastExecution?.mode).toBe("apply")
    expect(summary.lastExecution?.applied).toBe(3)

    const encoded = Schema.encodeSync(StatusSummary)(summary)
    const roundTrip = decodeStatusSummary(encoded)
    expect(roundTrip.lastSyncRun?.stages.fetch).toBe(20)
    expect(roundTrip.lastExecution?.runId).toBe("exec_9")
  })

  it("returns zero counts for empty items (null SyncState map)", () => {
    const summary = buildStatusSummary({ items: [] })
    expect(summary.totalTracked).toBe(0)
    expect(summary.openCount).toBe(0)
    expect(summary.closedCount).toBe(0)
    expect(summary.executionRuns).toBe(0)
    expect(summary.repo).toBeUndefined()
    expect(summary.lastSyncedAt).toBeUndefined()

    const made = StatusSummary.make({
      totalTracked: 0,
      openCount: 0,
      closedCount: 0,
      executionRuns: 0
    })
    expect(made.totalTracked).toBe(0)
  })
})

describe("Stream.succeed status summary", () => {
  it("stub-streams a single StatusSummary resource", async () => {
    const summary = buildStatusSummary(thinItems)

    const collected = await Effect.runPromise(
      Stream.succeed(summary).pipe(
        Stream.runFold(() => [] as Array<StatusSummary>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(1)
    expect(collected[0]?.openCount).toBe(2)
    expect(collected[0]?.closedCount).toBe(1)
  })
})
