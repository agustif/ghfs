/**
 * SyncSatellites stage-fold unit tests (no live GitHub).
 *
 * Copy to: src-effect/services/sync-satellites.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { SyncError } from "../domain"
import {
  isSatelliteEnabled,
  runSatelliteStages,
  type SatelliteStageSpec
} from "./sync-satellites"

describe("isSatelliteEnabled", () => {
  it("uses legacy defaults when flag absent on tip GhfsConfig shape", () => {
    const tipConfig = {
      directory: ".ghfs",
      repo: "acme/widgets",
      syncIssues: true,
      syncPulls: true
    }
    expect(isSatelliteEnabled(tipConfig, "syncDiscussions")).toBe(true)
    expect(isSatelliteEnabled(tipConfig, "syncPagesBuilds")).toBe(false)
    expect(isSatelliteEnabled(tipConfig, "syncInteractionLimits")).toBe(false)
    expect(isSatelliteEnabled(tipConfig, "syncWebhooks")).toBe(false)
    expect(isSatelliteEnabled(tipConfig, "syncPeople")).toBe(false)
    expect(isSatelliteEnabled(tipConfig, "syncLabelsAndMilestones")).toBe(true)
  })

  it("honors explicit false / true when flag present", () => {
    expect(
      isSatelliteEnabled({ syncDiscussions: false }, "syncDiscussions")
    ).toBe(false)
    expect(
      isSatelliteEnabled({ syncPagesBuilds: true }, "syncPagesBuilds")
    ).toBe(true)
  })
})

describe("runSatelliteStages", () => {
  it("folds success + error + skipped into SyncSatellitesSummary shape", async () => {
    const stages: Array<SatelliteStageSpec> = [
      {
        name: "SyncLabels",
        enabled: true,
        run: () =>
          Effect.succeed({ synced: 3, path: ".ghfs/labels.json" })
      },
      {
        name: "SyncWiki",
        enabled: true,
        run: () =>
          Effect.fail(
            new SyncError({ message: "wiki unavailable" })
          )
      },
      {
        name: "SyncPeople",
        enabled: false,
        run: () => Effect.succeed({ synced: 99, path: "should-not-run" })
      },
      {
        name: "SyncReleases",
        enabled: true,
        run: () =>
          Effect.succeed({ synced: 2, path: ".ghfs/releases/releases.json" })
      }
    ]

    const summary = await Effect.runPromise(runSatelliteStages(stages))

    expect(summary.stages).toBe(4)
    expect(summary.synced).toBe(5)
    expect(summary.errors).toBe(1)
    expect(summary.results).toHaveLength(4)

    expect(summary.results[0]).toEqual({
      name: "SyncLabels",
      synced: 3,
      path: ".ghfs/labels.json"
    })
    expect(summary.results[1]).toEqual({
      name: "SyncWiki",
      error: "wiki unavailable"
    })
    expect(summary.results[2]).toEqual({
      name: "SyncPeople",
      skipped: true
    })
    expect(summary.results[3]).toEqual({
      name: "SyncReleases",
      synced: 2,
      path: ".ghfs/releases/releases.json"
    })
  })

  it("does not abort remaining stages after a failure", async () => {
    const ran: Array<string> = []
    const stages: Array<SatelliteStageSpec> = [
      {
        name: "A",
        enabled: true,
        run: () =>
          Effect.sync(() => {
            ran.push("A")
            return { synced: 1 }
          })
      },
      {
        name: "B",
        enabled: true,
        run: () => {
          ran.push("B")
          return Effect.fail(new SyncError({ message: "boom" }))
        }
      },
      {
        name: "C",
        enabled: true,
        run: () =>
          Effect.sync(() => {
            ran.push("C")
            return { synced: 4 }
          })
      }
    ]

    const summary = await Effect.runPromise(runSatelliteStages(stages))
    expect(ran).toEqual(["A", "B", "C"])
    expect(summary.synced).toBe(5)
    expect(summary.errors).toBe(1)
  })
})
