/**
 * DependencyGraphSummary Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/dependency-graph-summary.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from sbom-summary / attestations-summary tests.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  DependencyGraphSummary,
  decodeDependencyGraphSummary
} from "./dependency-graph-summary"

describe("DependencyGraphSummary schema (security/dependency-graph-summary.json)", () => {
  it("encodes lean object without lastUpdated", () => {
    const row = new DependencyGraphSummary({
      hasSubmissions: true,
      submissionCount: 3,
      manifestCount: 3,
      dependencyCount: 120,
      latestSubmissionDate: null
    })
    const encoded = Schema.encodeSync(DependencyGraphSummary)(row) as Record<
      string,
      unknown
    >
    const decoded = decodeDependencyGraphSummary(encoded)
    expect(encoded).toHaveProperty("hasSubmissions", true)
    expect(encoded).toHaveProperty("manifestCount", 3)
    expect(encoded).toHaveProperty("dependencyCount", 120)
    expect(encoded).toHaveProperty("latestSubmissionDate", null)
    expect(encoded).not.toHaveProperty("lastUpdated")
    expect(encoded).not.toHaveProperty("packages")
    expect(encoded).not.toHaveProperty("synced_at")
    expect(decoded.submissionCount).toBe(3)
  })

  it("allows empty / unavailable shape (403/404 fallback)", () => {
    const empty = new DependencyGraphSummary({
      hasSubmissions: false,
      submissionCount: 0,
      manifestCount: 0,
      dependencyCount: 0,
      latestSubmissionDate: null
    })
    const encoded = Schema.encodeSync(DependencyGraphSummary)(empty)
    expect(decodeDependencyGraphSummary(encoded)).toEqual({
      hasSubmissions: false,
      submissionCount: 0,
      manifestCount: 0,
      dependencyCount: 0,
      latestSubmissionDate: null
    })
  })
})

describe("Stream.succeed dependency-graph summary", () => {
  it("stub-streams a single DependencyGraphSummary resource", async () => {
    const row = new DependencyGraphSummary({
      hasSubmissions: true,
      submissionCount: 1,
      manifestCount: 1,
      dependencyCount: 5,
      latestSubmissionDate: null
    })
    const collected = await Effect.runPromise(
      Stream.succeed(row).pipe(
        Stream.runFold(
          () => [] as Array<DependencyGraphSummary>,
          (acc, item) => {
            acc.push(item)
            return acc
          }
        )
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.dependencyCount).toBe(5)
  })
})
