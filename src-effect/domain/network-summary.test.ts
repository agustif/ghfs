/**
 * NetworkSummary Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/network-summary.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { NetworkSummary } from "./network-summary"

describe("NetworkSummary schema (network-summary.json)", () => {
  it("encodes forks / subscribers / watchers / networkCount", () => {
    const summary = new NetworkSummary({
      forks: 12,
      subscribers: 4,
      watchers: 40,
      networkCount: 15
    })
    const encoded = Schema.encodeSync(NetworkSummary)(summary)
    const decoded = Schema.decodeUnknownSync(NetworkSummary)(encoded)
    expect(decoded.forks).toBe(12)
    expect(decoded.subscribers).toBe(4)
    expect(decoded.watchers).toBe(40)
    expect(decoded.networkCount).toBe(15)
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("encodes zero defaults", () => {
    const summary = new NetworkSummary({
      forks: 0,
      subscribers: 0,
      watchers: 0,
      networkCount: 0
    })
    const roundTrip = Schema.decodeUnknownSync(NetworkSummary)(
      Schema.encodeSync(NetworkSummary)(summary)
    )
    expect(roundTrip.forks).toBe(0)
    expect(roundTrip.networkCount).toBe(0)
  })
})

describe("Stream.succeed network summary", () => {
  it("stub-streams a single NetworkSummary", async () => {
    const summary = new NetworkSummary({
      forks: 1,
      subscribers: 2,
      watchers: 3,
      networkCount: 4
    })
    const collected = await Effect.runPromise(
      Stream.succeed(summary).pipe(
        Stream.runFold(() => [] as Array<NetworkSummary>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.watchers).toBe(3)
  })
})
