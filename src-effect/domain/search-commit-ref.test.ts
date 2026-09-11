/**
 * CommitRef Schema round-trips + extractIssueReferences units + stream stub.
 *
 * Copy to: src-effect/domain/search-commit-ref.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  CommitRef,
  decodeCommitRef,
  decodeCommitRefs,
  extractIssueReferences
} from "./search-commit-ref"

describe("extractIssueReferences", () => {
  it("extracts a single fixes #N reference", () => {
    expect(extractIssueReferences("fixes #123")).toEqual([123])
  })

  it("extracts multiple closing keywords (Fixes/Closes/Resolves)", () => {
    expect(
      extractIssueReferences("Fix bug\n\nFixes #123\nCloses #456\nResolves #789")
    ).toEqual([123, 456, 789])
  })

  it("dedupes repeated issue numbers", () => {
    expect(extractIssueReferences("fixes #10 and also closes #10")).toEqual([10])
  })

  it("matches fix/close/resolve without es/ed suffix", () => {
    expect(extractIssueReferences("fix #1 close #2 resolve #3")).toEqual([1, 2, 3])
  })

  it("matches fixed/closed/resolved past tense", () => {
    expect(extractIssueReferences("fixed #11 closed #22 resolved #33")).toEqual([
      11, 22, 33
    ])
  })

  it("is case-insensitive", () => {
    expect(extractIssueReferences("FIXES #9 ClOsEs #8")).toEqual([9, 8])
  })

  it("returns empty when no closing-keyword references", () => {
    expect(extractIssueReferences("refactor helpers; see issue 42")).toEqual([])
    expect(extractIssueReferences("mentions #99 without keyword")).toEqual([])
    expect(extractIssueReferences("")).toEqual([])
  })

  it("ignores non-digit after #", () => {
    expect(extractIssueReferences("fixes #abc closes #")).toEqual([])
  })
})

describe("CommitRef schema", () => {
  it("encodes and decodes a lean commit-ref with references", () => {
    const row = CommitRef.make({
      type: "commit",
      source: "commit-search",
      timestamp: "2024-01-15T10:30:00.000Z",
      sha: "def456abc",
      message: "fixes #123",
      author: "testuser",
      date: "2024-01-01T00:00:00Z",
      url: "https://github.com/owner/repo/commit/def456abc",
      references: [123]
    })

    expect(row.type).toBe("commit")
    expect(row.source).toBe("commit-search")
    expect(row.timestamp).toBe("2024-01-15T10:30:00.000Z")
    expect(row.sha).toBe("def456abc")
    expect(row.message).toBe("fixes #123")
    expect(row.author).toBe("testuser")
    expect(row.date).toBe("2024-01-01T00:00:00Z")
    expect(row.url).toContain("def456abc")
    expect(row.references).toEqual([123])

    const encoded = Schema.encodeSync(CommitRef)(row)
    const decoded = decodeCommitRef(encoded)
    expect(decoded.type).toBe("commit")
    expect(decoded.source).toBe("commit-search")
    expect(decoded.sha).toBe("def456abc")
    expect(decoded.references).toEqual([123])
  })

  it("allows empty references array at schema level", () => {
    const lean = CommitRef.make({
      type: "commit",
      source: "commit-search",
      timestamp: "2024-02-01T00:00:00.000Z",
      sha: "deadbeef",
      message: "chore: no closing keywords",
      author: "bot",
      date: "2024-02-01T00:00:00Z",
      url: "https://github.com/owner/repo/commit/deadbeef",
      references: []
    })

    const rt = decodeCommitRef(Schema.encodeSync(CommitRef)(lean))
    expect(rt.references).toEqual([])
    expect(rt.sha).toBe("deadbeef")
  })

  it("rejects non-commit type via decode failure surface", () => {
    expect(() =>
      decodeCommitRef({
        type: "code",
        source: "commit-search",
        timestamp: "2024-01-01T00:00:00.000Z",
        sha: "1",
        message: "fixes #1",
        author: "a",
        date: "2024-01-01T00:00:00Z",
        url: "https://example.com",
        references: [1]
      })
    ).toThrow()
  })

  it("decodes an array via decodeCommitRefs", () => {
    const decoded = decodeCommitRefs([
      {
        type: "commit",
        source: "commit-search",
        timestamp: "2024-01-01T00:00:00.000Z",
        sha: "aaa",
        message: "Fixes #1",
        author: "alice",
        date: "2024-01-01T00:00:00Z",
        url: "https://github.com/o/r/commit/aaa",
        references: [1]
      },
      {
        type: "commit",
        source: "commit-search",
        timestamp: "2024-01-01T00:00:00.000Z",
        sha: "bbb",
        message: "Closes #2\nResolves #3",
        author: "bob",
        date: "2024-01-02T00:00:00Z",
        url: "https://github.com/o/r/commit/bbb",
        references: [2, 3]
      }
    ])
    expect(decoded).toHaveLength(2)
    expect(decoded[0]?.sha).toBe("aaa")
    expect(decoded[1]?.references).toEqual([2, 3])
  })
})

describe("Stream.fromIterable commit-refs", () => {
  it("stub-streams CommitRef rows from a single-fetch array", async () => {
    const rows = decodeCommitRefs([
      {
        type: "commit",
        source: "commit-search",
        timestamp: "2024-01-15T10:30:00.000Z",
        sha: "111",
        message: "fixes #10",
        author: "dev",
        date: "2024-01-10T00:00:00Z",
        url: "https://github.com/owner/repo/commit/111",
        references: [10]
      },
      {
        type: "commit",
        source: "commit-search",
        timestamp: "2024-01-15T10:30:00.000Z",
        sha: "222",
        message: "closes #20",
        author: "dev",
        date: "2024-01-11T00:00:00Z",
        url: "https://github.com/owner/repo/commit/222",
        references: [20]
      }
    ])

    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<CommitRef>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(2)
    expect(collected.map((r) => r.sha)).toEqual(["111", "222"])
    expect(collected[0]?.type).toBe("commit")
    expect(collected[1]?.source).toBe("commit-search")
    expect(collected[1]?.references[0]).toBe(20)
  })
})
