/**
 * BranchProtection Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/branch-protection.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from rule-suite.test.ts (SyncRuleSuites evaluation list).
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { BranchProtection } from "./branch-protection"

describe("BranchProtection schema (rulesets/rulesets.json)", () => {
  it("encodes lean protection with checks + reviews", () => {
    const protection = new BranchProtection({
      pattern: "main",
      requiredStatusChecks: {
        strict: true,
        contexts: ["ci", "lint"]
      },
      requiredPullRequestReviews: {
        dismissStaleReviews: true,
        requireCodeOwnerReviews: false,
        requiredApprovingReviewCount: 1
      },
      enforceAdmins: true,
      requiredLinearHistory: false,
      allowForcePushes: false,
      allowDeletions: false
    })

    const encoded = Schema.encodeSync(BranchProtection)(protection)
    const decoded = Schema.decodeUnknownSync(BranchProtection)(encoded)

    expect(decoded.pattern).toBe("main")
    expect(decoded.requiredStatusChecks?.contexts).toEqual(["ci", "lint"])
    expect(decoded.requiredPullRequestReviews?.requiredApprovingReviewCount).toBe(
      1
    )
    expect(decoded.enforceAdmins).toBe(true)
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("default_branch")
    expect(encoded).not.toHaveProperty("protection")
  })

  it("encodes null checks / reviews", () => {
    const protection = new BranchProtection({
      pattern: "develop",
      requiredStatusChecks: null,
      requiredPullRequestReviews: null,
      enforceAdmins: false,
      requiredLinearHistory: true,
      allowForcePushes: true,
      allowDeletions: false
    })
    const roundTrip = Schema.decodeUnknownSync(BranchProtection)(
      Schema.encodeSync(BranchProtection)(protection)
    )
    expect(roundTrip.requiredStatusChecks).toBeNull()
    expect(roundTrip.requiredPullRequestReviews).toBeNull()
    expect(roundTrip.requiredLinearHistory).toBe(true)
  })
})

describe("Stream.succeed / empty branch protection", () => {
  it("stub-streams a single BranchProtection when present", async () => {
    const protection = new BranchProtection({
      pattern: "main",
      requiredStatusChecks: null,
      requiredPullRequestReviews: null,
      enforceAdmins: false,
      requiredLinearHistory: false,
      allowForcePushes: false,
      allowDeletions: false
    })
    const collected = await Effect.runPromise(
      Stream.succeed(protection).pipe(
        Stream.runFold(() => [] as Array<BranchProtection>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.pattern).toBe("main")
  })

  it("stub-streams empty when protection is null (cue skip)", async () => {
    const protection: BranchProtection | null = null
    const stream =
      protection === null ? Stream.empty : Stream.succeed(protection)
    const collected = await Effect.runPromise(
      stream.pipe(
        Stream.runFold(() => [] as Array<BranchProtection>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    expect(collected).toHaveLength(0)
  })
})
