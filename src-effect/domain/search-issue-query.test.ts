/**
 * SearchIssueQueryHit / IssueQueriesSnapshot Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/search-issue-query.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  IssueQueriesSnapshot,
  SearchIssueQueryHit,
  decodeIssueQueriesSnapshot,
  decodeSearchIssueQueryHit,
  decodeSearchIssueQueryHits,
  issueSearchSource
} from "./search-issue-query"

describe("SearchIssueQueryHit schema", () => {
  it("encodes and decodes a lean issue-query hit with labels + author", () => {
    const row = SearchIssueQueryHit.make({
      type: "issue",
      source: issueSearchSource("p1-bugs"),
      timestamp: "2024-01-15T10:30:00.000Z",
      number: 42,
      title: "P1 bug in auth",
      state: "open",
      url: "https://github.com/o/r/issues/42",
      labels: ["bug", "p1"],
      author: "alice",
      created: "2024-01-01T00:00:00Z",
      updated: "2024-01-10T00:00:00Z"
    })

    expect(row.type).toBe("issue")
    expect(row.source).toBe("issue-search:p1-bugs")
    expect(row.timestamp).toBe("2024-01-15T10:30:00.000Z")
    expect(row.number).toBe(42)
    expect(row.title).toContain("P1")
    expect(row.state).toBe("open")
    expect(row.url).toContain("/issues/42")
    expect(row.labels).toEqual(["bug", "p1"])
    expect(row.author).toBe("alice")
    expect(row.created).toBe("2024-01-01T00:00:00Z")
    expect(row.updated).toBe("2024-01-10T00:00:00Z")

    const encoded = Schema.encodeSync(SearchIssueQueryHit)(row)
    const decoded = decodeSearchIssueQueryHit(encoded)
    expect(decoded.type).toBe("issue")
    expect(decoded.source).toBe("issue-search:p1-bugs")
    expect(decoded.number).toBe(42)
    expect(decoded.labels).toEqual(["bug", "p1"])
    expect(decoded.author).toBe("alice")
  })

  it("allows null author and empty labels", () => {
    const lean = SearchIssueQueryHit.make({
      type: "issue",
      source: issueSearchSource("needs-triage"),
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

    const rt = decodeSearchIssueQueryHit(Schema.encodeSync(SearchIssueQueryHit)(lean))
    expect(rt.author).toBeNull()
    expect(rt.labels).toEqual([])
    expect(rt.state).toBe("closed")
    expect(rt.source).toBe("issue-search:needs-triage")
    expect(rt.number).toBe(7)
  })

  it("rejects non-issue type via decode failure surface", () => {
    expect(() =>
      decodeSearchIssueQueryHit({
        type: "commit",
        source: "issue-search:p1-bugs",
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

  it("accepts dynamic issue-search:key sources (not mention-search Literals)", () => {
    const row = decodeSearchIssueQueryHit({
      type: "issue",
      source: "issue-search:custom-key",
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
    expect(row.source).toBe("issue-search:custom-key")
  })

  it("decodes an array via decodeSearchIssueQueryHits", () => {
    const decoded = decodeSearchIssueQueryHits([
      {
        type: "issue",
        source: "issue-search:a",
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
        source: "issue-search:b",
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
    expect(decoded[0]?.source).toBe("issue-search:a")
    expect(decoded[1]?.author).toBeNull()
    expect(decoded[1]?.state).toBe("closed")
  })
})

describe("IssueQueriesSnapshot schema", () => {
  it("encodes and decodes Record of arrays (Schema.Record friendliness)", () => {
    const snapshot = IssueQueriesSnapshot.make({
      queries: {
        "p1-bugs": [
          SearchIssueQueryHit.make({
            type: "issue",
            source: issueSearchSource("p1-bugs"),
            timestamp: "2024-01-15T10:30:00.000Z",
            number: 10,
            title: "bug",
            state: "open",
            url: "https://github.com/o/r/issues/10",
            labels: ["bug"],
            author: "dev",
            created: "2024-01-10T00:00:00Z",
            updated: "2024-01-11T00:00:00Z"
          })
        ],
        "needs-triage": []
      }
    })

    const encoded = Schema.encodeSync(IssueQueriesSnapshot)(snapshot)
    const decoded = decodeIssueQueriesSnapshot(encoded)
    expect(Object.keys(decoded.queries).sort()).toEqual(["needs-triage", "p1-bugs"])
    expect(decoded.queries["p1-bugs"]).toHaveLength(1)
    expect(decoded.queries["p1-bugs"]?.[0]?.source).toBe("issue-search:p1-bugs")
    expect(decoded.queries["needs-triage"]).toEqual([])
  })

  it("round-trips empty queries Record (default when config cast missing)", () => {
    const empty = IssueQueriesSnapshot.make({ queries: {} })
    const rt = decodeIssueQueriesSnapshot(
      Schema.encodeSync(IssueQueriesSnapshot)(empty)
    )
    expect(rt.queries).toEqual({})
  })
})

describe("issueSearchSource", () => {
  it("stamps issue-search:key", () => {
    expect(issueSearchSource("p1-bugs")).toBe("issue-search:p1-bugs")
    expect(issueSearchSource("needs-triage")).toBe("issue-search:needs-triage")
  })
})

describe("Stream.fromIterable issue-query hits", () => {
  it("stub-streams SearchIssueQueryHit rows from a flattened Record", async () => {
    const snapshot = decodeIssueQueriesSnapshot({
      queries: {
        a: [
          {
            type: "issue",
            source: "issue-search:a",
            timestamp: "2024-01-15T10:30:00.000Z",
            number: 10,
            title: "from a",
            state: "open",
            url: "https://github.com/x/y/issues/10",
            labels: [],
            author: "dev",
            created: "2024-01-10T00:00:00Z",
            updated: "2024-01-11T00:00:00Z"
          }
        ],
        b: [
          {
            type: "issue",
            source: "issue-search:b",
            timestamp: "2024-01-15T10:30:00.000Z",
            number: 20,
            title: "from b",
            state: "closed",
            url: "https://github.com/x/y/issues/20",
            labels: ["done"],
            author: "dev",
            created: "2024-01-12T00:00:00Z",
            updated: "2024-01-13T00:00:00Z"
          }
        ]
      }
    })

    const flattened = Object.keys(snapshot.queries)
      .sort((x, y) => x.localeCompare(y))
      .flatMap((key) => snapshot.queries[key] ?? [])

    const collected = await Effect.runPromise(
      Stream.fromIterable(flattened).pipe(
        Stream.runFold(() => [] as Array<SearchIssueQueryHit>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(2)
    expect(collected.map((r) => r.number)).toEqual([10, 20])
    expect(collected[0]?.type).toBe("issue")
    expect(collected[0]?.source).toBe("issue-search:a")
    expect(collected[1]?.source).toBe("issue-search:b")
    expect(collected[1]?.labels[0]).toBe("done")
  })
})
