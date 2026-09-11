/**
 * RepoTag Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/repo-tag.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from release.test.ts (SyncReleases).
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { RepoTag, decodeRepoTag, decodeRepoTags } from "./repo-tag"

function encodeTagsSnapshot(rows: Array<RepoTag>): unknown {
  return Schema.encodeSync(Schema.Array(RepoTag))(rows)
}

describe("RepoTag schema (tags/tags.json)", () => {
  it("encodes lean array with commit + archive urls", () => {
    const row = new RepoTag({
      name: "v1.0.0",
      commit: {
        sha: "abc123",
        url: "https://api.github.com/repos/o/r/commits/abc123"
      },
      zipballUrl: "https://api.github.com/repos/o/r/zipball/v1.0.0",
      tarballUrl: "https://api.github.com/repos/o/r/tarball/v1.0.0",
      nodeId: "T_kwDOA"
    })
    const encoded = encodeTagsSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(RepoTag))(encoded)
    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded[0]?.name).toBe("v1.0.0")
    expect(decoded[0]?.commit.sha).toBe("abc123")
    expect(decoded[0]?.zipballUrl).toContain("zipball")
    expect(decoded[0]?.nodeId).toBe("T_kwDOA")
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("round-trips via decodeRepoTag", () => {
    const row = new RepoTag({
      name: "v0.1.0",
      commit: { sha: "deadbeef", url: "https://example.com/c" },
      zipballUrl: "https://example.com/z",
      tarballUrl: "https://example.com/t",
      nodeId: "T_1"
    })
    const rt = decodeRepoTag(Schema.encodeSync(RepoTag)(row))
    expect(rt.name).toBe("v0.1.0")
    expect(rt.commit.sha).toBe("deadbeef")
  })

  it("decodes an array via decodeRepoTags", () => {
    const decoded = decodeRepoTags([
      {
        name: "a",
        commit: { sha: "1", url: "u1" },
        zipballUrl: "z1",
        tarballUrl: "t1",
        nodeId: "n1"
      },
      {
        name: "b",
        commit: { sha: "2", url: "u2" },
        zipballUrl: "z2",
        tarballUrl: "t2",
        nodeId: "n2"
      }
    ])
    expect(decoded).toHaveLength(2)
    expect(decoded[1]?.name).toBe("b")
  })
})

describe("Stream.fromIterable tags", () => {
  it("stub-streams then sorts by name", async () => {
    const rows = [
      new RepoTag({
        name: "z",
        commit: { sha: "z", url: "u" },
        zipballUrl: "z",
        tarballUrl: "t",
        nodeId: "n"
      }),
      new RepoTag({
        name: "a",
        commit: { sha: "a", url: "u" },
        zipballUrl: "z",
        tarballUrl: "t",
        nodeId: "n"
      })
    ]
    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(
          () => [] as Array<RepoTag>,
          (acc, row) => {
            acc.push(row)
            return acc
          }
        )
      )
    )
    collected.sort((a, b) => a.name.localeCompare(b.name))
    expect(collected.map((r) => r.name)).toEqual(["a", "z"])
  })
})
