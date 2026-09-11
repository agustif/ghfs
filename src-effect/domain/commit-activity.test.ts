/**
 * CommitActivity Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/commit-activity.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from activity-summary / repo-activity-event / commit-comment tests.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  CommitActivity,
  decodeCommitActivity,
  decodeCommitActivities
} from "./commit-activity"

function encodeCommitActivitySnapshot(rows: Array<CommitActivity>): unknown {
  return Schema.encodeSync(Schema.Array(CommitActivity))(rows)
}

describe("CommitActivity schema (commit-activity/commit-activity.json)", () => {
  it("encodes lean array of weekly rows", () => {
    const row = new CommitActivity({
      days: [0, 1, 2, 3, 4, 5, 6],
      total: 21,
      week: 1336280400
    })
    const encoded = encodeCommitActivitySnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(CommitActivity))(
      encoded
    )
    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded[0]?.total).toBe(21)
    expect(decoded[0]?.days).toHaveLength(7)
    expect(decoded[0]?.week).toBe(1336280400)
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("repo")
  })

  it("round-trips via decodeCommitActivity", () => {
    const row = new CommitActivity({
      days: [0, 0, 0, 0, 0, 0, 0],
      total: 0,
      week: 1
    })
    const rt = decodeCommitActivity(Schema.encodeSync(CommitActivity)(row))
    expect(rt.total).toBe(0)
    expect(rt.days).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it("decodes an array via decodeCommitActivities", () => {
    const decoded = decodeCommitActivities([
      { days: [1, 0, 0, 0, 0, 0, 0], total: 1, week: 10 },
      { days: [0, 2, 0, 0, 0, 0, 0], total: 2, week: 20 }
    ])
    expect(decoded).toHaveLength(2)
    expect(decoded[1]?.total).toBe(2)
  })
})

describe("Stream.fromIterable commit activity", () => {
  it("stub-streams then sorts by week", async () => {
    const rows = [
      new CommitActivity({ days: [0, 0, 0, 0, 0, 0, 1], total: 1, week: 200 }),
      new CommitActivity({ days: [1, 0, 0, 0, 0, 0, 0], total: 1, week: 100 })
    ]
    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(
          () => [] as Array<CommitActivity>,
          (acc, row) => {
            acc.push(row)
            return acc
          }
        )
      )
    )
    collected.sort((a, b) => a.week - b.week)
    expect(collected.map((r) => r.week)).toEqual([100, 200])
  })
})
