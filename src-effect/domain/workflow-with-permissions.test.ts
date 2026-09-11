/**
 * Workflow-with-permissions observe — Schema round-trip + Stream stub.
 *
 * Copy to: src-effect/domain/workflow-with-permissions.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { WorkflowWithPermissions } from "./workflow-with-permissions"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

/** Lean snapshot payload for actions/workflows.json (no repo/synced_at wrapper). */
function encodeActionsWorkflowsSnapshot(
  rows: Array<WorkflowWithPermissions>
): unknown {
  return Schema.encodeSync(Schema.Array(WorkflowWithPermissions))(rows)
}

describe("workflow-with-permissions snapshot (actions/workflows.json)", () => {
  it("encodes lean array with optional permissions detail", () => {
    const row = new WorkflowWithPermissions({
      id: 42,
      nodeId: "W_kwDOA",
      name: "CI",
      path: ".github/workflows/ci.yml",
      state: "active",
      createdAt: d("2024-01-01T00:00:00.000Z"),
      updatedAt: d("2024-01-02T00:00:00.000Z"),
      htmlUrl: "https://github.com/acme/widgets/actions/workflows/ci.yml",
      badgeUrl: "https://github.com/acme/widgets/workflows/CI/badge.svg",
      permissions: {
        id: 42,
        name: "CI",
        path: ".github/workflows/ci.yml",
        state: "active",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z"
      }
    })

    const encoded = encodeActionsWorkflowsSnapshot([row])
    const decoded = Schema.decodeUnknownSync(
      Schema.Array(WorkflowWithPermissions)
    )(encoded)

    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.id).toBe(42)
    expect(decoded[0]?.name).toBe("CI")
    expect(decoded[0]?.permissions).toEqual({
      id: 42,
      name: "CI",
      path: ".github/workflows/ci.yml",
      state: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z"
    })
    // No kitchen-sink wrapper keys on lean snapshot root
    expect(Array.isArray(encoded)).toBe(true)
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("count")
  })

  it("omits permissions when N+1 fetch was null/skipped", () => {
    const row = new WorkflowWithPermissions({
      id: 7,
      name: "Release",
      path: ".github/workflows/release.yml",
      state: "active",
      createdAt: d("2024-02-01T00:00:00.000Z"),
      updatedAt: d("2024-02-01T00:00:00.000Z")
    })

    const encoded = Schema.encodeSync(WorkflowWithPermissions)(row) as Record<
      string,
      unknown
    >
    expect(encoded).not.toHaveProperty("permissions")

    const decoded = Schema.decodeUnknownSync(WorkflowWithPermissions)(encoded)
    expect(decoded.permissions).toBeUndefined()
    expect(decoded.id).toBe(7)
  })

  it("accepts forward-compat workflow state strings", () => {
    const row = new WorkflowWithPermissions({
      id: 99,
      name: "Forked",
      path: ".github/workflows/fork.yml",
      state: "disabled_fork",
      createdAt: d("2024-03-01T00:00:00.000Z"),
      updatedAt: d("2024-03-01T00:00:00.000Z"),
      permissions: { id: 99, state: "disabled_fork" }
    })
    const roundTrip = Schema.decodeUnknownSync(WorkflowWithPermissions)(
      Schema.encodeSync(WorkflowWithPermissions)(row)
    )
    expect(roundTrip.state).toBe("disabled_fork")
  })
})

describe("Stream.paginate stub (workflow permissions enrichment)", () => {
  it("stub-streams enriched rows then sorts by id", async () => {
    const rows = [
      new WorkflowWithPermissions({
        id: 2,
        name: "B",
        path: ".github/workflows/b.yml",
        state: "active",
        createdAt: d("2024-01-01T00:00:00.000Z"),
        updatedAt: d("2024-01-01T00:00:00.000Z"),
        permissions: { id: 2 }
      }),
      new WorkflowWithPermissions({
        id: 1,
        name: "A",
        path: ".github/workflows/a.yml",
        state: "active",
        createdAt: d("2024-01-01T00:00:00.000Z"),
        updatedAt: d("2024-01-01T00:00:00.000Z")
      })
    ]

    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(
          () => [] as Array<WorkflowWithPermissions>,
          (acc, row) => {
            acc.push(row)
            return acc
          }
        )
      )
    )

    collected.sort((a, b) => a.id - b.id)
    expect(collected.map((r) => r.id)).toEqual([1, 2])
    expect(collected[0]?.permissions).toBeUndefined()
    expect(collected[1]?.permissions).toEqual({ id: 2 })
  })
})
