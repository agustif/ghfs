/**
 * AgentHintsFeatures / AgentHints Schema round-trips + buildAgentHints +
 * stream stub.
 *
 * Copy to: src-effect/domain/agent-hints.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  AgentHints,
  AgentHintsFeatures,
  buildAgentHints,
  decodeAgentHints,
  decodeAgentHintsFeatures,
  type AgentHintsInput
} from "./agent-hints"

const sampleFeatures = AgentHintsFeatures.make({
  issues: true,
  projects: false,
  wiki: false,
  mergeQueue: false
})

const leanInput: AgentHintsInput = {
  description: "GitHub as a filesystem",
  features: sampleFeatures,
  topics: ["effect", "github"],
  pinnedIssueNumbers: [12, 34],
  recentReleaseTags: ["v1.2.0", "v1.1.0"],
  totalIssues: 10,
  totalPulls: 4,
  openIssuesCount: 7,
  syncedAt: "2026-09-11T21:00:00.000Z"
}

describe("AgentHintsFeatures schema", () => {
  it("makes and round-trips nested feature flags", () => {
    const encoded = Schema.encodeSync(AgentHintsFeatures)(sampleFeatures)
    expect(encoded.issues).toBe(true)
    expect(encoded.projects).toBe(false)
    expect(encoded.wiki).toBe(false)
    expect(encoded.mergeQueue).toBe(false)
    expect(encoded).not.toHaveProperty("has_issues")
    expect(decodeAgentHintsFeatures(encoded).issues).toBe(true)
  })
})

describe("buildAgentHints", () => {
  it("builds lean snapshot without ProviderRepository / Release kitchen-sink", () => {
    const hints = buildAgentHints(leanInput)

    expect(hints.description).toBe("GitHub as a filesystem")
    expect(hints.features.issues).toBe(true)
    expect(hints.features.mergeQueue).toBe(false)
    expect(hints.topics).toEqual(["effect", "github"])
    expect(hints.pinnedIssueNumbers).toEqual([12, 34])
    expect(hints.recentReleaseTags).toEqual(["v1.2.0", "v1.1.0"])
    expect(hints.totalIssues).toBe(10)
    expect(hints.totalPulls).toBe(4)
    expect(hints.openIssuesCount).toBe(7)
    expect(hints.syncedAt).toBe("2026-09-11T21:00:00.000Z")

    const encoded = Schema.encodeSync(AgentHints)(hints)
    expect(encoded).not.toHaveProperty("repository")
    expect(encoded).not.toHaveProperty("releases")
    expect(encoded).not.toHaveProperty("pinnedIssues")
    expect(JSON.stringify(encoded)).not.toMatch(/"tag_name"/)
    expect(JSON.stringify(encoded)).not.toMatch(/"has_issues"/)
    expect(JSON.stringify(encoded)).not.toMatch(/"htmlUrl"/)
    expect(JSON.stringify(encoded)).not.toMatch(/"fullName"/)

    const roundTrip = decodeAgentHints(encoded)
    expect(roundTrip.topics).toEqual(["effect", "github"])
    expect(roundTrip.pinnedIssueNumbers).toEqual([12, 34])
    expect(roundTrip.recentReleaseTags[0]).toBe("v1.2.0")
    expect(roundTrip.features.projects).toBe(false)
  })

  it("defaults empty arrays / zero counts / null description when lean", () => {
    const hints = buildAgentHints({
      features: {
        issues: false,
        projects: false,
        wiki: false,
        mergeQueue: false
      },
      syncedAt: "2026-09-11T00:00:00.000Z"
    })

    expect(hints.description).toBeNull()
    expect(hints.topics).toEqual([])
    expect(hints.pinnedIssueNumbers).toEqual([])
    expect(hints.recentReleaseTags).toEqual([])
    expect(hints.totalIssues).toBe(0)
    expect(hints.totalPulls).toBe(0)
    expect(hints.openIssuesCount).toBe(0)

    const made = AgentHints.make({
      description: null,
      features: sampleFeatures,
      topics: [],
      pinnedIssueNumbers: [],
      recentReleaseTags: [],
      totalIssues: 0,
      totalPulls: 0,
      openIssuesCount: 0,
      syncedAt: "2026-09-11T00:00:00.000Z"
    })
    expect(made.totalIssues).toBe(0)
    expect(decodeAgentHints(Schema.encodeSync(AgentHints)(made)).description).toBeNull()
  })

  it("preserves kind-based counts (tip SyncState shape)", () => {
    const hints = buildAgentHints({
      ...leanInput,
      totalIssues: 3,
      totalPulls: 2,
      openIssuesCount: 1
    })
    expect(hints.totalIssues).toBe(3)
    expect(hints.totalPulls).toBe(2)
    expect(hints.openIssuesCount).toBe(1)
  })
})

describe("Stream.succeed agent-hints", () => {
  it("stub-streams a single AgentHints resource", async () => {
    const hints = buildAgentHints(leanInput)

    const collected = await Effect.runPromise(
      Stream.succeed(hints).pipe(
        Stream.runFold(() => [] as Array<AgentHints>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(1)
    expect(collected[0]?.topics).toEqual(["effect", "github"])
    expect(collected[0]?.recentReleaseTags).toHaveLength(2)
    expect(collected[0]?.pinnedIssueNumbers).toEqual([12, 34])
  })
})
