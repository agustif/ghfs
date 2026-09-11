/**
 * TimelineEvent Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/timeline-event.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TimelineEvent } from "./timeline-event"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("TimelineEvent schema", () => {
  it("encodes and decodes a labeled event with payload", () => {
    const event = new TimelineEvent({
      id: "42",
      kind: "labeled",
      createdAt: d("2024-01-03T00:00:00.000Z"),
      actor: "alice",
      subjectKind: "issue",
      subjectNumber: 7,
      payload: {
        label: { name: "bug", color: "d73a4a" }
      }
    })

    expect(event.id).toBe("42")
    expect(event.kind).toBe("labeled")
    expect(event.subjectKind).toBe("issue")
    expect(event.actor).toBe("alice")

    const encoded = Schema.encodeSync(TimelineEvent)(event)
    const decoded = Schema.decodeUnknownSync(TimelineEvent)(encoded)
    expect(decoded.id).toBe("42")
    expect(decoded.kind).toBe("labeled")
    expect(decoded.subjectNumber).toBe(7)
    expect(decoded.payload?.label).toEqual({ name: "bug", color: "d73a4a" })
  })

  it("allows missing actor/payload on a pull subject", () => {
    const event = new TimelineEvent({
      id: "commit:abc123",
      kind: "committed",
      createdAt: d("2024-02-01T00:00:00.000Z"),
      subjectKind: "pull",
      subjectNumber: 12,
      payload: { sha: "abc123", commitMessage: "fix: nits" }
    })

    const roundTrip = Schema.decodeUnknownSync(TimelineEvent)(
      Schema.encodeSync(TimelineEvent)(event)
    )
    expect(roundTrip.subjectKind).toBe("pull")
    expect(roundTrip.subjectNumber).toBe(12)
    expect(roundTrip.actor).toBeUndefined()
    expect(roundTrip.kind).toBe("committed")
    expect(roundTrip.payload?.sha).toBe("abc123")
  })

  it("accepts unknown kind for unmapped wire events", () => {
    const event = new TimelineEvent({
      id: "99",
      kind: "unknown",
      createdAt: d("2024-03-01T00:00:00.000Z"),
      actor: "bot",
      subjectKind: "issue",
      subjectNumber: 1,
      payload: { rawKind: "auto_merge_enabled" }
    })

    const decoded = Schema.decodeUnknownSync(TimelineEvent)(
      Schema.encodeSync(TimelineEvent)(event)
    )
    expect(decoded.kind).toBe("unknown")
    expect(decoded.payload?.rawKind).toBe("auto_merge_enabled")
  })
})

describe("Stream.paginate timeline pages", () => {
  it("stub-decodes two pages into TimelineEvent values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          id: "1",
          kind: "reopened",
          createdAt: d("2024-01-01T00:00:00.000Z"),
          actor: "alice",
          subjectKind: "issue",
          subjectNumber: 3
        },
        {
          id: "2",
          kind: "labeled",
          createdAt: d("2024-01-02T00:00:00.000Z"),
          actor: "bob",
          subjectKind: "issue",
          subjectNumber: 3,
          payload: { label: { name: "enhancement", color: "a2eeef" } }
        }
      ],
      [
        {
          id: "3",
          kind: "closed",
          createdAt: d("2024-01-03T00:00:00.000Z"),
          actor: "carol",
          subjectKind: "issue",
          subjectNumber: 3
        }
      ]
    ]

    type PageState = { readonly page: number }

    const stream = Stream.paginate({ page: 0 } as PageState, (state) =>
      Effect.sync(() => {
        if (state.page >= pages.length) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(TimelineEvent))(
          pages[state.page]
        )
        const next =
          state.page + 1 < pages.length
            ? Option.some({ page: state.page + 1 })
            : Option.none<PageState>()
        return [decoded, next] as const
      })
    )

    const collected = await Effect.runPromise(
      stream.pipe(
        Stream.runFold(() => [] as Array<TimelineEvent>, (acc, event) => {
          acc.push(event)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((e) => e.id)).toEqual(["1", "2", "3"])
    expect(collected.map((e) => e.kind)).toEqual([
      "reopened",
      "labeled",
      "closed"
    ])
    expect(collected[1]?.payload?.label).toEqual({
      name: "enhancement",
      color: "a2eeef"
    })
    expect(collected[0]?.subjectKind).toBe("issue")
  })
})
