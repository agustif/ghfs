/**
 * Mention Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/search-mention.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  Mention,
  decodeMention,
  decodeMentions
} from "./search-mention"

describe("Mention schema", () => {
  it("encodes and decodes a lean mention with labels + author", () => {
    const row = Mention.make({
      type: "issue",
      source: "mention-search",
      timestamp: "2024-01-15T10:30:00.000Z",
      number: 42,
      title: "Mentions owner/repo in body",
      state: "open",
      url: "https://github.com/other/proj/issues/42",
      labels: ["bug", "help wanted"],
      author: "alice",
      created: "2024-01-01T00:00:00Z",
      updated: "2024-01-10T00:00:00Z"
    })

    expect(row.type).toBe("issue")
    expect(row.source).toBe("mention-search")
    expect(row.timestamp).toBe("2024-01-15T10:30:00.000Z")
    expect(row.number).toBe(42)
    expect(row.title).toContain("owner/repo")
    expect(row.state).toBe("open")
    expect(row.url).toContain("/issues/42")
    expect(row.labels).toEqual(["bug", "help wanted"])
    expect(row.author).toBe("alice")
    expect(row.created).toBe("2024-01-01T00:00:00Z")
    expect(row.updated).toBe("2024-01-10T00:00:00Z")

    const encoded = Schema.encodeSync(Mention)(row)
    const decoded = decodeMention(encoded)
    expect(decoded.type).toBe("issue")
    expect(decoded.source).toBe("mention-search")
    expect(decoded.number).toBe(42)
    expect(decoded.labels).toEqual(["bug", "help wanted"])
    expect(decoded.author).toBe("alice")
  })

  it("allows null author and empty labels", () => {
    const lean = Mention.make({
      type: "issue",
      source: "mention-search",
      timestamp: "2024-02-01T00:00:00.000Z",
      number: 7,
      title: "ghost author",
      state: "closed",
      url: "https://github.com/o/r/issues/7",
      labels: [],
      author: null,
      created: "2024-02-01T00:00:00Z",
      updated: "2024-02-02T00:00:00Z"
    })

    const rt = decodeMention(Schema.encodeSync(Mention)(lean))
    expect(rt.author).toBeNull()
    expect(rt.labels).toEqual([])
    expect(rt.state).toBe("closed")
    expect(rt.number).toBe(7)
  })

  it("rejects non-issue type via decode failure surface", () => {
    expect(() =>
      decodeMention({
        type: "commit",
        source: "mention-search",
        timestamp: "2024-01-01T00:00:00.000Z",
        number: 1,
        title: "x",
        state: "open",
        url: "https://example.com",
        labels: [],
        author: null,
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z"
      })
    ).toThrow()
  })

  it("rejects non-mention-search source via decode failure surface", () => {
    expect(() =>
      decodeMention({
        type: "issue",
        source: "issue-search:p1-bugs",
        timestamp: "2024-01-01T00:00:00.000Z",
        number: 1,
        title: "x",
        state: "open",
        url: "https://example.com",
        labels: [],
        author: "bob",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z"
      })
    ).toThrow()
  })

  it("decodes an array via decodeMentions", () => {
    const decoded = decodeMentions([
      {
        type: "issue",
        source: "mention-search",
        timestamp: "2024-01-01T00:00:00.000Z",
        number: 1,
        title: "First",
        state: "open",
        url: "https://github.com/a/b/issues/1",
        labels: ["a"],
        author: "alice",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-02T00:00:00Z"
      },
      {
        type: "issue",
        source: "mention-search",
        timestamp: "2024-01-01T00:00:00.000Z",
        number: 2,
        title: "Second",
        state: "closed",
        url: "https://github.com/c/d/issues/2",
        labels: [],
        author: null,
        created: "2024-01-03T00:00:00Z",
        updated: "2024-01-04T00:00:00Z"
      }
    ])
    expect(decoded).toHaveLength(2)
    expect(decoded[0]?.number).toBe(1)
    expect(decoded[1]?.author).toBeNull()
    expect(decoded[1]?.state).toBe("closed")
  })
})

describe("Stream.fromIterable mentions", () => {
  it("stub-streams Mention rows from a single-fetch array", async () => {
    const rows = decodeMentions([
      {
        type: "issue",
        source: "mention-search",
        timestamp: "2024-01-15T10:30:00.000Z",
        number: 10,
        title: "mentions repo",
        state: "open",
        url: "https://github.com/x/y/issues/10",
        labels: [],
        author: "dev",
        created: "2024-01-10T00:00:00Z",
        updated: "2024-01-11T00:00:00Z"
      },
      {
        type: "issue",
        source: "mention-search",
        timestamp: "2024-01-15T10:30:00.000Z",
        number: 20,
        title: "also mentions",
        state: "closed",
        url: "https://github.com/x/y/issues/20",
        labels: ["done"],
        author: "dev",
        created: "2024-01-12T00:00:00Z",
        updated: "2024-01-13T00:00:00Z"
      }
    ])

    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<Mention>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(2)
    expect(collected.map((r) => r.number)).toEqual([10, 20])
    expect(collected[0]?.type).toBe("issue")
    expect(collected[1]?.source).toBe("mention-search")
    expect(collected[1]?.labels[0]).toBe("done")
  })
})
