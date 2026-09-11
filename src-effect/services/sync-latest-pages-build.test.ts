/**
 * Latest-pages-build observe — PagesBuild-as-snapshot + Stream stub.
 *
 * Copy to: src-effect/services/sync-latest-pages-build.test.ts
 * (NO new domain — reuses tip PagesBuild / pages-build.test.ts round-trips.)
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { PagesBuild } from "../domain/pages-build"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

/** Lean snapshot payload for pages/latest-build.json (no repo/synced_at wrapper). */
function encodeLatestBuildSnapshot(build: PagesBuild): unknown {
  return Schema.encodeSync(PagesBuild)(build)
}

describe("latest-pages-build snapshot (PagesBuild reuse)", () => {
  it("encodes a lean PagesBuild as pages/latest-build.json payload", () => {
    const build = new PagesBuild({
      url: "https://api.github.com/repos/acme/widgets/pages/builds/99",
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

    const encoded = encodeLatestBuildSnapshot(build)
    const decoded = Schema.decodeUnknownSync(PagesBuild)(encoded)
    expect(decoded.commit).toBe("abc123def")
    expect(decoded.status).toBe("built")
    expect(decoded.pusher?.login).toBe("alice")
    // No wrapper keys on lean snapshot
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("latest_build")
  })

  it("NullOr(PagesBuild) models optional latest (fetch → null)", () => {
    const Latest = Schema.NullOr(PagesBuild)
    expect(Schema.decodeUnknownSync(Latest)(null)).toBeNull()

    const build = new PagesBuild({
      url: "https://api.github.com/repos/acme/widgets/pages/builds/1",
      status: "queued",
      commit: "deadbeef",
      duration: null,
      createdAt: d("2024-02-01T00:00:00.000Z"),
      updatedAt: d("2024-02-01T00:00:00.000Z"),
      pusher: null
    })
    const roundTrip = Schema.decodeUnknownSync(Latest)(
      Schema.encodeSync(Latest)(build)
    )
    expect(roundTrip?.commit).toBe("deadbeef")
    expect(roundTrip?.status).toBe("queued")
  })
})

describe("Stream.succeed / empty latest pages build", () => {
  it("stub-streams a single PagesBuild when present", async () => {
    const build = new PagesBuild({
      url: "https://api.github.com/repos/acme/widgets/pages/builds/7",
      status: "building",
      commit: "cafebabe",
      duration: null,
      createdAt: d("2024-03-01T00:00:00.000Z"),
      updatedAt: d("2024-03-01T00:00:00.000Z"),
      pusher: { login: "bob" }
    })

    const collected = await Effect.runPromise(
      Stream.succeed(build).pipe(
        Stream.runFold(() => [] as Array<PagesBuild>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(1)
    expect(collected[0]?.commit).toBe("cafebabe")
    expect(collected[0]?.status).toBe("building")
  })

  it("stub-streams empty when latest is null (cue skip)", async () => {
    const latest: PagesBuild | null = null
    const stream =
      latest === null ? Stream.empty : Stream.succeed(latest)

    const collected = await Effect.runPromise(
      stream.pipe(
        Stream.runFold(() => [] as Array<PagesBuild>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(0)
  })

  it("Option.fromNullOr mirrors null → none for callers", () => {
    expect(Option.isNone(Option.fromNullOr(null as PagesBuild | null))).toBe(
      true
    )
    const build = new PagesBuild({
      url: "https://api.github.com/repos/acme/widgets/pages/builds/8",
      status: "errored",
      error: { message: "Page build failed." },
      commit: "00ff00",
      duration: 12,
      createdAt: d("2024-04-01T00:00:00.000Z"),
      updatedAt: d("2024-04-01T00:00:10.000Z"),
      pusher: null
    })
    const some = Option.fromNullOr(build as PagesBuild | null)
    expect(Option.isSome(some)).toBe(true)
    expect(Option.getOrThrow(some).error?.message).toBe("Page build failed.")
  })
})
