/**
 * InteractionLimitKind / InteractionLimits Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/interaction-limits.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  InteractionLimitKind,
  InteractionLimits
} from "./interaction-limits"

describe("InteractionLimitKind schema", () => {
  it("decodes known restriction kinds", () => {
    expect(
      Schema.decodeUnknownSync(InteractionLimitKind)("existing_users")
    ).toBe("existing_users")
    expect(
      Schema.decodeUnknownSync(InteractionLimitKind)("contributors_only")
    ).toBe("contributors_only")
    expect(
      Schema.decodeUnknownSync(InteractionLimitKind)("collaborators_only")
    ).toBe("collaborators_only")
  })

  it("rejects unknown kinds", () => {
    expect(() =>
      Schema.decodeUnknownSync(InteractionLimitKind)("everyone")
    ).toThrow()
  })
})

describe("InteractionLimits schema", () => {
  it("encodes and decodes an active restriction", () => {
    const limits = new InteractionLimits({
      limit: "contributors_only",
      origin: "repository",
      expiresAt: "2026-12-01T00:00:00Z"
    })

    expect(limits.limit).toBe("contributors_only")
    expect(limits.origin).toBe("repository")
    expect(limits.expiresAt).toBe("2026-12-01T00:00:00Z")

    const encoded = Schema.encodeSync(InteractionLimits)(limits)
    const decoded = Schema.decodeUnknownSync(InteractionLimits)(encoded)
    expect(decoded.limit).toBe("contributors_only")
    expect(decoded.origin).toBe("repository")
    expect(decoded.expiresAt).toBe("2026-12-01T00:00:00Z")
  })

  it("round-trips unrestricted defaults (404 empty)", () => {
    const empty = new InteractionLimits({
      limit: null,
      origin: "repository",
      expiresAt: null
    })

    const roundTrip = Schema.decodeUnknownSync(InteractionLimits)(
      Schema.encodeSync(InteractionLimits)(empty)
    )
    expect(roundTrip.limit).toBeNull()
    expect(roundTrip.origin).toBe("repository")
    expect(roundTrip.expiresAt).toBeNull()
  })

  it("decodes organization-origin restriction", () => {
    const decoded = Schema.decodeUnknownSync(InteractionLimits)({
      limit: "existing_users",
      origin: "organization",
      expiresAt: null
    })
    expect(decoded.limit).toBe("existing_users")
    expect(decoded.origin).toBe("organization")
    expect(decoded.expiresAt).toBeNull()
  })
})

describe("Stream.succeed interaction limits", () => {
  it("stub-streams a single InteractionLimits resource", async () => {
    const limits = new InteractionLimits({
      limit: "collaborators_only",
      origin: "repository",
      expiresAt: "2026-09-15T12:00:00Z"
    })

    const collected = await Effect.runPromise(
      Stream.succeed(limits).pipe(
        Stream.runFold(() => [] as Array<InteractionLimits>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(1)
    expect(collected[0]?.limit).toBe("collaborators_only")
    expect(collected[0]?.expiresAt).toBe("2026-09-15T12:00:00Z")
  })
})
