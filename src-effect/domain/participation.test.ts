/**
 * Participation Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/participation.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from commit-activity / activity-summary tests.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Participation, decodeParticipation } from "./participation"

describe("Participation schema (participation/participation.json)", () => {
  it("encodes lean object with all + owner arrays", () => {
    const row = new Participation({
      all: [1, 2, 3, 0],
      owner: [1, 0, 1, 0]
    })
    const encoded = Schema.encodeSync(Participation)(row) as Record<string, unknown>
    const decoded = decodeParticipation(encoded)
    expect(encoded).toHaveProperty("all")
    expect(encoded).toHaveProperty("owner")
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("repo")
    expect(decoded.all).toEqual([1, 2, 3, 0])
    expect(decoded.owner).toEqual([1, 0, 1, 0])
  })

  it("allows empty arrays (202 computing / no data)", () => {
    const empty = new Participation({ all: [], owner: [] })
    const rt = decodeParticipation(Schema.encodeSync(Participation)(empty))
    expect(rt.all).toEqual([])
    expect(rt.owner).toEqual([])
  })
})

describe("Stream.succeed participation", () => {
  it("stub-streams a single Participation resource", async () => {
    const row = new Participation({
      all: [10, 20],
      owner: [5, 5]
    })
    const collected = await Effect.runPromise(
      Stream.succeed(row).pipe(
        Stream.runFold(
          () => [] as Array<Participation>,
          (acc, item) => {
            acc.push(item)
            return acc
          }
        )
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.all).toEqual([10, 20])
    expect(collected[0]?.owner).toEqual([5, 5])
  })
})
