/**
 * CodeownersRule / CodeownersFile Schema round-trips + parse stub.
 *
 * Copy to: src-effect/domain/codeowners.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { CodeownersFile, CodeownersRule } from "./codeowners"

/** Mirror of the client snippet parser (test stub — keep in lockstep with snippet). */
function parseCodeownersRules(content: string): Array<CodeownersRule> {
  const rules: Array<CodeownersRule> = []
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (trimmed === "" || trimmed.startsWith("#")) continue
    const parts = trimmed.split(/\s+/)
    if (parts.length < 2) continue
    const pattern = parts[0]!
    const owners = parts.slice(1).filter((o) => o.startsWith("@"))
    if (owners.length === 0) continue
    rules.push(new CodeownersRule({ pattern, owners }))
  }
  return rules
}

describe("CodeownersRule schema", () => {
  it("encodes and decodes a rule with multiple owners", () => {
    const rule = new CodeownersRule({
      pattern: "*.ts",
      owners: ["@alice", "@acme/frontend"]
    })

    expect(rule.pattern).toBe("*.ts")
    expect(rule.owners).toEqual(["@alice", "@acme/frontend"])

    const encoded = Schema.encodeSync(CodeownersRule)(rule)
    const decoded = Schema.decodeUnknownSync(CodeownersRule)(encoded)
    expect(decoded.pattern).toBe("*.ts")
    expect(decoded.owners).toEqual(["@alice", "@acme/frontend"])
  })

  it("round-trips a default-owner * pattern", () => {
    const rule = new CodeownersRule({
      pattern: "*",
      owners: ["@ops"]
    })
    const roundTrip = Schema.decodeUnknownSync(CodeownersRule)(
      Schema.encodeSync(CodeownersRule)(rule)
    )
    expect(roundTrip.pattern).toBe("*")
    expect(roundTrip.owners).toEqual(["@ops"])
  })
})

describe("CodeownersFile schema", () => {
  it("encodes and decodes a file with path, rules, and raw", () => {
    const file = new CodeownersFile({
      path: ".github/CODEOWNERS",
      rules: [
        new CodeownersRule({ pattern: "*", owners: ["@alice"] }),
        new CodeownersRule({
          pattern: "/docs/",
          owners: ["@docs-team", "@bob"]
        })
      ],
      raw: "* @alice\n/docs/ @docs-team @bob\n"
    })

    expect(file.path).toBe(".github/CODEOWNERS")
    expect(file.rules).toHaveLength(2)
    expect(file.raw).toContain("@alice")

    const encoded = Schema.encodeSync(CodeownersFile)(file)
    const decoded = Schema.decodeUnknownSync(CodeownersFile)(encoded)
    expect(decoded.path).toBe(".github/CODEOWNERS")
    expect(decoded.rules.map((r) => r.pattern)).toEqual(["*", "/docs/"])
    expect(decoded.rules[1]?.owners).toEqual(["@docs-team", "@bob"])
    expect(decoded.raw).toContain("/docs/")
  })

  it("allows omitting path and setting raw null / empty rules", () => {
    const empty = new CodeownersFile({
      rules: [],
      raw: null
    })

    const roundTrip = Schema.decodeUnknownSync(CodeownersFile)(
      Schema.encodeSync(CodeownersFile)(empty)
    )
    expect(roundTrip.path).toBeUndefined()
    expect(roundTrip.rules).toEqual([])
    expect(roundTrip.raw).toBeNull()
  })
})

describe("parse CODEOWNERS stub", () => {
  it("skips comments/blanks and keeps @owners only", () => {
    const raw = [
      "# team owners",
      "",
      "* @alice @acme/core",
      "*.md @docs",
      "no-owners-here",
      "/src/ @bob not-an-owner @carol"
    ].join("\n")

    const rules = parseCodeownersRules(raw)
    expect(rules).toHaveLength(3)
    expect(rules[0]).toEqual(
      expect.objectContaining({
        pattern: "*",
        owners: ["@alice", "@acme/core"]
      })
    )
    expect(rules[1]?.pattern).toBe("*.md")
    expect(rules[1]?.owners).toEqual(["@docs"])
    expect(rules[2]?.owners).toEqual(["@bob", "@carol"])
  })
})

describe("Stream.fromIterable codeowners rules", () => {
  it("stub-streams parsed rules from a CodeownersFile", async () => {
    const file = new CodeownersFile({
      path: "CODEOWNERS",
      rules: parseCodeownersRules("* @alice\n/api/ @api-team\n"),
      raw: "* @alice\n/api/ @api-team\n"
    })

    const collected = await Effect.runPromise(
      Stream.fromIterable(file.rules).pipe(
        Stream.runFold(() => [] as Array<CodeownersRule>, (acc, rule) => {
          acc.push(rule)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(2)
    expect(collected.map((r) => r.pattern)).toEqual(["*", "/api/"])
    expect(collected[0]?.owners).toEqual(["@alice"])
    expect(collected[1]?.owners).toEqual(["@api-team"])
  })
})
