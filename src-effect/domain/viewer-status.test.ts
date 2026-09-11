/**
 * ViewerStatus Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/viewer-status.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { ViewerStatus, ViewerSubscription } from "./viewer-status"

describe("ViewerSubscription schema", () => {
  it("decodes subscribed / ignored / null", () => {
    expect(Schema.decodeUnknownSync(ViewerSubscription)("subscribed")).toBe(
      "subscribed"
    )
    expect(Schema.decodeUnknownSync(ViewerSubscription)("ignored")).toBe(
      "ignored"
    )
    expect(Schema.decodeUnknownSync(ViewerSubscription)(null)).toBeNull()
  })

  it("rejects unknown subscription kinds", () => {
    expect(() =>
      Schema.decodeUnknownSync(ViewerSubscription)("watching")
    ).toThrow()
  })
})

describe("ViewerStatus schema (viewer-status.json)", () => {
  it("encodes and decodes starred + subscribed", () => {
    const status = new ViewerStatus({
      starred: true,
      subscription: "subscribed"
    })
    const encoded = Schema.encodeSync(ViewerStatus)(status)
    const decoded = Schema.decodeUnknownSync(ViewerStatus)(encoded)
    expect(decoded.starred).toBe(true)
    expect(decoded.subscription).toBe("subscribed")
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("encodes not-starred + null subscription", () => {
    const status = new ViewerStatus({
      starred: false,
      subscription: null
    })
    const roundTrip = Schema.decodeUnknownSync(ViewerStatus)(
      Schema.encodeSync(ViewerStatus)(status)
    )
    expect(roundTrip.starred).toBe(false)
    expect(roundTrip.subscription).toBeNull()
  })

  it("encodes ignored subscription", () => {
    const status = new ViewerStatus({
      starred: true,
      subscription: "ignored"
    })
    expect(
      Schema.decodeUnknownSync(ViewerStatus)(
        Schema.encodeSync(ViewerStatus)(status)
      ).subscription
    ).toBe("ignored")
  })
})

describe("Stream.succeed viewer status", () => {
  it("stub-streams a single ViewerStatus", async () => {
    const status = new ViewerStatus({
      starred: true,
      subscription: "subscribed"
    })
    const collected = await Effect.runPromise(
      Stream.succeed(status).pipe(
        Stream.runFold(() => [] as Array<ViewerStatus>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.starred).toBe(true)
  })
})
