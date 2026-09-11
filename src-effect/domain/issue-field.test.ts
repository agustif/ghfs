/**
 * IssueField Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/issue-field.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from issue-type.test.ts (SyncIssueTypes).
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { IssueField } from "./issue-field"

function encodeIssueFieldsSnapshot(rows: Array<IssueField>): unknown {
  return Schema.encodeSync(Schema.Array(IssueField))(rows)
}

describe("IssueField schema (.metadata/issue-fields.json)", () => {
  it("encodes lean array with single_select options", () => {
    const row = new IssueField({
      id: 10,
      nodeId: "IF_kwDOA",
      name: "Priority",
      description: "How urgent",
      dataType: "single_select",
      options: [
        {
          id: 1,
          name: "High",
          description: null,
          color: "red"
        },
        {
          id: 2,
          name: "Low",
          description: "later",
          color: "blue"
        }
      ]
    })
    const encoded = encodeIssueFieldsSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(IssueField))(encoded)
    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded[0]?.name).toBe("Priority")
    expect(decoded[0]?.dataType).toBe("single_select")
    expect(decoded[0]?.options).toHaveLength(2)
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("allows null description and omitted options", () => {
    const row = new IssueField({
      id: 3,
      nodeId: "IF_kwDOB",
      name: "Due",
      description: null,
      dataType: "date"
    })
    const encoded = Schema.encodeSync(IssueField)(row) as Record<string, unknown>
    expect(encoded).not.toHaveProperty("options")
    const roundTrip = Schema.decodeUnknownSync(IssueField)(encoded)
    expect(roundTrip.description).toBeNull()
    expect(roundTrip.dataType).toBe("date")
  })

  it("allows options: null", () => {
    const row = new IssueField({
      id: 4,
      nodeId: "IF_kwDOC",
      name: "Notes",
      description: null,
      dataType: "text",
      options: null
    })
    expect(
      Schema.decodeUnknownSync(IssueField)(Schema.encodeSync(IssueField)(row))
        .options
    ).toBeNull()
  })
})

describe("Stream.fromIterable issue fields", () => {
  it("stub-streams then sorts by id", async () => {
    const rows = [
      new IssueField({
        id: 8,
        nodeId: "a",
        name: "Z",
        description: null,
        dataType: "number"
      }),
      new IssueField({
        id: 2,
        nodeId: "b",
        name: "A",
        description: null,
        dataType: "text"
      })
    ]
    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<IssueField>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    collected.sort((a, b) => a.id - b.id)
    expect(collected.map((r) => r.id)).toEqual([2, 8])
  })
})
