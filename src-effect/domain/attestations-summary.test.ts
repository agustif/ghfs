/**
 * AttestationsSummary Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/attestations-summary.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from sbom-summary / security-summary tests.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  AttestationsSummary,
  decodeAttestationsSummary
} from "./attestations-summary"

describe("AttestationsSummary schema (security/attestations-summary.json)", () => {
  it("encodes lean object with totalCount only", () => {
    const row = new AttestationsSummary({ totalCount: 7 })
    const encoded = Schema.encodeSync(AttestationsSummary)(row) as Record<
      string,
      unknown
    >
    const decoded = decodeAttestationsSummary(encoded)
    expect(encoded).toEqual({ totalCount: 7 })
    expect(encoded).not.toHaveProperty("attestations")
    expect(encoded).not.toHaveProperty("total")
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("packages")
    expect(decoded.totalCount).toBe(7)
  })

  it("allows zero totalCount (403/404 fallback)", () => {
    const empty = new AttestationsSummary({ totalCount: 0 })
    const encoded = Schema.encodeSync(AttestationsSummary)(empty)
    expect(decodeAttestationsSummary(encoded).totalCount).toBe(0)
  })
})

describe("Stream.succeed attestations summary", () => {
  it("stub-streams a single AttestationsSummary resource", async () => {
    const row = new AttestationsSummary({ totalCount: 3 })
    const collected = await Effect.runPromise(
      Stream.succeed(row).pipe(
        Stream.runFold(
          () => [] as Array<AttestationsSummary>,
          (acc, item) => {
            acc.push(item)
            return acc
          }
        )
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.totalCount).toBe(3)
  })
})
