/**
 * Autolink Schema round-trips + single-fetch stream stub.
 *
 * Copy to: src-effect/domain/autolink.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Autolink, decodeAutolink, decodeAutolinks } from "./autolink"

describe("Autolink schema", () => {
  it("encodes and decodes a lean autolink with updatedAt", () => {
    const row = Autolink.make({
      id: 1,
      keyPrefix: "TICKET-",
      urlTemplate: "https://example.com/TICKET?query=<num>",
      isAlphanumeric: true,
      updatedAt: "2024-01-03T00:00:00.000Z"
    })

    expect(row.id).toBe(1)
    expect(row.keyPrefix).toBe("TICKET-")
    expect(row.urlTemplate).toContain("<num>")
    expect(row.isAlphanumeric).toBe(true)
    expect(row.updatedAt).toBe("2024-01-03T00:00:00.000Z")

    const encoded = Schema.encodeSync(Autolink)(row)
    const decoded = decodeAutolink(encoded)
    expect(decoded.id).toBe(1)
    expect(decoded.keyPrefix).toBe("TICKET-")
    expect(decoded.urlTemplate).toContain("<num>")
    expect(decoded.isAlphanumeric).toBe(true)
    expect(decoded.updatedAt).toBe("2024-01-03T00:00:00.000Z")
  })

  it("allows omitting optional updatedAt and null updatedAt", () => {
    const lean = Autolink.make({
      id: 2,
      keyPrefix: "JIRA-",
      urlTemplate: "https://jira.example.com/browse/JIRA-<num>",
      isAlphanumeric: false
    })
    const withNull = Autolink.make({
      id: 3,
      keyPrefix: "ZENDESK-",
      urlTemplate: "https://example.zendesk.com/tickets/<num>",
      isAlphanumeric: true,
      updatedAt: null
    })

    const leanRt = decodeAutolink(Schema.encodeSync(Autolink)(lean))
    expect(leanRt.updatedAt).toBeUndefined()
    expect(leanRt.isAlphanumeric).toBe(false)

    const nullRt = decodeAutolink(Schema.encodeSync(Autolink)(withNull))
    expect(nullRt.updatedAt).toBeNull()
  })

  it("decodes an array via decodeAutolinks", () => {
    const decoded = decodeAutolinks([
      {
        id: 10,
        keyPrefix: "A-",
        urlTemplate: "https://example.com/A/<num>",
        isAlphanumeric: true
      },
      {
        id: 11,
        keyPrefix: "B-",
        urlTemplate: "https://example.com/B/<num>",
        isAlphanumeric: false,
        updatedAt: null
      }
    ])
    expect(decoded).toHaveLength(2)
    expect(decoded[0]?.keyPrefix).toBe("A-")
    expect(decoded[1]?.isAlphanumeric).toBe(false)
  })
})

describe("Stream.fromIterable autolinks", () => {
  it("stub-streams Autolink rows from a single-fetch array", async () => {
    const rows = decodeAutolinks([
      {
        id: 1,
        keyPrefix: "TICKET-",
        urlTemplate: "https://example.com/TICKET?query=<num>",
        isAlphanumeric: true,
        updatedAt: "2024-01-01T00:00:00.000Z"
      },
      {
        id: 2,
        keyPrefix: "JIRA-",
        urlTemplate: "https://jira.example.com/browse/JIRA-<num>",
        isAlphanumeric: false
      }
    ])

    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<Autolink>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(2)
    expect(collected.map((r) => r.keyPrefix)).toEqual(["TICKET-", "JIRA-"])
    expect(collected[0]?.isAlphanumeric).toBe(true)
    expect(collected[1]?.updatedAt).toBeUndefined()
  })
})
