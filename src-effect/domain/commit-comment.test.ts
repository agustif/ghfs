/**
 * CommitComment Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/commit-comment.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from domain/comment.test.ts (issue/PR SyncComments).
 */
import { DateTime, Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { CommitComment } from "./commit-comment"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

/** Lean snapshot payload for commit-comments.json (no wrapper / NDJSON). */
function encodeCommitCommentsSnapshot(
  rows: Array<CommitComment>
): unknown {
  return Schema.encodeSync(Schema.Array(CommitComment))(rows)
}

describe("CommitComment schema (commit-comments.json)", () => {
  it("encodes lean array with commitId / path / line", () => {
    const row = new CommitComment({
      id: 101,
      body: "nit: rename this",
      createdAt: d("2024-05-01T00:00:00.000Z"),
      updatedAt: d("2024-05-01T01:00:00.000Z"),
      author: "alice",
      authorAvatarUrl: "https://avatars.githubusercontent.com/u/1",
      commitId: "abc123def456",
      path: "src/main.ts",
      line: 42,
      position: 10,
      htmlUrl: "https://github.com/acme/widgets/commit/abc123def456#commitcomment-101"
    })

    const encoded = encodeCommitCommentsSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(CommitComment))(encoded)

    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.id).toBe(101)
    expect(decoded[0]?.commitId).toBe("abc123def456")
    expect(decoded[0]?.path).toBe("src/main.ts")
    expect(decoded[0]?.line).toBe(42)
    expect(decoded[0]?.author).toBe("alice")
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("allows null body / author / path / line / position", () => {
    const row = new CommitComment({
      id: 2,
      body: null,
      createdAt: d("2024-06-01T00:00:00.000Z"),
      updatedAt: d("2024-06-01T00:00:00.000Z"),
      author: null,
      commitId: "deadbeef",
      path: null,
      line: null,
      position: null
    })
    const roundTrip = Schema.decodeUnknownSync(CommitComment)(
      Schema.encodeSync(CommitComment)(row)
    )
    expect(roundTrip.body).toBeNull()
    expect(roundTrip.author).toBeNull()
    expect(roundTrip.path).toBeNull()
    expect(roundTrip.line).toBeNull()
    expect(roundTrip.position).toBeNull()
    expect(roundTrip.commitId).toBe("deadbeef")
  })

  it("omits optional authorAvatarUrl / htmlUrl when absent", () => {
    const row = new CommitComment({
      id: 3,
      body: "ok",
      createdAt: d("2024-07-01T00:00:00.000Z"),
      updatedAt: d("2024-07-01T00:00:00.000Z"),
      author: "bob",
      commitId: "cafebabe",
      path: null,
      line: null,
      position: null
    })
    const encoded = Schema.encodeSync(CommitComment)(row) as Record<string, unknown>
    expect(encoded).not.toHaveProperty("authorAvatarUrl")
    expect(encoded).not.toHaveProperty("htmlUrl")
  })
})

describe("Stream.fromIterable commit comments", () => {
  it("stub-streams then sorts by commitId then id", async () => {
    const rows = [
      new CommitComment({
        id: 2,
        body: "b",
        createdAt: d("2024-01-01T00:00:00.000Z"),
        updatedAt: d("2024-01-01T00:00:00.000Z"),
        author: "a",
        commitId: "bbb",
        path: null,
        line: null,
        position: null
      }),
      new CommitComment({
        id: 1,
        body: "a",
        createdAt: d("2024-01-01T00:00:00.000Z"),
        updatedAt: d("2024-01-01T00:00:00.000Z"),
        author: "a",
        commitId: "aaa",
        path: null,
        line: null,
        position: null
      })
    ]

    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<CommitComment>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    collected.sort((a, b) => {
      const byCommit = a.commitId.localeCompare(b.commitId)
      return byCommit !== 0 ? byCommit : a.id - b.id
    })
    expect(collected.map((r) => r.commitId)).toEqual(["aaa", "bbb"])
  })
})
