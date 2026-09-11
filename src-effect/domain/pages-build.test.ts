/**
 * PagesBuild Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/pages-build.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { PagesBuild } from "./pages-build"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("PagesBuild schema", () => {
  it("encodes and decodes a build with error, duration, and pusher avatarUrl", () => {
    const build = new PagesBuild({
      url: "https://api.github.com/repos/acme/widgets/pages/builds/1",
      status: "built",
      error: { message: null },
      commit: "abc123def",
      duration: 3514,
      createdAt: d("2024-01-03T00:00:00.000Z"),
      updatedAt: d("2024-01-03T00:01:00.000Z"),
      pusher: {
        login: "alice",
        avatarUrl: "https://avatars.githubusercontent.com/u/1"
      }
    })

    expect(build.url).toContain("pages/builds/1")
    expect(build.status).toBe("built")
    expect(build.error?.message).toBeNull()
    expect(build.commit).toBe("abc123def")
    expect(build.duration).toBe(3514)
    expect(build.pusher?.login).toBe("alice")
    expect(build.pusher?.avatarUrl).toContain("avatars")

    const encoded = Schema.encodeSync(PagesBuild)(build)
    const decoded = Schema.decodeUnknownSync(PagesBuild)(encoded)
    expect(decoded.url).toContain("pages/builds/1")
    expect(decoded.status).toBe("built")
    expect(decoded.error).toEqual({ message: null })
    expect(decoded.commit).toBe("abc123def")
    expect(decoded.duration).toBe(3514)
    expect(decoded.pusher?.login).toBe("alice")
    expect(decoded.pusher?.avatarUrl).toContain("avatars")
  })

  it("allows null status/duration/pusher and omitting optional error", () => {
    const build = new PagesBuild({
      url: "https://api.github.com/repos/acme/widgets/pages/builds/2",
      status: null,
      commit: "deadbeef",
      duration: null,
      createdAt: d("2024-02-01T00:00:00.000Z"),
      updatedAt: d("2024-02-01T00:00:00.000Z"),
      pusher: null
    })

    const roundTrip = Schema.decodeUnknownSync(PagesBuild)(
      Schema.encodeSync(PagesBuild)(build)
    )
    expect(roundTrip.status).toBeNull()
    expect(roundTrip.duration).toBeNull()
    expect(roundTrip.pusher).toBeNull()
    expect(roundTrip.error).toBeUndefined()
  })

  it("accepts errored status with message and lean pusher without avatarUrl", () => {
    const errored = new PagesBuild({
      url: "https://api.github.com/repos/acme/widgets/pages/builds/3",
      status: "errored",
      error: { message: "Page build failed." },
      commit: "cafebabe",
      duration: 120,
      createdAt: d("2024-03-01T00:00:00.000Z"),
      updatedAt: d("2024-03-01T00:00:30.000Z"),
      pusher: { login: "bob" }
    })
    const queued = new PagesBuild({
      url: "https://api.github.com/repos/acme/widgets/pages/builds/4",
      status: "queued",
      commit: "feedface",
      duration: null,
      createdAt: d("2024-03-02T00:00:00.000Z"),
      updatedAt: d("2024-03-02T00:00:00.000Z"),
      pusher: null
    })

    expect(
      Schema.decodeUnknownSync(PagesBuild)(Schema.encodeSync(PagesBuild)(errored))
        .error?.message
    ).toBe("Page build failed.")
    expect(
      Schema.decodeUnknownSync(PagesBuild)(Schema.encodeSync(PagesBuild)(errored))
        .pusher?.avatarUrl
    ).toBeUndefined()
    expect(
      Schema.decodeUnknownSync(PagesBuild)(Schema.encodeSync(PagesBuild)(queued)).status
    ).toBe("queued")
  })

  it("accepts forward-compat unknown status strings", () => {
    const build = new PagesBuild({
      url: "https://api.github.com/repos/acme/widgets/pages/builds/5",
      status: "pending_review",
      commit: "00ff00",
      duration: null,
      createdAt: d("2024-04-01T00:00:00.000Z"),
      updatedAt: d("2024-04-01T00:00:00.000Z"),
      pusher: null
    })

    const roundTrip = Schema.decodeUnknownSync(PagesBuild)(
      Schema.encodeSync(PagesBuild)(build)
    )
    expect(roundTrip.status).toBe("pending_review")
  })
})

describe("Stream.paginate pages-builds pages", () => {
  it("stub-decodes two pages into PagesBuild values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          url: "https://api.github.com/repos/acme/widgets/pages/builds/1",
          status: "built",
          error: { message: null },
          commit: "aaa111",
          duration: 100,
          createdAt: d("2024-01-01T00:00:00.000Z"),
          updatedAt: d("2024-01-01T00:01:00.000Z"),
          pusher: {
            login: "alice",
            avatarUrl: "https://avatars.githubusercontent.com/u/1"
          }
        },
        {
          url: "https://api.github.com/repos/acme/widgets/pages/builds/2",
          status: "building",
          commit: "bbb222",
          duration: null,
          createdAt: d("2024-01-02T00:00:00.000Z"),
          updatedAt: d("2024-01-02T00:00:00.000Z"),
          pusher: { login: "bob" }
        }
      ],
      [
        {
          url: "https://api.github.com/repos/acme/widgets/pages/builds/3",
          status: null,
          commit: "ccc333",
          duration: null,
          createdAt: d("2024-01-03T00:00:00.000Z"),
          updatedAt: d("2024-01-03T00:00:00.000Z"),
          pusher: null
        }
      ]
    ]

    type PageState = { readonly page: number }

    const stream = Stream.paginate({ page: 0 } as PageState, (state) =>
      Effect.sync(() => {
        if (state.page >= pages.length) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(PagesBuild))(
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
        Stream.runFold(() => [] as Array<PagesBuild>, (acc, build) => {
          acc.push(build)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((b) => b.commit)).toEqual(["aaa111", "bbb222", "ccc333"])
    expect(collected[0]?.status).toBe("built")
    expect(collected[0]?.pusher?.avatarUrl).toContain("avatars")
    expect(collected[1]?.status).toBe("building")
    expect(collected[1]?.pusher?.login).toBe("bob")
    expect(collected[1]?.pusher?.avatarUrl).toBeUndefined()
    expect(collected[2]?.status).toBeNull()
    expect(collected[2]?.pusher).toBeNull()
  })
})
