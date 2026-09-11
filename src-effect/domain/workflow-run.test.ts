/**
 * WorkflowRun Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/workflow-run.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from workflow.test.ts (SyncWorkflows definitions).
 */
import { DateTime, Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { WorkflowRun } from "./workflow-run"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

function encodeRecentRunsSnapshot(rows: Array<WorkflowRun>): unknown {
  return Schema.encodeSync(Schema.Array(WorkflowRun))(rows)
}

describe("WorkflowRun schema (actions/recent-runs.json)", () => {
  it("encodes lean array of recent runs", () => {
    const row = new WorkflowRun({
      id: 991,
      name: "CI",
      headBranch: "main",
      headSha: "abc123def",
      status: "completed",
      conclusion: "success",
      workflowId: 42,
      createdAt: d("2024-12-01T00:00:00.000Z"),
      updatedAt: d("2024-12-01T00:05:00.000Z"),
      htmlUrl: "https://github.com/acme/widgets/actions/runs/991",
      event: "push",
      actor: "alice"
    })

    const encoded = encodeRecentRunsSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(WorkflowRun))(encoded)

    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.id).toBe(991)
    expect(decoded[0]?.headBranch).toBe("main")
    expect(decoded[0]?.conclusion).toBe("success")
    expect(decoded[0]?.workflowId).toBe(42)
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("runs")
  })

  it("allows null name / branch / conclusion / actor", () => {
    const row = new WorkflowRun({
      id: 1,
      name: null,
      headBranch: null,
      headSha: "deadbeef",
      status: "in_progress",
      conclusion: null,
      workflowId: 7,
      createdAt: d("2024-12-02T00:00:00.000Z"),
      updatedAt: d("2024-12-02T00:00:00.000Z"),
      event: "workflow_dispatch",
      actor: null
    })
    const roundTrip = Schema.decodeUnknownSync(WorkflowRun)(
      Schema.encodeSync(WorkflowRun)(row)
    )
    expect(roundTrip.name).toBeNull()
    expect(roundTrip.headBranch).toBeNull()
    expect(roundTrip.conclusion).toBeNull()
    expect(roundTrip.actor).toBeNull()
    expect(roundTrip.status).toBe("in_progress")
  })
})

describe("Stream.fromIterable recent workflow runs", () => {
  it("stub-streams then sorts by id desc", async () => {
    const rows = [
      new WorkflowRun({
        id: 10,
        name: "A",
        headBranch: "main",
        headSha: "aaa",
        status: "completed",
        conclusion: "success",
        workflowId: 1,
        createdAt: d("2024-01-01T00:00:00.000Z"),
        updatedAt: d("2024-01-01T00:00:00.000Z"),
        event: "push",
        actor: "a"
      }),
      new WorkflowRun({
        id: 20,
        name: "B",
        headBranch: "main",
        headSha: "bbb",
        status: "completed",
        conclusion: "failure",
        workflowId: 1,
        createdAt: d("2024-01-02T00:00:00.000Z"),
        updatedAt: d("2024-01-02T00:00:00.000Z"),
        event: "push",
        actor: "b"
      })
    ]

    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<WorkflowRun>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    collected.sort((a, b) => b.id - a.id)
    expect(collected.map((r) => r.id)).toEqual([20, 10])
  })
})
