/**
 * WikiPage Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/wiki-page.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { WikiPage } from "./wiki-page"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("WikiPage schema", () => {
  it("encodes and decodes a content page with author/updatedAt/htmlUrl", () => {
    const page = new WikiPage({
      name: "Home",
      title: "Home",
      content: "# Welcome\n\nHello wiki.",
      author: "alice",
      updatedAt: d("2024-04-01T12:00:00.000Z"),
      htmlUrl: "https://github.com/acme/widgets/wiki/Home"
    })

    expect(page.name).toBe("Home")
    expect(page.title).toBe("Home")
    expect(page.author).toBe("alice")

    const encoded = Schema.encodeSync(WikiPage)(page)
    const decoded = Schema.decodeUnknownSync(WikiPage)(encoded)
    expect(decoded.name).toBe("Home")
    expect(decoded.title).toBe("Home")
    expect(decoded.content).toContain("Welcome")
    expect(decoded.author).toBe("alice")
    expect(decoded.htmlUrl).toContain("/wiki/Home")
  })

  it("allows null content/author/updatedAt and omits optional htmlUrl", () => {
    const page = new WikiPage({
      name: "_Sidebar",
      title: "Sidebar",
      content: null,
      author: null,
      updatedAt: null
    })

    const roundTrip = Schema.decodeUnknownSync(WikiPage)(
      Schema.encodeSync(WikiPage)(page)
    )
    expect(roundTrip.name).toBe("_Sidebar")
    expect(roundTrip.title).toBe("Sidebar")
    expect(roundTrip.content).toBeNull()
    expect(roundTrip.author).toBeNull()
    expect(roundTrip.updatedAt).toBeNull()
    expect(roundTrip.htmlUrl).toBeUndefined()
  })
})

describe("Stream.paginate wiki pages", () => {
  it("stub-decodes two pages into WikiPage values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          name: "Home",
          title: "Home",
          content: "# Home",
          author: "alice",
          updatedAt: d("2024-01-01T00:00:00.000Z"),
          htmlUrl: "https://github.com/acme/widgets/wiki/Home"
        },
        {
          name: "Getting-Started",
          title: "Getting Started",
          content: null,
          author: "bob",
          updatedAt: d("2024-01-02T00:00:00.000Z")
        }
      ],
      [
        {
          name: "_Sidebar",
          title: "Sidebar",
          content: "* [Home](Home)",
          author: null,
          updatedAt: null
        }
      ]
    ]

    type PageState = { readonly page: number }

    const stream = Stream.paginate({ page: 0 } as PageState, (state) =>
      Effect.sync(() => {
        if (state.page >= pages.length) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(WikiPage))(
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
        Stream.runFold(() => [] as Array<WikiPage>, (acc, page) => {
          acc.push(page)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((p) => p.name)).toEqual([
      "Home",
      "Getting-Started",
      "_Sidebar"
    ])
    expect(collected[0]?.htmlUrl).toContain("/wiki/Home")
    expect(collected[1]?.content).toBeNull()
    expect(collected[2]?.author).toBeNull()
  })
})
