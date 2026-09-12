/**
 * TrafficReferrer Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/traffic-referrer.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from network-summary.test.ts (SyncNetworkSummary).
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  TrafficReferrer,
  decodeTrafficReferrer,
  decodeTrafficReferrers
} from "./traffic-referrer"

function encodeTrafficReferrersSnapshot(
  rows: Array<TrafficReferrer>
): unknown {
  return Schema.encodeSync(Schema.Array(TrafficReferrer))(rows)
}

describe("TrafficReferrer schema (traffic/referrers.json)", () => {
  it("encodes lean array of referrer rows", () => {
    const row = new TrafficReferrer({
      referrer: "Google",
      count: 1024,
      uniques: 512
    })
    const encoded = encodeTrafficReferrersSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(TrafficReferrer))(
      encoded
    )
    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded[0]?.referrer).toBe("Google")
    expect(decoded[0]?.count).toBe(1024)
    expect(decoded[0]?.uniques).toBe(512)
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("forks")
  })

  it("round-trips via decodeTrafficReferrer", () => {
    const row = new TrafficReferrer({
      referrer: "github.com",
      count: 10,
      uniques: 8
    })
    const rt = decodeTrafficReferrer(Schema.encodeSync(TrafficReferrer)(row))
    expect(rt.referrer).toBe("github.com")
    expect(rt.uniques).toBe(8)
  })

  it("encodes empty [] and decodes via decodeTrafficReferrers", () => {
    expect(encodeTrafficReferrersSnapshot([])).toEqual([])
    const decoded = decodeTrafficReferrers([
      { referrer: "a", count: 1, uniques: 1 }
    ])
    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.referrer).toBe("a")
  })
})

describe("Stream.fromIterable traffic referrers", () => {
  it("stub-streams then sorts by count desc then referrer", async () => {
    const rows = [
      new TrafficReferrer({ referrer: "b", count: 5, uniques: 2 }),
      new TrafficReferrer({ referrer: "a", count: 10, uniques: 3 })
    ]
    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(
          () => [] as Array<TrafficReferrer>,
          (acc, row) => {
            acc.push(row)
            return acc
          }
        )
      )
    )
    collected.sort((a, b) => {
      const byCount = b.count - a.count
      return byCount !== 0 ? byCount : a.referrer.localeCompare(b.referrer)
    })
    expect(collected.map((r) => r.referrer)).toEqual(["a", "b"])
  })
})
