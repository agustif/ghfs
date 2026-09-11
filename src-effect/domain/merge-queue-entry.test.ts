/**
 * MergeQueueEntry Schema round-trips + Stream.paginate cursor stub decode.
 *
 * Copy to: src-effect/domain/merge-queue-entry.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { MergeQueueEntry } from "./merge-queue-entry"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("MergeQueueEntry schema", () => {
  it("encodes and decodes a queued entry with optional shas and ETA", () => {
    const entry = new MergeQueueEntry({
      position: 1,
      state: "QUEUED",
      enqueuedAt: d("2024-06-01T12:00:00.000Z"),
      estimatedTimeToMerge: "120",
      pullRequestNumber: 42,
      pullRequestTitle: "feat: ship widgets",
      pullRequestAuthor: "alice",
      pullRequestUrl: "https://github.com/acme/widgets/pull/42",
      baseSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      headSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    })

    expect(entry.position).toBe(1)
    expect(entry.state).toBe("QUEUED")
    expect(entry.pullRequestNumber).toBe(42)
    expect(entry.pullRequestAuthor).toBe("alice")

    const encoded = Schema.encodeSync(MergeQueueEntry)(entry)
    const decoded = Schema.decodeUnknownSync(MergeQueueEntry)(encoded)
    expect(decoded.position).toBe(1)
    expect(decoded.state).toBe("QUEUED")
    expect(decoded.estimatedTimeToMerge).toBe("120")
    expect(decoded.pullRequestTitle).toBe("feat: ship widgets")
    expect(decoded.pullRequestUrl).toContain("/pull/42")
    expect(decoded.baseSha).toMatch(/^a{40}$/)
    expect(decoded.headSha).toMatch(/^b{40}$/)
  })

  it("allows null author/url and omits optional ETA/shas", () => {
    const entry = new MergeQueueEntry({
      position: 2,
      state: "AWAITING_CHECKS",
      enqueuedAt: d("2024-06-02T00:00:00.000Z"),
      pullRequestNumber: 7,
      pullRequestTitle: "fix: flaky test",
      pullRequestAuthor: null,
      pullRequestUrl: null
    })

    const roundTrip = Schema.decodeUnknownSync(MergeQueueEntry)(
      Schema.encodeSync(MergeQueueEntry)(entry)
    )
    expect(roundTrip.state).toBe("AWAITING_CHECKS")
    expect(roundTrip.pullRequestAuthor).toBeNull()
    expect(roundTrip.pullRequestUrl).toBeNull()
    expect(roundTrip.estimatedTimeToMerge).toBeUndefined()
    expect(roundTrip.baseSha).toBeUndefined()
    expect(roundTrip.headSha).toBeUndefined()
  })

  it("accepts known states and forward-compat unknown state strings", () => {
    for (const state of [
      "LOCKED",
      "MERGEABLE",
      "UNMERGEABLE",
      "FUTURE_STATE"
    ] as const) {
      const entry = new MergeQueueEntry({
        position: 3,
        state,
        enqueuedAt: d("2024-06-03T00:00:00.000Z"),
        estimatedTimeToMerge: null,
        pullRequestNumber: 99,
        pullRequestTitle: "chore",
        pullRequestAuthor: "bob",
        pullRequestUrl: "https://github.com/acme/widgets/pull/99",
        baseSha: null,
        headSha: null
      })
      const roundTrip = Schema.decodeUnknownSync(MergeQueueEntry)(
        Schema.encodeSync(MergeQueueEntry)(entry)
      )
      expect(roundTrip.state).toBe(state)
      expect(roundTrip.estimatedTimeToMerge).toBeNull()
      expect(roundTrip.baseSha).toBeNull()
      expect(roundTrip.headSha).toBeNull()
    }
  })
})

describe("Stream.paginate merge-queue pages", () => {
  it("stub-decodes two GraphQL cursor pages into MergeQueueEntry values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          position: 1,
          state: "QUEUED",
          enqueuedAt: d("2024-06-01T00:00:00.000Z"),
          estimatedTimeToMerge: "60",
          pullRequestNumber: 10,
          pullRequestTitle: "PR ten",
          pullRequestAuthor: "alice",
          pullRequestUrl: "https://github.com/acme/widgets/pull/10",
          headSha: "1111111111111111111111111111111111111111"
        },
        {
          position: 2,
          state: "AWAITING_CHECKS",
          enqueuedAt: d("2024-06-01T01:00:00.000Z"),
          pullRequestNumber: 11,
          pullRequestTitle: "PR eleven",
          pullRequestAuthor: null,
          pullRequestUrl: null
        }
      ],
      [
        {
          position: 3,
          state: "MERGEABLE",
          enqueuedAt: d("2024-06-01T02:00:00.000Z"),
          estimatedTimeToMerge: null,
          pullRequestNumber: 12,
          pullRequestTitle: "PR twelve",
          pullRequestAuthor: "carol",
          pullRequestUrl: "https://github.com/acme/widgets/pull/12",
          baseSha: "2222222222222222222222222222222222222222",
          headSha: "3333333333333333333333333333333333333333"
        }
      ]
    ]

    type PageState = { readonly cursor: string | null }

    const stream = Stream.paginate({ cursor: null } as PageState, (state) =>
      Effect.sync(() => {
        const pageIndex =
          state.cursor === null ? 0 : state.cursor === "cursor-1" ? 1 : 2
        if (pageIndex >= pages.length) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(MergeQueueEntry))(
          pages[pageIndex]
        )
        const next =
          pageIndex + 1 < pages.length
            ? Option.some({ cursor: `cursor-${pageIndex + 1}` })
            : Option.none<PageState>()
        return [decoded, next] as const
      })
    )

    const collected = await Effect.runPromise(
      stream.pipe(
        Stream.runFold(() => [] as Array<MergeQueueEntry>, (acc, entry) => {
          acc.push(entry)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((e) => e.pullRequestNumber)).toEqual([10, 11, 12])
    expect(collected[0]?.state).toBe("QUEUED")
    expect(collected[0]?.estimatedTimeToMerge).toBe("60")
    expect(collected[0]?.headSha).toMatch(/^1{40}$/)
    expect(collected[1]?.state).toBe("AWAITING_CHECKS")
    expect(collected[1]?.pullRequestAuthor).toBeNull()
    expect(collected[2]?.state).toBe("MERGEABLE")
    expect(collected[2]?.baseSha).toMatch(/^2{40}$/)
  })
})
