/**
 * Policy / GateContext / GateEvaluation Schema round-trips + evaluateGate
 * cases + stream stub.
 *
 * Copy to: src-effect/domain/gate.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  CheckStatus,
  decodeCheckStatus,
  decodeGateContext,
  decodeGateEvaluation,
  decodePolicy,
  decodePolicyRules,
  decodeRiskLevel,
  emptyPolicy,
  evaluateGate,
  GateContext,
  GateEvaluation,
  Policy,
  PolicyRules,
  PolicySources,
  RiskLevel
} from "./gate"

const sampleRules = PolicyRules.make({
  requires_review_count: 2,
  blocks_paths: ["secrets/**", "*.pem"],
  danger_files: ["src/auth.ts"],
  required_checks: ["ci", "lint"],
  required_labels: ["ready"]
})

const samplePolicy = Policy.make({
  version: 1,
  rules: sampleRules,
  constitution: "Be careful with auth.",
  sources: PolicySources.make({
    constitution_file: "CONSTITUTION.md",
    branch_protection: true,
    rulesets: false
  })
})

describe("Policy / GateEvaluation schemas", () => {
  it("makes and round-trips Policy + nested rules/sources", () => {
    const encoded = Schema.encodeSync(Policy)(samplePolicy)
    expect(encoded.version).toBe(1)
    expect(encoded.rules.requires_review_count).toBe(2)
    expect(encoded.rules.blocks_paths).toEqual(["secrets/**", "*.pem"])
    expect(encoded.sources.branch_protection).toBe(true)
    expect(encoded).not.toHaveProperty("codeowners")
    expect(encoded).not.toHaveProperty("rulesets_policy")
    expect(JSON.stringify(encoded)).not.toMatch(/"required_reviews"/)
    expect(JSON.stringify(encoded)).not.toMatch(/"default_branch"/)

    const roundTrip = decodePolicy(encoded)
    expect(roundTrip.constitution).toBe("Be careful with auth.")
    expect(roundTrip.rules.required_checks).toEqual(["ci", "lint"])
    expect(decodePolicyRules(encoded.rules).danger_files).toEqual([
      "src/auth.ts"
    ])
  })

  it("emptyPolicy has version 1 and empty rules", () => {
    const policy = emptyPolicy()
    expect(policy.version).toBe(1)
    expect(policy.rules.requires_review_count).toBeUndefined()
    expect(decodePolicy(Schema.encodeSync(Policy)(policy)).version).toBe(1)
  })

  it("round-trips RiskLevel / CheckStatus / GateContext", () => {
    expect(decodeRiskLevel("high")).toBe("high")
    expect(decodeCheckStatus("pending")).toBe("pending")
    expect(Schema.encodeSync(RiskLevel)("low")).toBe("low")
    expect(Schema.encodeSync(CheckStatus)("success")).toBe("success")

    const ctx = GateContext.make({
      files: ["src/a.ts"],
      review_count: 1,
      checks_status: { ci: "success", lint: "failure" },
      labels: ["wip"]
    })
    const encoded = Schema.encodeSync(GateContext)(ctx)
    expect(decodeGateContext(encoded).checks_status?.lint).toBe("failure")
  })
})

describe("evaluateGate", () => {
  it("passes with empty policy and empty context", () => {
    const result = evaluateGate(emptyPolicy(), {})
    expect(result.passed).toBe(true)
    expect(result.warnings).toEqual([])
    expect(result.errors).toEqual([])
    expect(result.risk_level).toBe("low")
  })

  it("errors on insufficient review_count → high risk", () => {
    const policy = Policy.make({
      version: 1,
      rules: PolicyRules.make({ requires_review_count: 2 }),
      sources: PolicySources.make({})
    })
    const result = evaluateGate(policy, GateContext.make({ review_count: 1 }))
    expect(result.passed).toBe(false)
    expect(result.risk_level).toBe("high")
    expect(result.errors[0]).toMatch(/Requires 2 reviews/)
  })

  it("skips review rule when context.review_count omitted", () => {
    const policy = Policy.make({
      version: 1,
      rules: PolicyRules.make({ requires_review_count: 2 }),
      sources: PolicySources.make({})
    })
    const result = evaluateGate(policy, {})
    expect(result.passed).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("errors on blocked paths via glob (** and *)", () => {
    const policy = Policy.make({
      version: 1,
      rules: PolicyRules.make({
        blocks_paths: ["secrets/**", "*.pem"]
      }),
      sources: PolicySources.make({})
    })
    const result = evaluateGate(
      policy,
      GateContext.make({
        files: ["secrets/prod/key", "readme.md", "cert.pem"]
      })
    )
    expect(result.passed).toBe(false)
    expect(result.risk_level).toBe("high")
    expect(result.errors[0]).toMatch(/Blocked paths modified/)
    expect(result.errors[0]).toMatch(/secrets\/prod\/key/)
    expect(result.errors[0]).toMatch(/cert\.pem/)
  })

  it("warns on danger_files → medium when no errors", () => {
    const policy = Policy.make({
      version: 1,
      rules: PolicyRules.make({ danger_files: ["src/auth.ts"] }),
      sources: PolicySources.make({})
    })
    const result = evaluateGate(
      policy,
      GateContext.make({ files: ["src/auth.ts", "src/other.ts"] })
    )
    expect(result.passed).toBe(true)
    expect(result.risk_level).toBe("medium")
    expect(result.warnings[0]).toMatch(/Danger files modified: src\/auth\.ts/)
  })

  it("errors on required_checks not success → high", () => {
    const policy = Policy.make({
      version: 1,
      rules: PolicyRules.make({ required_checks: ["ci", "lint"] }),
      sources: PolicySources.make({})
    })
    const result = evaluateGate(
      policy,
      GateContext.make({
        checks_status: { ci: "success", lint: "pending" }
      })
    )
    expect(result.passed).toBe(false)
    expect(result.risk_level).toBe("high")
    expect(result.errors[0]).toMatch(/Required checks not passing: lint/)
  })

  it("warns on missing required_labels → medium when no errors", () => {
    const policy = Policy.make({
      version: 1,
      rules: PolicyRules.make({ required_labels: ["ready", "reviewed"] }),
      sources: PolicySources.make({})
    })
    const result = evaluateGate(
      policy,
      GateContext.make({ labels: ["ready"] })
    )
    expect(result.passed).toBe(true)
    expect(result.risk_level).toBe("medium")
    expect(result.warnings[0]).toMatch(/Missing required labels: reviewed/)
  })

  it("keeps high risk when errors coexist with warnings", () => {
    const result = evaluateGate(
      samplePolicy,
      GateContext.make({
        files: ["src/auth.ts", "secrets/x"],
        review_count: 0,
        checks_status: { ci: "failure", lint: "success" },
        labels: []
      })
    )
    expect(result.passed).toBe(false)
    expect(result.risk_level).toBe("high")
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it("GateEvaluation.make / encode / decode round-trip", () => {
    const evaluation = evaluateGate(samplePolicy, {
      files: ["src/ok.ts"],
      review_count: 2,
      checks_status: { ci: "success", lint: "success" },
      labels: ["ready"]
    })
    expect(evaluation.passed).toBe(true)
    expect(evaluation.risk_level).toBe("low")

    const encoded = Schema.encodeSync(GateEvaluation)(evaluation)
    expect(encoded).not.toHaveProperty("policy")
    expect(encoded).not.toHaveProperty("context")
    expect(decodeGateEvaluation(encoded).passed).toBe(true)
  })
})

describe("Stream.succeed gate evaluation", () => {
  it("stub-streams a single GateEvaluation resource", async () => {
    const evaluation = evaluateGate(emptyPolicy(), {})

    const collected = await Effect.runPromise(
      Stream.succeed(evaluation).pipe(
        Stream.runFold(() => [] as Array<GateEvaluation>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(1)
    expect(collected[0]?.passed).toBe(true)
    expect(collected[0]?.risk_level).toBe("low")
  })
})
