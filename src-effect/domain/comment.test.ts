/**
 * Comment / ReactionSummary Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/comment.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Comment, ReactionSummary } from "./comment"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("ReactionSummary schema", () => {
  it("encodes and decodes", () => {
    const reactions = new ReactionSummary({
      plusOne: 2,
      minusOne: 0,
      laugh: 1,
      hooray: 0,
      confused: 0,
      heart: 3,
      rocket: 0,
      eyes: 1,
      totalCount: 7
    })

    const encoded = Schema.encodeSync(ReactionSummary)(reactions)
    const decoded = Schema.decodeUnknownSync(ReactionSummary)(encoded)
    expect(decoded.plusOne).toBe(2)
    expect(decoded.heart).toBe(3)
    expect(decoded.totalCount).toBe(7)
  })
})

describe("Comment schema", () => {
  it("encodes and decodes with optional reactions", () => {
    const comment = new Comment({
      id: 42,
      author: "alice",
      body: "LGTM",
      createdAt: d("2024-01-03T00:00:00.000Z"),
      updatedAt: d("2024-01-03T01:00:00.000Z"),
      reactions: new ReactionSummary({
        plusOne: 1,
        minusOne: 0,
        laugh: 0,
        hooray: 0,
        confused: 0,
        heart: 0,
        rocket: 0,
        eyes: 0,
        totalCount: 1
      }),
      subjectKind: "issue",
      subjectNumber: 7
    })

    expect(comment.id).toBe(42)
    expect(comment.subjectKind).toBe("issue")
    expect(comment.reactions?.plusOne).toBe(1)

    const encoded = Schema.encodeSync(Comment)(comment)
    const decoded = Schema.decodeUnknownSync(Comment)(encoded)
    expect(decoded.id).toBe(42)
    expect(decoded.author).toBe("alice")
    expect(decoded.body).toBe("LGTM")
    expect(decoded.subjectKind).toBe("issue")
    expect(decoded.subjectNumber).toBe(7)
    expect(decoded.reactions?.totalCount).toBe(1)
  })

  it("allows missing reactions on a pull subject", () => {
    const comment = new Comment({
      id: 99,
      author: "bob",
      body: "nit",
      createdAt: d("2024-02-01T00:00:00.000Z"),
      updatedAt: d("2024-02-01T00:00:00.000Z"),
      subjectKind: "pull",
      subjectNumber: 12
    })

    const roundTrip = Schema.decodeUnknownSync(Comment)(Schema.encodeSync(Comment)(comment))
    expect(roundTrip.subjectKind).toBe("pull")
    expect(roundTrip.subjectNumber).toBe(12)
    expect(roundTrip.reactions).toBeUndefined()
  })
})

describe("Stream.paginate comment pages", () => {
  it("stub-decodes two pages into Comment values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          id: 1,
          author: "alice",
          body: "first",
          createdAt: d("2024-01-01T00:00:00.000Z"),
          updatedAt: d("2024-01-01T00:00:00.000Z"),
          subjectKind: "issue",
          subjectNumber: 3
        },
        {
          id: 2,
          author: "bob",
          body: "second",
          createdAt: d("2024-01-02T00:00:00.000Z"),
          updatedAt: d("2024-01-02T00:00:00.000Z"),
          reactions: {
            plusOne: 1,
            minusOne: 0,
            laugh: 0,
            hooray: 0,
            confused: 0,
            heart: 0,
            rocket: 0,
            eyes: 0,
            totalCount: 1
          },
          subjectKind: "issue",
          subjectNumber: 3
        }
      ],
      [
        {
          id: 3,
          author: "carol",
          body: "third",
          createdAt: d("2024-01-03T00:00:00.000Z"),
          updatedAt: d("2024-01-03T00:00:00.000Z"),
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
        const decoded = Schema.decodeUnknownSync(Schema.Array(Comment))(pages[state.page])
        const next =
          state.page + 1 < pages.length
            ? Option.some({ page: state.page + 1 })
            : Option.none<PageState>()
        return [decoded, next] as const
      })
    )

    const collected = await Effect.runPromise(
      stream.pipe(
        Stream.runFold(() => [] as Array<Comment>, (acc, comment) => {
          acc.push(comment)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((c) => c.id)).toEqual([1, 2, 3])
    expect(collected[1]?.reactions?.plusOne).toBe(1)
    expect(collected[0]?.subjectKind).toBe("issue")
  })
})
