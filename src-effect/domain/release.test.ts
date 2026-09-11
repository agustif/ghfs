/**
 * Release Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/release.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Release } from "./release"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("Release schema", () => {
  it("encodes and decodes a published release", () => {
    const release = new Release({
      id: 1,
      tagName: "v1.0.0",
      name: "First release",
      author: "alice",
      body: "Notes",
      url: "https://github.com/acme/widgets/releases/tag/v1.0.0",
      htmlUrl: "https://github.com/acme/widgets/releases/tag/v1.0.0",
      draft: false,
      prerelease: false,
      createdAt: d("2024-01-03T00:00:00.000Z"),
      publishedAt: d("2024-01-03T01:00:00.000Z")
    })

    expect(release.tagName).toBe("v1.0.0")
    expect(release.draft).toBe(false)
    expect(release.prerelease).toBe(false)

    const encoded = Schema.encodeSync(Release)(release)
    const decoded = Schema.decodeUnknownSync(Release)(encoded)
    expect(decoded.id).toBe(1)
    expect(decoded.tagName).toBe("v1.0.0")
    expect(decoded.name).toBe("First release")
    expect(decoded.author).toBe("alice")
    expect(decoded.body).toBe("Notes")
    expect(decoded.url).toContain("v1.0.0")
    expect(decoded.htmlUrl).toContain("v1.0.0")
    expect(decoded.draft).toBe(false)
    expect(decoded.prerelease).toBe(false)
  })

  it("allows null name/author/body/publishedAt and draft/prerelease flags", () => {
    const release = new Release({
      id: 2,
      tagName: "v2.0.0-rc.1",
      name: null,
      author: null,
      body: null,
      url: "https://api.github.com/repos/acme/widgets/releases/2",
      draft: true,
      prerelease: true,
      createdAt: d("2024-02-01T00:00:00.000Z"),
      publishedAt: null
    })

    const roundTrip = Schema.decodeUnknownSync(Release)(
      Schema.encodeSync(Release)(release)
    )
    expect(roundTrip.name).toBeNull()
    expect(roundTrip.author).toBeNull()
    expect(roundTrip.body).toBeNull()
    expect(roundTrip.publishedAt).toBeNull()
    expect(roundTrip.draft).toBe(true)
    expect(roundTrip.prerelease).toBe(true)
    expect(roundTrip.htmlUrl).toBeUndefined()
  })
})

describe("Stream.paginate release pages", () => {
  it("stub-decodes two pages into Release values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          id: 1,
          tagName: "v0.1.0",
          name: "Alpha",
          author: "alice",
          body: null,
          url: "https://github.com/acme/widgets/releases/tag/v0.1.0",
          draft: false,
          prerelease: true,
          createdAt: d("2024-01-01T00:00:00.000Z"),
          publishedAt: d("2024-01-01T00:00:00.000Z")
        },
        {
          id: 2,
          tagName: "v0.2.0",
          name: null,
          author: "bob",
          body: "beta",
          url: "https://github.com/acme/widgets/releases/tag/v0.2.0",
          htmlUrl: "https://github.com/acme/widgets/releases/tag/v0.2.0",
          draft: false,
          prerelease: false,
          createdAt: d("2024-01-02T00:00:00.000Z"),
          publishedAt: d("2024-01-02T00:00:00.000Z")
        }
      ],
      [
        {
          id: 3,
          tagName: "v1.0.0",
          name: "Stable",
          author: "carol",
          body: null,
          url: "https://github.com/acme/widgets/releases/tag/v1.0.0",
          draft: false,
          prerelease: false,
          createdAt: d("2024-01-03T00:00:00.000Z"),
          publishedAt: d("2024-01-03T00:00:00.000Z")
        }
      ]
    ]

    type PageState = { readonly page: number }

    const stream = Stream.paginate({ page: 0 } as PageState, (state) =>
      Effect.sync(() => {
        if (state.page >= pages.length) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(Release))(
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
        Stream.runFold(() => [] as Array<Release>, (acc, release) => {
          acc.push(release)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((r) => r.tagName)).toEqual([
      "v0.1.0",
      "v0.2.0",
      "v1.0.0"
    ])
    expect(collected[0]?.prerelease).toBe(true)
    expect(collected[1]?.htmlUrl).toContain("v0.2.0")
    expect(collected[2]?.draft).toBe(false)
  })
})
