/**
 * IssueType Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/issue-type.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { IssueType } from "./issue-type"

function encodeIssueTypesSnapshot(rows: Array<IssueType>): unknown {
  return Schema.encodeSync(Schema.Array(IssueType))(rows)
}

describe("IssueType schema (.metadata/issue-types.json)", () => {
  it("encodes lean array", () => {
    const row = new IssueType({
      id: 1,
      nodeId: "IT_kwDOA",
      name: "bug",
      description: "Something broken",
      color: "red",
      isEnabled: true
    })
    const encoded = encodeIssueTypesSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(IssueType))(encoded)
    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded[0]?.name).toBe("bug")
    expect(decoded[0]?.color).toBe("red")
    expect(decoded[0]?.isEnabled).toBe(true)
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("allows null description / color", () => {
    const row = new IssueType({
      id: 2,
      nodeId: "IT_kwDOB",
      name: "task",
      description: null,
      color: null,
      isEnabled: false
    })
    const roundTrip = Schema.decodeUnknownSync(IssueType)(
      Schema.encodeSync(IssueType)(row)
    )
    expect(roundTrip.description).toBeNull()
    expect(roundTrip.color).toBeNull()
    expect(roundTrip.isEnabled).toBe(false)
  })
})

describe("Stream.fromIterable issue types", () => {
  it("stub-streams then sorts by id", async () => {
    const rows = [
      new IssueType({
        id: 9,
        nodeId: "a",
        name: "z",
        description: null,
        color: "blue",
        isEnabled: true
      }),
      new IssueType({
        id: 3,
        nodeId: "b",
        name: "a",
        description: null,
        color: "green",
        isEnabled: true
      })
    ]
    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<IssueType>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    collected.sort((a, b) => a.id - b.id)
    expect(collected.map((r) => r.id)).toEqual([3, 9])
  })
})
