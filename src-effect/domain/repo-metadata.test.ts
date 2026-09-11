/**
 * RepoMetadata / RepoSecurityAdvisory Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/repo-metadata.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  RepoCodeownersSummary,
  RepoMetadata,
  RepoSecurityAdvisory
} from "./repo-metadata"

const sampleAdvisory = new RepoSecurityAdvisory({
  id: "GHSA-xxxx-yyyy-zzzz",
  severity: "high",
  summary: "Example advisory",
  publishedAt: "2026-01-15T00:00:00Z",
  vulnerabilities: []
})

const sampleMetadata = new RepoMetadata({
  name: "ghfs",
  fullName: "agustif/ghfs",
  description: "GitHub as a filesystem",
  private: false,
  archived: false,
  defaultBranch: "main",
  htmlUrl: "https://github.com/agustif/ghfs",
  fork: false,
  hasIssues: true,
  hasProjects: false,
  hasWiki: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2026-09-11T00:00:00Z",
  pushedAt: "2026-09-11T00:00:00Z",
  owner: "agustif",
  stargazersCount: 42,
  watchersCount: 42,
  forksCount: 3,
  openIssuesCount: 7,
  language: "TypeScript",
  topics: ["effect", "github"],
  visibility: "public",
  allowMergeCommit: true,
  allowSquashMerge: true,
  allowRebaseMerge: false,
  mergeQueueEnabled: null
})


describe("RepoSecurityAdvisory schema", () => {
  it("encodes and decodes a lean advisory", () => {
    expect(sampleAdvisory.id).toBe("GHSA-xxxx-yyyy-zzzz")
    expect(sampleAdvisory.severity).toBe("high")
    expect(sampleAdvisory.vulnerabilities).toEqual([])

    const encoded = Schema.encodeSync(RepoSecurityAdvisory)(sampleAdvisory)
    const decoded = Schema.decodeUnknownSync(RepoSecurityAdvisory)(encoded)
    expect(decoded.id).toBe("GHSA-xxxx-yyyy-zzzz")
    expect(decoded.summary).toBe("Example advisory")
    expect(decoded.publishedAt).toBe("2026-01-15T00:00:00Z")
    expect(decoded.vulnerabilities).toEqual([])
  })
})

describe("RepoCodeownersSummary schema", () => {
  it("decodes tiny path + linesCount summary", () => {
    const decoded = Schema.decodeUnknownSync(RepoCodeownersSummary)({
      path: ".github/CODEOWNERS",
      linesCount: 12
    })
    expect(decoded.path).toBe(".github/CODEOWNERS")
    expect(decoded.linesCount).toBe(12)
  })
})

describe("RepoMetadata schema", () => {
  it("encodes and decodes lean repo core (no labels/milestones)", () => {
    expect(sampleMetadata.fullName).toBe("agustif/ghfs")
    expect(sampleMetadata.private).toBe(false)
    expect(sampleMetadata.topics).toEqual(["effect", "github"])

    const encoded = Schema.encodeSync(RepoMetadata)(sampleMetadata)
    expect(encoded).not.toHaveProperty("labels")
    expect(encoded).not.toHaveProperty("milestones")

    const decoded = Schema.decodeUnknownSync(RepoMetadata)(encoded)
    expect(decoded.name).toBe("ghfs")
    expect(decoded.owner).toBe("agustif")
    expect(decoded.stargazersCount).toBe(42)
    expect(decoded.language).toBe("TypeScript")
    expect(decoded.mergeQueueEnabled).toBeNull()
    expect(decoded.securityAdvisories).toBeUndefined()
    expect(decoded.codeowners).toBeUndefined()
  })

  it("round-trips optional securityAdvisories + codeowners summary", () => {
    const withExtras = Schema.decodeUnknownSync(RepoMetadata)({
      ...Schema.encodeSync(RepoMetadata)(sampleMetadata),
      codeowners: { path: "CODEOWNERS", linesCount: 4 },
      securityAdvisories: [
        Schema.encodeSync(RepoSecurityAdvisory)(sampleAdvisory)
      ]
    })

    expect(withExtras.codeowners?.path).toBe("CODEOWNERS")
    expect(withExtras.codeowners?.linesCount).toBe(4)
    expect(withExtras.securityAdvisories).toHaveLength(1)
    expect(withExtras.securityAdvisories?.[0]?.id).toBe("GHSA-xxxx-yyyy-zzzz")

    const roundTrip = Schema.decodeUnknownSync(RepoMetadata)(
      Schema.encodeSync(RepoMetadata)(withExtras)
    )
    expect(roundTrip.securityAdvisories?.[0]?.summary).toBe("Example advisory")
  })

  it("rejects missing required repo core fields", () => {
    expect(() =>
      Schema.decodeUnknownSync(RepoMetadata)({
        name: "ghfs"
      })
    ).toThrow()
  })
})

describe("Stream.succeed repo metadata", () => {
  it("stub-streams a single RepoMetadata resource", async () => {
    const collected = await Effect.runPromise(
      Stream.succeed(sampleMetadata).pipe(
        Stream.runFold(() => [] as Array<RepoMetadata>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(1)
    expect(collected[0]?.fullName).toBe("agustif/ghfs")
    expect(collected[0]?.openIssuesCount).toBe(7)
  })
})
