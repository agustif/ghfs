/**
 * RuleSuite Schema round-trips + single-fetch stream stub.
 *
 * Copy to: src-effect/domain/rule-suite.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  RuleSuite,
  decodeRuleSuite,
  decodeRuleSuites
} from "./rule-suite"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("RuleSuite schema", () => {
  it("encodes and decodes a lean rule suite with actor + evaluationResult", () => {
    const row = RuleSuite.make({
      id: 21,
      actorId: 12,
      actorName: "octocat",
      beforeSha: "1111111111111111111111111111111111111111",
      afterSha: "2222222222222222222222222222222222222222",
      ref: "refs/heads/main",
      repositoryId: 42,
      repositoryName: "octo-repo",
      pushedAt: d("2024-01-15T10:30:00.000Z"),
      result: "pass",
      evaluationResult: "pass"
    })

    expect(row.id).toBe(21)
    expect(row.actorId).toBe(12)
    expect(row.actorName).toBe("octocat")
    expect(row.beforeSha).toMatch(/^1111/)
    expect(row.afterSha).toMatch(/^2222/)
    expect(row.ref).toBe("refs/heads/main")
    expect(row.repositoryId).toBe(42)
    expect(row.repositoryName).toBe("octo-repo")
    expect(row.result).toBe("pass")
    expect(row.evaluationResult).toBe("pass")

    const encoded = Schema.encodeSync(RuleSuite)(row)
    const decoded = decodeRuleSuite(encoded)
    expect(decoded.id).toBe(21)
    expect(decoded.actorName).toBe("octocat")
    expect(decoded.result).toBe("pass")
    expect(decoded.evaluationResult).toBe("pass")
    expect(decoded.ref).toBe("refs/heads/main")
  })

  it("allows null actor fields and null evaluationResult", () => {
    const lean = RuleSuite.make({
      id: 22,
      actorId: null,
      actorName: null,
      beforeSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      afterSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ref: "refs/heads/develop",
      repositoryId: 7,
      repositoryName: "widgets",
      pushedAt: d("2024-02-01T00:00:00.000Z"),
      result: "fail",
      evaluationResult: null
    })

    const rt = decodeRuleSuite(Schema.encodeSync(RuleSuite)(lean))
    expect(rt.actorId).toBeNull()
    expect(rt.actorName).toBeNull()
    expect(rt.evaluationResult).toBeNull()
    expect(rt.result).toBe("fail")
  })

  it("accepts bypass result and forward-compat unknown result strings", () => {
    const bypass = RuleSuite.make({
      id: 23,
      actorId: 1,
      actorName: "alice",
      beforeSha: "cccccccccccccccccccccccccccccccccccccccc",
      afterSha: "dddddddddddddddddddddddddddddddddddddddd",
      ref: "refs/tags/v1.0.0",
      repositoryId: 9,
      repositoryName: "widgets",
      pushedAt: d("2024-03-01T00:00:00.000Z"),
      result: "bypass",
      evaluationResult: "bypass"
    })
    const forward = RuleSuite.make({
      id: 24,
      actorId: 2,
      actorName: "bob",
      beforeSha: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      afterSha: "ffffffffffffffffffffffffffffffffffffffff",
      ref: "main",
      repositoryId: 9,
      repositoryName: "widgets",
      pushedAt: d("2024-03-02T00:00:00.000Z"),
      result: "pending_review",
      evaluationResult: "pending_review"
    })

    expect(
      decodeRuleSuite(Schema.encodeSync(RuleSuite)(bypass)).result
    ).toBe("bypass")
    expect(
      decodeRuleSuite(Schema.encodeSync(RuleSuite)(forward)).result
    ).toBe("pending_review")
  })

  it("decodes an array via decodeRuleSuites", () => {
    const decoded = decodeRuleSuites([
      {
        id: 10,
        actorId: 1,
        actorName: "alice",
        beforeSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        afterSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        ref: "refs/heads/main",
        repositoryId: 1,
        repositoryName: "acme",
        pushedAt: d("2024-01-01T00:00:00.000Z"),
        result: "pass",
        evaluationResult: "pass"
      },
      {
        id: 11,
        actorId: null,
        actorName: null,
        beforeSha: "cccccccccccccccccccccccccccccccccccccccc",
        afterSha: "dddddddddddddddddddddddddddddddddddddddd",
        ref: "refs/heads/feat",
        repositoryId: 1,
        repositoryName: "acme",
        pushedAt: d("2024-01-02T00:00:00.000Z"),
        result: "fail",
        evaluationResult: null
      }
    ])
    expect(decoded).toHaveLength(2)
    expect(decoded[0]?.actorName).toBe("alice")
    expect(decoded[1]?.result).toBe("fail")
    expect(decoded[1]?.evaluationResult).toBeNull()
  })
})

describe("Stream.fromIterable rule-suites", () => {
  it("stub-streams RuleSuite rows from a single-fetch array", async () => {
    const rows = decodeRuleSuites([
      {
        id: 1,
        actorId: 12,
        actorName: "octocat",
        beforeSha: "1111111111111111111111111111111111111111",
        afterSha: "2222222222222222222222222222222222222222",
        ref: "refs/heads/main",
        repositoryId: 42,
        repositoryName: "octo-repo",
        pushedAt: d("2024-01-15T10:30:00.000Z"),
        result: "pass",
        evaluationResult: "pass"
      },
      {
        id: 2,
        actorId: null,
        actorName: null,
        beforeSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        afterSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        ref: "refs/heads/develop",
        repositoryId: 42,
        repositoryName: "octo-repo",
        pushedAt: d("2024-01-16T10:30:00.000Z"),
        result: "fail",
        evaluationResult: null
      }
    ])

    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<RuleSuite>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(2)
    expect(collected.map((r) => r.id)).toEqual([1, 2])
    expect(collected[0]?.result).toBe("pass")
    expect(collected[1]?.evaluationResult).toBeNull()
  })
})
