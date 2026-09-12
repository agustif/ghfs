/**
 * GitRef Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/git-ref.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from repo-tag.test.ts (SyncTags) and search-commit-ref tests.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { GitRef, decodeGitRef, decodeGitRefs } from "./git-ref"

const GitRefsSnapshot = Schema.Struct({ refs: Schema.Array(GitRef) })

function encodeGitRefsSnapshot(rows: Array<GitRef>): unknown {
  return Schema.encodeSync(GitRefsSnapshot)({ refs: rows })
}

describe("GitRef schema (git/refs.json { refs })", () => {
  it("encodes lean array with object pointer", () => {
    const row = new GitRef({
      ref: "refs/heads/main",
      nodeId: "REF_kwDOA",
      url: "https://api.github.com/repos/o/r/git/refs/heads/main",
      object: {
        type: "commit",
        sha: "abc123",
        url: "https://api.github.com/repos/o/r/git/commits/abc123"
      }
    })
    const encoded = encodeGitRefsSnapshot([row]) as { refs: unknown }
    const decoded = Schema.decodeUnknownSync(GitRefsSnapshot)(encoded)
    expect(encoded).toHaveProperty("refs")
    expect(Array.isArray(encoded.refs)).toBe(true)
    expect(decoded.refs[0]?.ref).toBe("refs/heads/main")
    expect(decoded.refs[0]?.object.sha).toBe("abc123")
    expect(decoded.refs[0]?.nodeId).toBe("REF_kwDOA")
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("round-trips via decodeGitRef", () => {
    const row = new GitRef({
      ref: "refs/tags/v1",
      nodeId: "REF_1",
      url: "https://example.com/ref",
      object: { type: "tag", sha: "deadbeef", url: "https://example.com/obj" }
    })
    const rt = decodeGitRef(Schema.encodeSync(GitRef)(row))
    expect(rt.ref).toBe("refs/tags/v1")
    expect(rt.object.type).toBe("tag")
  })

  it("encodes empty { refs: [] } and decodes via decodeGitRefs", () => {
    const empty = encodeGitRefsSnapshot([]) as { refs: unknown[] }
    expect(empty.refs).toEqual([])
    const decoded = decodeGitRefs([
      {
        ref: "refs/heads/a",
        nodeId: "n1",
        url: "u1",
        object: { type: "commit", sha: "1", url: "o1" }
      }
    ])
    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.ref).toBe("refs/heads/a")
  })
})

describe("Stream.fromIterable git refs", () => {
  it("stub-streams then sorts by ref", async () => {
    const rows = [
      new GitRef({
        ref: "refs/heads/z",
        nodeId: "n",
        url: "u",
        object: { type: "commit", sha: "z", url: "o" }
      }),
      new GitRef({
        ref: "refs/heads/a",
        nodeId: "n",
        url: "u",
        object: { type: "commit", sha: "a", url: "o" }
      })
    ]
    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(
          () => [] as Array<GitRef>,
          (acc, row) => {
            acc.push(row)
            return acc
          }
        )
      )
    )
    collected.sort((a, b) => a.ref.localeCompare(b.ref))
    expect(collected.map((r) => r.ref)).toEqual([
      "refs/heads/a",
      "refs/heads/z"
    ])
  })
})
