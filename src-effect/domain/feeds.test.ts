/**
 * Feeds Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/feeds.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Feeds } from "./feeds"

describe("Feeds schema (feeds.json)", () => {
  it("encodes timelineUrl + userUrl", () => {
    const feeds = new Feeds({
      timelineUrl: "https://github.com/timeline",
      userUrl: "https://github.com/{user}"
    })
    const encoded = Schema.encodeSync(Feeds)(feeds)
    const decoded = Schema.decodeUnknownSync(Feeds)(encoded)
    expect(decoded.timelineUrl).toBe("https://github.com/timeline")
    expect(decoded.userUrl).toBe("https://github.com/{user}")
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("encodes null defaults", () => {
    const feeds = new Feeds({
      timelineUrl: null,
      userUrl: null
    })
    const roundTrip = Schema.decodeUnknownSync(Feeds)(
      Schema.encodeSync(Feeds)(feeds)
    )
    expect(roundTrip.timelineUrl).toBeNull()
    expect(roundTrip.userUrl).toBeNull()
  })
})

describe("Stream.succeed feeds", () => {
  it("stub-streams a single Feeds", async () => {
    const feeds = new Feeds({
      timelineUrl: "https://github.com/timeline",
      userUrl: null
    })
    const collected = await Effect.runPromise(
      Stream.succeed(feeds).pipe(
        Stream.runFold(() => [] as Array<Feeds>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.timelineUrl).toBe("https://github.com/timeline")
    expect(collected[0]?.userUrl).toBeNull()
  })
})
