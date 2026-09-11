/**
 * MeAssignedItem / MeSummary Schema round-trips + buildMeSummary scan +
 * stream stub.
 *
 * Copy to: src-effect/domain/me-summary.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  buildMeSummary,
  decodeMeSummary,
  MeAssignedItem,
  MeMentionItem,
  MeReviewRequestedItem,
  MeSummary,
  type MeSummaryItemInput
} from "./me-summary"

const assignedIssue: MeSummaryItemInput = {
  number: 10,
  kind: "issue",
  state: "open",
  title: "Fix sync",
  updatedAt: "2026-09-10T12:00:00.000Z",
  assignees: ["agustif", "octocat"],
  body: "please look",
  comments: []
}

const reviewPull: MeSummaryItemInput = {
  number: 22,
  kind: "pull",
  state: "open",
  title: "Add me-summary",
  updatedAt: "2026-09-11T15:00:00.000Z",
  assignees: [],
  requestedReviewers: ["agustif"],
  body: null,
  comments: [{ body: "lgtm" }]
}

const mentionPull: MeSummaryItemInput = {
  number: 7,
  kind: "pull",
  state: "closed",
  title: "Mention me",
  updatedAt: "2026-09-09T08:00:00.000Z",
  assignees: [],
  requestedReviewers: [],
  body: "cc @agustif for review",
  comments: [{ body: "also @agustif here" }]
}

const unrelated: MeSummaryItemInput = {
  number: 99,
  kind: "issue",
  state: "open",
  title: "Other",
  updatedAt: "2026-09-11T16:00:00.000Z",
  assignees: ["octocat"],
  body: "hello @octocat",
  comments: [{ body: "nope" }]
}

describe("MeAssignedItem / MeReviewRequestedItem / MeMentionItem schemas", () => {
  it("makes and round-trips lean assigned / review / mention rows", () => {
    const assigned = MeAssignedItem.make({
      number: 1,
      kind: "issue",
      title: "A",
      state: "open",
      updatedAt: "2026-09-11T15:00:00.000Z"
    })
    const review = MeReviewRequestedItem.make({
      number: 2,
      title: "B",
      state: "open",
      updatedAt: "2026-09-11T15:00:00.000Z"
    })
    const mention = MeMentionItem.make({
      number: 3,
      kind: "pull",
      title: "C",
      state: "closed",
      updatedAt: "2026-09-11T15:00:00.000Z",
      context: "body"
    })

    expect(Schema.encodeSync(MeAssignedItem)(assigned)).not.toHaveProperty(
      "assignees"
    )
    expect(Schema.encodeSync(MeReviewRequestedItem)(review)).not.toHaveProperty(
      "requestedReviewers"
    )
    expect(Schema.encodeSync(MeMentionItem)(mention).context).toBe("body")
    expect(Schema.encodeSync(MeMentionItem)(mention)).not.toHaveProperty("body")
  })
})

describe("buildMeSummary", () => {
  it("scans assignees, review requests, and body+comment mentions (lean)", () => {
    const summary = buildMeSummary({
      items: [assignedIssue, reviewPull, mentionPull, unrelated],
      currentUser: "agustif",
      syncedAt: "2026-09-11T16:30:00.000Z"
    })

    expect(summary.assigned.map((row) => row.number)).toEqual([10])
    expect(summary.assigned[0]?.kind).toBe("issue")
    expect(summary.assigned[0]?.title).toBe("Fix sync")

    expect(summary.reviewRequested.map((row) => row.number)).toEqual([22])
    expect(summary.reviewRequested[0]?.title).toBe("Add me-summary")

    // body + first matching comment → two mention rows for #7; sorted by updatedAt desc
    expect(summary.mentions.map((row) => `${row.number}:${row.context}`)).toEqual([
      "7:body",
      "7:comment"
    ])
    expect(summary.syncedAt).toBe("2026-09-11T16:30:00.000Z")

    const encoded = Schema.encodeSync(MeSummary)(summary)
    expect(JSON.stringify(encoded)).not.toMatch(/"assignees"/)
    expect(JSON.stringify(encoded)).not.toMatch(/"requestedReviewers"/)
    expect(JSON.stringify(encoded)).not.toMatch(/"comments"/)
    // context may be the string "body"; assert no kitchen-sink body field key
    expect(JSON.stringify(encoded)).not.toMatch(/"body":/)

    const roundTrip = decodeMeSummary(encoded)
    expect(roundTrip.assigned).toHaveLength(1)
    expect(roundTrip.reviewRequested).toHaveLength(1)
    expect(roundTrip.mentions).toHaveLength(2)
  })

  it("sorts buckets by updatedAt desc and ignores empty scan fields", () => {
    const olderAssigned: MeSummaryItemInput = {
      ...assignedIssue,
      number: 1,
      updatedAt: "2026-09-01T00:00:00.000Z"
    }
    const newerAssigned: MeSummaryItemInput = {
      ...assignedIssue,
      number: 2,
      updatedAt: "2026-09-11T00:00:00.000Z"
    }
    const summary = buildMeSummary({
      items: [olderAssigned, newerAssigned],
      currentUser: "agustif",
      syncedAt: "2026-09-11T16:30:00.000Z"
    })
    expect(summary.assigned.map((row) => row.number)).toEqual([2, 1])

    // Best-effort tip SyncItemState shape: no assignees/body → empty lists
    const thinOnly = buildMeSummary({
      items: [
        {
          number: 5,
          kind: "pull",
          state: "open",
          title: "",
          updatedAt: "2026-09-11T15:00:00.000Z",
          assignees: [],
          requestedReviewers: [],
          body: null,
          comments: []
        }
      ],
      currentUser: "agustif",
      syncedAt: "2026-09-11T16:30:00.000Z"
    })
    expect(thinOnly.assigned).toEqual([])
    expect(thinOnly.reviewRequested).toEqual([])
    expect(thinOnly.mentions).toEqual([])
  })

  it("returns empty lists when currentUser is null (deviation: never null summary)", () => {
    const summary = buildMeSummary({
      items: [assignedIssue, reviewPull],
      currentUser: null,
      syncedAt: "2026-09-11T16:30:00.000Z"
    })
    expect(summary.assigned).toEqual([])
    expect(summary.reviewRequested).toEqual([])
    expect(summary.mentions).toEqual([])
    expect(summary.syncedAt).toBe("2026-09-11T16:30:00.000Z")

    const made = MeSummary.make({
      assigned: [],
      reviewRequested: [],
      mentions: [],
      syncedAt: "2026-09-11T16:30:00.000Z"
    })
    expect(made.assigned).toEqual([])
  })
})

describe("Stream.succeed me summary", () => {
  it("stub-streams a single MeSummary resource", async () => {
    const summary = buildMeSummary({
      items: [assignedIssue, reviewPull],
      currentUser: "agustif",
      syncedAt: "2026-09-11T16:30:00.000Z"
    })

    const collected = await Effect.runPromise(
      Stream.succeed(summary).pipe(
        Stream.runFold(() => [] as Array<MeSummary>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(1)
    expect(collected[0]?.assigned).toHaveLength(1)
    expect(collected[0]?.reviewRequested).toHaveLength(1)
  })
})
