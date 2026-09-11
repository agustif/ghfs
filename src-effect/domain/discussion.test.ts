/**
 * Discussion Schema round-trips + Stream.paginate cursor stub decode.
 *
 * Copy to: src-effect/domain/discussion.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Discussion, DiscussionCategory } from "./discussion"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("DiscussionCategory schema", () => {
  it("encodes and decodes a Q&A category", () => {
    const category = new DiscussionCategory({
      id: "DIC_kwDOABcdef",
      name: "Q&A",
      slug: "q-a",
      description: "Ask the community",
      isAnswerable: true
    })

    expect(category.isAnswerable).toBe(true)
    const encoded = Schema.encodeSync(DiscussionCategory)(category)
    const decoded = Schema.decodeUnknownSync(DiscussionCategory)(encoded)
    expect(decoded.id).toBe("DIC_kwDOABcdef")
    expect(decoded.slug).toBe("q-a")
    expect(decoded.description).toBe("Ask the community")
  })

  it("allows null description", () => {
    const category = new DiscussionCategory({
      id: "DIC_kwDOGeneral",
      name: "General",
      slug: "general",
      description: null,
      isAnswerable: false
    })
    const roundTrip = Schema.decodeUnknownSync(DiscussionCategory)(
      Schema.encodeSync(DiscussionCategory)(category)
    )
    expect(roundTrip.description).toBeNull()
    expect(roundTrip.isAnswerable).toBe(false)
  })
})

describe("Discussion schema", () => {
  it("encodes and decodes an answered discussion with labels", () => {
    const discussion = new Discussion({
      id: "D_kwDOWidgets1",
      number: 12,
      title: "How do I sync?",
      author: "alice",
      body: "Details…",
      url: "https://github.com/acme/widgets/discussions/12",
      categoryId: "DIC_kwDOABcdef",
      categoryName: "Q&A",
      locked: false,
      upvoteCount: 3,
      createdAt: d("2024-03-01T00:00:00.000Z"),
      updatedAt: d("2024-03-02T00:00:00.000Z"),
      closedAt: null,
      answerChosenAt: d("2024-03-02T12:00:00.000Z"),
      answerChosenBy: "bob",
      labels: [{ name: "help", color: "0e8a16" }]
    })

    expect(discussion.number).toBe(12)
    expect(discussion.labels[0]?.color).toBe("0e8a16")

    const encoded = Schema.encodeSync(Discussion)(discussion)
    const decoded = Schema.decodeUnknownSync(Discussion)(encoded)
    expect(decoded.id).toBe("D_kwDOWidgets1")
    expect(decoded.title).toBe("How do I sync?")
    expect(decoded.author).toBe("alice")
    expect(decoded.categoryId).toBe("DIC_kwDOABcdef")
    expect(decoded.categoryName).toBe("Q&A")
    expect(decoded.answerChosenBy).toBe("bob")
    expect(decoded.upvoteCount).toBe(3)
    expect(decoded.labels).toHaveLength(1)
  })

  it("allows null author/body/url/closedAt/answer fields and omits optional category", () => {
    const discussion = new Discussion({
      id: "D_kwDOWidgets2",
      number: 1,
      title: "Hello",
      author: null,
      body: null,
      url: null,
      locked: true,
      upvoteCount: 0,
      createdAt: d("2024-01-01T00:00:00.000Z"),
      updatedAt: d("2024-01-01T00:00:00.000Z"),
      closedAt: d("2024-01-05T00:00:00.000Z"),
      answerChosenAt: null,
      answerChosenBy: null,
      labels: []
    })

    const roundTrip = Schema.decodeUnknownSync(Discussion)(
      Schema.encodeSync(Discussion)(discussion)
    )
    expect(roundTrip.author).toBeNull()
    expect(roundTrip.body).toBeNull()
    expect(roundTrip.url).toBeNull()
    expect(roundTrip.closedAt).not.toBeNull()
    expect(roundTrip.answerChosenAt).toBeNull()
    expect(roundTrip.answerChosenBy).toBeNull()
    expect(roundTrip.categoryId).toBeUndefined()
    expect(roundTrip.categoryName).toBeUndefined()
    expect(roundTrip.locked).toBe(true)
    expect(roundTrip.labels).toEqual([])
  })
})

describe("Stream.paginate discussion cursor pages", () => {
  it("stub-decodes two GraphQL-style cursor pages into Discussion values", async () => {
    const pages: Array<{
      discussions: Array<unknown>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }> = [
      {
        discussions: [
          {
            id: "D_1",
            number: 1,
            title: "First",
            author: "alice",
            body: null,
            url: "https://github.com/acme/widgets/discussions/1",
            categoryId: "DIC_qa",
            categoryName: "Q&A",
            locked: false,
            upvoteCount: 1,
            createdAt: d("2024-01-01T00:00:00.000Z"),
            updatedAt: d("2024-01-01T00:00:00.000Z"),
            closedAt: null,
            answerChosenAt: null,
            answerChosenBy: null,
            labels: [{ name: "help", color: "0e8a16" }]
          },
          {
            id: "D_2",
            number: 2,
            title: "Second",
            author: "bob",
            body: "body",
            url: null,
            locked: false,
            upvoteCount: 0,
            createdAt: d("2024-01-02T00:00:00.000Z"),
            updatedAt: d("2024-01-02T00:00:00.000Z"),
            closedAt: null,
            answerChosenAt: d("2024-01-03T00:00:00.000Z"),
            answerChosenBy: "carol",
            labels: []
          }
        ],
        pageInfo: { hasNextPage: true, endCursor: "cursor-page-1" }
      },
      {
        discussions: [
          {
            id: "D_3",
            number: 3,
            title: "Third",
            author: null,
            body: null,
            url: "https://github.com/acme/widgets/discussions/3",
            locked: true,
            upvoteCount: 5,
            createdAt: d("2024-01-04T00:00:00.000Z"),
            updatedAt: d("2024-01-04T00:00:00.000Z"),
            closedAt: d("2024-01-05T00:00:00.000Z"),
            answerChosenAt: null,
            answerChosenBy: null,
            labels: [{ name: "meta", color: "ededed" }]
          }
        ],
        pageInfo: { hasNextPage: false, endCursor: "cursor-page-2" }
      }
    ]

    type PageState = { readonly cursor: string | null }
    const byCursor = new Map<string | null, (typeof pages)[number]>([
      [null, pages[0]!],
      ["cursor-page-1", pages[1]!]
    ])

    const stream = Stream.paginate({ cursor: null } as PageState, (state) =>
      Effect.sync(() => {
        const page = byCursor.get(state.cursor)
        if (!page) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(Discussion))(
          page.discussions
        )
        const next =
          page.pageInfo.hasNextPage && page.pageInfo.endCursor
            ? Option.some({ cursor: page.pageInfo.endCursor })
            : Option.none<PageState>()
        return [decoded, next] as const
      })
    )

    const collected = await Effect.runPromise(
      stream.pipe(
        Stream.runFold(() => [] as Array<Discussion>, (acc, discussion) => {
          acc.push(discussion)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((d) => d.number)).toEqual([1, 2, 3])
    expect(collected[0]?.labels[0]?.name).toBe("help")
    expect(collected[1]?.answerChosenBy).toBe("carol")
    expect(collected[2]?.locked).toBe(true)
  })
})
