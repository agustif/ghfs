/**
 * ActivityEvent / ActivitySummary Schema round-trips + buildActivitySummary +
 * formatEventDescription + stream stub.
 *
 * Copy to: src-effect/domain/activity-summary.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  ActivityEvent,
  ActivitySummary,
  buildActivitySummary,
  formatEventDescription
} from "./activity-summary"

const samplePushInput = {
  id: "1234567890",
  type: "PushEvent",
  actor: "agustif",
  createdAt: "2026-09-11T15:00:00.000Z",
  payload: { size: 2, ref: "refs/heads/main" }
} as const

describe("formatEventDescription", () => {
  it("formats known event types from payload (lean descriptions)", () => {
    expect(
      formatEventDescription({
        type: "PushEvent",
        payload: { size: 3, ref: "refs/heads/feat" }
      })
    ).toBe("pushed 3 commit(s) to refs/heads/feat")

    expect(
      formatEventDescription({
        type: "PullRequestEvent",
        payload: { action: "closed", number: 42 }
      })
    ).toBe("closed pull request #42")

    expect(
      formatEventDescription({
        type: "IssuesEvent",
        payload: { action: "opened", number: 7 }
      })
    ).toBe("opened issue #7")

    expect(
      formatEventDescription({
        type: "IssueCommentEvent",
        payload: { issue: { number: 9 } }
      })
    ).toBe("commented on #9")

    expect(
      formatEventDescription({
        type: "WatchEvent",
        payload: {}
      })
    ).toBe("starred the repository")
  })

  it("falls back for unknown types without dumping payload", () => {
    expect(
      formatEventDescription({ type: "GollumEvent", payload: { pages: [] } })
    ).toBe("gollum")
  })
})

describe("ActivityEvent / ActivitySummary schemas", () => {
  it("encodes ActivityEvent without payload kitchen-sink", () => {
    const event = new ActivityEvent({
      id: "1",
      type: "PushEvent",
      actor: "agustif",
      createdAt: "2026-09-11T15:00:00.000Z",
      description: "pushed 2 commit(s) to refs/heads/main"
    })

    const encoded = Schema.encodeSync(ActivityEvent)(event)
    expect(encoded).toEqual({
      id: "1",
      type: "PushEvent",
      actor: "agustif",
      createdAt: "2026-09-11T15:00:00.000Z",
      description: "pushed 2 commit(s) to refs/heads/main"
    })
    expect(encoded).not.toHaveProperty("payload")
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("org")

    const decoded = Schema.decodeUnknownSync(ActivityEvent)(encoded)
    expect(decoded.description).toContain("pushed 2")
    expect(decoded.actor).toBe("agustif")
  })

  it("allows null actor", () => {
    const decoded = Schema.decodeUnknownSync(ActivityEvent)({
      id: "2",
      type: "WatchEvent",
      actor: null,
      createdAt: "2026-09-11T15:00:00.000Z",
      description: "starred the repository"
    })
    expect(decoded.actor).toBeNull()
  })
})

describe("buildActivitySummary", () => {
  it("maps inputs to slim events with descriptions (no payload on encode)", () => {
    const summary = buildActivitySummary({
      events: [
        samplePushInput,
        {
          id: "99",
          type: "ForkEvent",
          actor: null,
          createdAt: "2026-09-10T12:00:00.000Z",
          payload: { forkee: { full_name: "other/ghfs" } }
        }
      ],
      syncedAt: "2026-09-11T15:30:00.000Z"
    })

    expect(summary.events).toHaveLength(2)
    expect(summary.events[0]?.description).toBe(
      "pushed 2 commit(s) to refs/heads/main"
    )
    expect(summary.events[1]?.description).toBe("forked to other/ghfs")
    expect(summary.events[1]?.actor).toBeNull()
    expect(summary.syncedAt).toBe("2026-09-11T15:30:00.000Z")

    const encoded = Schema.encodeSync(ActivitySummary)(summary)
    expect(JSON.stringify(encoded)).not.toMatch(/"payload"/)
    expect(encoded.events[0]).not.toHaveProperty("payload")

    const roundTrip = Schema.decodeUnknownSync(ActivitySummary)(encoded)
    expect(roundTrip.events[0]?.type).toBe("PushEvent")
    expect(roundTrip.events[1]?.description).toBe("forked to other/ghfs")
  })

  it("builds empty events when fetch is empty", () => {
    const empty = buildActivitySummary({
      events: [],
      syncedAt: "2026-09-11T15:30:00.000Z"
    })
    expect(empty.events).toEqual([])
    expect(empty.syncedAt).toBe("2026-09-11T15:30:00.000Z")
  })
})

describe("Stream.succeed activity summary", () => {
  it("stub-streams a single ActivitySummary resource", async () => {
    const summary = buildActivitySummary({
      events: [samplePushInput],
      syncedAt: "2026-09-11T15:30:00.000Z"
    })

    const collected = await Effect.runPromise(
      Stream.succeed(summary).pipe(
        Stream.runFold(() => [] as Array<ActivitySummary>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(1)
    expect(collected[0]?.events).toHaveLength(1)
    expect(collected[0]?.events[0]?.type).toBe("PushEvent")
  })
})
