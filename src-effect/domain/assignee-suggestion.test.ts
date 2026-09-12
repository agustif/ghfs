/**
 * AssigneeSuggestion Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/assignee-suggestion.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from collaborator.test.ts / person.test.ts.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  AssigneeSuggestion,
  decodeAssigneeSuggestion,
  decodeAssigneeSuggestions
} from "./assignee-suggestion"

function encodeAssigneeSuggestionsSnapshot(
  rows: Array<AssigneeSuggestion>
): unknown {
  return Schema.encodeSync(Schema.Array(AssigneeSuggestion))(rows)
}

describe("AssigneeSuggestion schema (assignee-suggestions/assignee-suggestions.json)", () => {
  it("encodes lean array including required fields", () => {
    const row = new AssigneeSuggestion({
      login: "octocat",
      id: 1,
      nodeId: "MDQ6VXNlcjE=",
      avatarUrl: "https://github.com/images/error/octocat_happy.gif",
      type: "User",
      siteAdmin: false
    })
    const encoded = encodeAssigneeSuggestionsSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(AssigneeSuggestion))(
      encoded
    )
    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded[0]?.login).toBe("octocat")
    expect(decoded[0]?.nodeId).toBe("MDQ6VXNlcjE=")
    expect(decoded[0]?.avatarUrl).toContain("octocat")
    expect(decoded[0]?.siteAdmin).toBe(false)
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("permission")
    expect(encoded).not.toHaveProperty("contributions")
  })

  it("round-trips via decodeAssigneeSuggestion", () => {
    const row = new AssigneeSuggestion({
      login: "bot",
      id: 2,
      nodeId: "B_1",
      avatarUrl: "https://example.com/a.png",
      type: "Bot",
      siteAdmin: true
    })
    const rt = decodeAssigneeSuggestion(
      Schema.encodeSync(AssigneeSuggestion)(row)
    )
    expect(rt.type).toBe("Bot")
    expect(rt.siteAdmin).toBe(true)
  })

  it("encodes empty [] and decodes via decodeAssigneeSuggestions", () => {
    expect(encodeAssigneeSuggestionsSnapshot([])).toEqual([])
    const decoded = decodeAssigneeSuggestions([
      {
        login: "a",
        id: 10,
        nodeId: "n",
        avatarUrl: "u",
        type: "User",
        siteAdmin: false
      }
    ])
    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.login).toBe("a")
  })
})

describe("Stream.fromIterable assignee suggestions", () => {
  it("stub-streams then sorts by login", async () => {
    const rows = [
      new AssigneeSuggestion({
        login: "zulu",
        id: 2,
        nodeId: "n2",
        avatarUrl: "u",
        type: "User",
        siteAdmin: false
      }),
      new AssigneeSuggestion({
        login: "alpha",
        id: 1,
        nodeId: "n1",
        avatarUrl: "u",
        type: "User",
        siteAdmin: false
      })
    ]
    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(
          () => [] as Array<AssigneeSuggestion>,
          (acc, row) => {
            acc.push(row)
            return acc
          }
        )
      )
    )
    collected.sort((a, b) => a.login.localeCompare(b.login))
    expect(collected.map((r) => r.login)).toEqual(["alpha", "zulu"])
  })
})
