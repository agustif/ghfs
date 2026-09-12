/**
 * SbomSummary Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/sbom-summary.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from security-summary.test.ts (SyncSecuritySummary).
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { SbomSummary, decodeSbomSummary } from "./sbom-summary"

describe("SbomSummary schema (security/sbom-summary.json)", () => {
  it("encodes lean object without packages dump", () => {
    const row = new SbomSummary({
      name: "com.github.o/r",
      spdxVersion: "SPDX-2.3",
      packageCount: 42
    })
    const encoded = Schema.encodeSync(SbomSummary)(row) as Record<
      string,
      unknown
    >
    const decoded = decodeSbomSummary(encoded)
    expect(encoded).toHaveProperty("name", "com.github.o/r")
    expect(encoded).toHaveProperty("spdxVersion", "SPDX-2.3")
    expect(encoded).toHaveProperty("packageCount", 42)
    expect(encoded).not.toHaveProperty("packages")
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("dependabot")
    expect(decoded.packageCount).toBe(42)
  })

  it("allows null name/spdxVersion and zero packageCount (403/404 fallback)", () => {
    const empty = new SbomSummary({
      name: null,
      spdxVersion: null,
      packageCount: 0
    })
    const encoded = Schema.encodeSync(SbomSummary)(empty) as Record<
      string,
      unknown
    >
    expect(encoded).toEqual({
      name: null,
      spdxVersion: null,
      packageCount: 0
    })
    const rt = decodeSbomSummary(encoded)
    expect(rt.name).toBeNull()
    expect(rt.spdxVersion).toBeNull()
    expect(rt.packageCount).toBe(0)
  })
})

describe("Stream.succeed sbom summary", () => {
  it("stub-streams a single SbomSummary resource", async () => {
    const row = new SbomSummary({
      name: "x",
      spdxVersion: "SPDX-2.3",
      packageCount: 1
    })
    const collected = await Effect.runPromise(
      Stream.succeed(row).pipe(
        Stream.runFold(
          () => [] as Array<SbomSummary>,
          (acc, item) => {
            acc.push(item)
            return acc
          }
        )
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.packageCount).toBe(1)
  })
})
