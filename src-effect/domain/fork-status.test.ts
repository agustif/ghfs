/**
 * ForkStatus Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/fork-status.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { ForkStatus } from "./fork-status"

describe("ForkStatus schema (fork-status.json)", () => {
  it("encodes fork with parent + source", () => {
    const status = new ForkStatus({
      isFork: true,
      parent: {
        fullName: "acme/widgets",
        htmlUrl: "https://github.com/acme/widgets",
        defaultBranch: "main"
      },
      source: {
        fullName: "acme/widgets",
        htmlUrl: "https://github.com/acme/widgets"
      }
    })
    const encoded = Schema.encodeSync(ForkStatus)(status)
    const decoded = Schema.decodeUnknownSync(ForkStatus)(encoded)
    expect(decoded.isFork).toBe(true)
    expect(decoded.parent?.fullName).toBe("acme/widgets")
    expect(decoded.parent?.defaultBranch).toBe("main")
    expect(decoded.source?.htmlUrl).toBe("https://github.com/acme/widgets")
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("encodes non-fork defaults", () => {
    const status = new ForkStatus({
      isFork: false,
      parent: null,
      source: null
    })
    const roundTrip = Schema.decodeUnknownSync(ForkStatus)(
      Schema.encodeSync(ForkStatus)(status)
    )
    expect(roundTrip.isFork).toBe(false)
    expect(roundTrip.parent).toBeNull()
    expect(roundTrip.source).toBeNull()
  })
})

describe("Stream.succeed fork status", () => {
  it("stub-streams a single ForkStatus", async () => {
    const status = new ForkStatus({
      isFork: true,
      parent: {
        fullName: "org/base",
        htmlUrl: "https://github.com/org/base",
        defaultBranch: "master"
      },
      source: null
    })
    const collected = await Effect.runPromise(
      Stream.succeed(status).pipe(
        Stream.runFold(() => [] as Array<ForkStatus>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.parent?.defaultBranch).toBe("master")
    expect(collected[0]?.source).toBeNull()
  })
})
