/**
 * RepoActivityEvent Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/repo-activity-event.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from activity-summary.test.ts (slim ActivityEvent + description).
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { RepoActivityEvent } from "./repo-activity-event"

function encodeActivityEventsSnapshot(
  rows: Array<RepoActivityEvent>
): unknown {
  return Schema.encodeSync(Schema.Array(RepoActivityEvent))(rows)
}

describe("RepoActivityEvent schema (activity.json)", () => {
  it("encodes lean array WITH payload (raw list)", () => {
    const row = new RepoActivityEvent({
      id: "1234567890",
      type: "PushEvent",
      actor: "alice",
      createdAt: "2024-10-01T12:00:00Z",
      payload: { ref: "refs/heads/main", size: 2 }
    })

    const encoded = encodeActivityEventsSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(RepoActivityEvent))(
      encoded
    )

    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.type).toBe("PushEvent")
    expect(decoded[0]?.payload).toEqual({ ref: "refs/heads/main", size: 2 })
    expect(decoded[0]).not.toHaveProperty("description")
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("events")
  })

  it("allows null actor and empty payload", () => {
    const row = new RepoActivityEvent({
      id: "1",
      type: "WatchEvent",
      actor: null,
      createdAt: "2024-11-01T00:00:00Z",
      payload: {}
    })
    const roundTrip = Schema.decodeUnknownSync(RepoActivityEvent)(
      Schema.encodeSync(RepoActivityEvent)(row)
    )
    expect(roundTrip.actor).toBeNull()
    expect(roundTrip.payload).toEqual({})
  })
})

describe("Stream.fromIterable activity events", () => {
  it("stub-streams then sorts by createdAt desc", async () => {
    const rows = [
      new RepoActivityEvent({
        id: "a",
        type: "IssuesEvent",
        actor: "a",
        createdAt: "2024-01-01T00:00:00Z",
        payload: {}
      }),
      new RepoActivityEvent({
        id: "b",
        type: "PushEvent",
        actor: "b",
        createdAt: "2024-06-01T00:00:00Z",
        payload: { size: 1 }
      })
    ]

    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<RepoActivityEvent>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    collected.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    expect(collected.map((r) => r.id)).toEqual(["b", "a"])
  })
})
