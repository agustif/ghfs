/**
 * TrafficPath Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/traffic-path.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from traffic-referrer.test.ts (SyncTrafficReferrers).
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  TrafficPath,
  decodeTrafficPath,
  decodeTrafficPaths
} from "./traffic-path"

function encodeTrafficPathsSnapshot(rows: Array<TrafficPath>): unknown {
  return Schema.encodeSync(Schema.Array(TrafficPath))(rows)
}

describe("TrafficPath schema (traffic/paths.json)", () => {
  it("encodes lean array of path rows", () => {
    const row = new TrafficPath({
      path: "/github/hubot",
      title: "github/hubot: A customizable life embetterment robot.",
      count: 3542,
      uniques: 2225
    })
    const encoded = encodeTrafficPathsSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(TrafficPath))(encoded)
    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded[0]?.path).toBe("/github/hubot")
    expect(decoded[0]?.title).toContain("hubot")
    expect(decoded[0]?.count).toBe(3542)
    expect(decoded[0]?.uniques).toBe(2225)
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("referrer")
  })

  it("round-trips via decodeTrafficPath", () => {
    const row = new TrafficPath({
      path: "/readme",
      title: "README",
      count: 10,
      uniques: 8
    })
    const rt = decodeTrafficPath(Schema.encodeSync(TrafficPath)(row))
    expect(rt.path).toBe("/readme")
    expect(rt.title).toBe("README")
  })

  it("encodes empty [] and decodes via decodeTrafficPaths", () => {
    expect(encodeTrafficPathsSnapshot([])).toEqual([])
    const decoded = decodeTrafficPaths([
      { path: "/a", title: "A", count: 1, uniques: 1 }
    ])
    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.path).toBe("/a")
  })
})

describe("Stream.fromIterable traffic paths", () => {
  it("stub-streams then sorts by count desc then path", async () => {
    const rows = [
      new TrafficPath({ path: "/b", title: "B", count: 5, uniques: 2 }),
      new TrafficPath({ path: "/a", title: "A", count: 10, uniques: 3 })
    ]
    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(
          () => [] as Array<TrafficPath>,
          (acc, row) => {
            acc.push(row)
            return acc
          }
        )
      )
    )
    collected.sort((a, b) => {
      const byCount = b.count - a.count
      return byCount !== 0 ? byCount : a.path.localeCompare(b.path)
    })
    expect(collected.map((r) => r.path)).toEqual(["/a", "/b"])
  })
})
