/**
 * SyncItemAttachments stage-fold unit tests (no live GitHub).
 *
 * Copy to: src-effect/services/sync-item-attachments.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { SyncError } from "../domain"
import {
  isItemAttachmentEnabled,
  runItemAttachmentStages,
  type ItemAttachmentStageFns,
  type ItemAttachmentSubject
} from "./sync-item-attachments"

describe("isItemAttachmentEnabled", () => {
  it("defaults both comments + timeline on when flags absent", () => {
    const tipConfig = {
      directory: ".ghfs",
      repo: "acme/widgets",
      syncIssues: true,
      syncPulls: true
    }
    expect(isItemAttachmentEnabled(tipConfig, "syncComments")).toBe(true)
    expect(isItemAttachmentEnabled(tipConfig, "syncTimeline")).toBe(true)
  })

  it("honors explicit config flags when present", () => {
    expect(
      isItemAttachmentEnabled({ syncComments: false }, "syncComments")
    ).toBe(false)
    expect(
      isItemAttachmentEnabled({ syncTimeline: true }, "syncTimeline")
    ).toBe(true)
  })

  it("options override beats config / legacy default", () => {
    expect(
      isItemAttachmentEnabled({ syncComments: true }, "syncComments", false)
    ).toBe(false)
    expect(
      isItemAttachmentEnabled({ syncTimeline: false }, "syncTimeline", true)
    ).toBe(true)
  })
})

describe("runItemAttachmentStages", () => {
  const items: Array<ItemAttachmentSubject> = [
    { kind: "issue", number: 1 },
    { kind: "pull", number: 2 },
    { kind: "issue", number: 3 }
  ]

  it("folds success across items into SyncItemAttachmentsSummary shape", async () => {
    const stages: ItemAttachmentStageFns = {
      syncComments: (subject) =>
        Effect.succeed({ synced: subject.number }),
      syncTimeline: () => Effect.succeed({ synced: 5 })
    }

    const summary = await Effect.runPromise(
      runItemAttachmentStages(items, stages, {
        comments: true,
        timeline: true
      })
    )

    expect(summary.items).toBe(3)
    expect(summary.commentsSynced).toBe(1 + 2 + 3)
    expect(summary.timelineSynced).toBe(15)
    expect(summary.errors).toBe(0)
    expect(summary.results).toHaveLength(3)
    expect(summary.results[0]).toEqual({
      kind: "issue",
      number: 1,
      commentsSynced: 1,
      timelineSynced: 5
    })
    expect(summary.results[1]).toEqual({
      kind: "pull",
      number: 2,
      commentsSynced: 2,
      timelineSynced: 5
    })
  })

  it("isolates per-item / per-stage failures without aborting the rest", async () => {
    const ran: Array<string> = []
    const stages: ItemAttachmentStageFns = {
      syncComments: (subject) => {
        ran.push(`c-${subject.kind}-${subject.number}`)
        if (subject.number === 2) {
          return Effect.fail(new SyncError({ message: "comments boom" }))
        }
        return Effect.succeed({ synced: 1 })
      },
      syncTimeline: (subject) => {
        ran.push(`t-${subject.kind}-${subject.number}`)
        if (subject.number === 1) {
          return Effect.fail(new SyncError({ message: "timeline boom" }))
        }
        return Effect.succeed({ synced: 2 })
      }
    }

    const summary = await Effect.runPromise(
      runItemAttachmentStages(items, stages, {
        comments: true,
        timeline: true
      })
    )

    expect(ran).toEqual([
      "c-issue-1",
      "t-issue-1",
      "c-pull-2",
      "t-pull-2",
      "c-issue-3",
      "t-issue-3"
    ])
    // item1: comments ok (1), timeline fail
    // item2: comments fail, timeline ok (2)
    // item3: both ok (1 + 2)
    expect(summary.commentsSynced).toBe(2)
    expect(summary.timelineSynced).toBe(4)
    expect(summary.errors).toBe(2)
    expect(summary.results[0]).toMatchObject({
      kind: "issue",
      number: 1,
      commentsSynced: 1,
      error: "timeline: timeline boom"
    })
    expect(summary.results[0].timelineSynced).toBeUndefined()
    expect(summary.results[1]).toMatchObject({
      kind: "pull",
      number: 2,
      timelineSynced: 2,
      error: "comments: comments boom"
    })
    expect(summary.results[1].commentsSynced).toBeUndefined()
    expect(summary.results[2]).toEqual({
      kind: "issue",
      number: 3,
      commentsSynced: 1,
      timelineSynced: 2
    })
  })

  it("respects comments/timeline off and maxItems cap", async () => {
    const ran: Array<string> = []
    const stages: ItemAttachmentStageFns = {
      syncComments: (subject) =>
        Effect.sync(() => {
          ran.push(`c-${subject.number}`)
          return { synced: 1 }
        }),
      syncTimeline: (subject) =>
        Effect.sync(() => {
          ran.push(`t-${subject.number}`)
          return { synced: 1 }
        })
    }

    const summary = await Effect.runPromise(
      runItemAttachmentStages(items, stages, {
        comments: true,
        timeline: false,
        maxItems: 2
      })
    )

    expect(ran).toEqual(["c-1", "c-2"])
    expect(summary.items).toBe(2)
    expect(summary.commentsSynced).toBe(2)
    expect(summary.timelineSynced).toBe(0)
    expect(summary.errors).toBe(0)
    expect(summary.results[0]).toEqual({
      kind: "issue",
      number: 1,
      commentsSynced: 1
    })
  })

  it("returns empty fold for zero subjects", async () => {
    const stages: ItemAttachmentStageFns = {
      syncComments: () => Effect.succeed({ synced: 99 }),
      syncTimeline: () => Effect.succeed({ synced: 99 })
    }
    const summary = await Effect.runPromise(
      runItemAttachmentStages([], stages, { comments: true, timeline: true })
    )
    expect(summary).toEqual({
      items: 0,
      commentsSynced: 0,
      timelineSynced: 0,
      errors: 0,
      results: []
    })
  })
})
