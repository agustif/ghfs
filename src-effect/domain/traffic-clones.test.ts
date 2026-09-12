/**
 * TrafficClones Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/traffic-clones.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from traffic-views.test.ts (SyncTrafficViews — views[] not clones[]).
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TrafficClones, decodeTrafficClones } from "./traffic-clones"

describe("TrafficClones schema (traffic/clones.json)", () => {
  it("encodes lean object with daily clones series", () => {
    const row = new TrafficClones({
      count: 173,
      uniques: 128,
      clones: [
        {
          timestamp: "2016-10-10T00:00:00Z",
          count: 2,
          uniques: 1
        },
        {
          timestamp: "2016-10-11T00:00:00Z",
          count: 17,
          uniques: 16
        }
      ]
    })
    const encoded = Schema.encodeSync(TrafficClones)(row) as Record<
      string,
      unknown
    >
    const decoded = decodeTrafficClones(encoded)
    expect(encoded).toHaveProperty("count", 173)
    expect(encoded).toHaveProperty("uniques", 128)
    expect(Array.isArray(encoded.clones)).toBe(true)
    expect(decoded.clones).toHaveLength(2)
    expect(decoded.clones[0]?.timestamp).toContain("2016-10-10")
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("views")
  })

  it("allows empty clones (403/404 fallback shape)", () => {
    const empty = new TrafficClones({ count: 0, uniques: 0, clones: [] })
    const encoded = Schema.encodeSync(TrafficClones)(empty) as Record<
      string,
      unknown
    >
    expect(encoded).toEqual({ count: 0, uniques: 0, clones: [] })
    const rt = decodeTrafficClones(encoded)
    expect(rt.clones).toEqual([])
  })
})

describe("Stream.succeed traffic clones", () => {
  it("stub-streams a single TrafficClones resource", async () => {
    const row = new TrafficClones({
      count: 1,
      uniques: 1,
      clones: [{ timestamp: "2024-01-01T00:00:00Z", count: 1, uniques: 1 }]
    })
    const collected = await Effect.runPromise(
      Stream.succeed(row).pipe(
        Stream.runFold(
          () => [] as Array<TrafficClones>,
          (acc, item) => {
            acc.push(item)
            return acc
          }
        )
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.count).toBe(1)
  })
})
