/**
 * TrafficViews Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/traffic-views.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from traffic-referrer / traffic-path tests.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TrafficViews, decodeTrafficViews } from "./traffic-views"

describe("TrafficViews schema (traffic/views.json)", () => {
  it("encodes lean object with daily views series", () => {
    const row = new TrafficViews({
      count: 14850,
      uniques: 3782,
      views: [
        {
          timestamp: "2016-10-10T00:00:00Z",
          count: 440,
          uniques: 143
        },
        {
          timestamp: "2016-10-11T00:00:00Z",
          count: 1300,
          uniques: 400
        }
      ]
    })
    const encoded = Schema.encodeSync(TrafficViews)(row) as Record<
      string,
      unknown
    >
    const decoded = decodeTrafficViews(encoded)
    expect(encoded).toHaveProperty("count", 14850)
    expect(encoded).toHaveProperty("uniques", 3782)
    expect(Array.isArray(encoded.views)).toBe(true)
    expect(decoded.views).toHaveLength(2)
    expect(decoded.views[0]?.timestamp).toContain("2016-10-10")
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("referrer")
    expect(encoded).not.toHaveProperty("path")
  })

  it("allows empty views (403/404 fallback shape)", () => {
    const empty = new TrafficViews({ count: 0, uniques: 0, views: [] })
    const encoded = Schema.encodeSync(TrafficViews)(empty) as Record<
      string,
      unknown
    >
    expect(encoded).toEqual({ count: 0, uniques: 0, views: [] })
    const rt = decodeTrafficViews(encoded)
    expect(rt.views).toEqual([])
  })
})

describe("Stream.succeed traffic views", () => {
  it("stub-streams a single TrafficViews resource", async () => {
    const row = new TrafficViews({
      count: 1,
      uniques: 1,
      views: [{ timestamp: "2024-01-01T00:00:00Z", count: 1, uniques: 1 }]
    })
    const collected = await Effect.runPromise(
      Stream.succeed(row).pipe(
        Stream.runFold(
          () => [] as Array<TrafficViews>,
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
