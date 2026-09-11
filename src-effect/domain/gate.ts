/**
 * Gate / Policy domain (Schema-first) — lean observe/evaluate surface for
 * gate/evaluation.json (+ optional policy/policy.json).
 *
 * Copy to: src-effect/domain/gate.ts
 * Then export from domain/index.ts: `export * from "./gate"`
 *
 * Matches cue `src/sync/gate-evaluator.ts` fields + pure `evaluateGate`
 * (no node:fs). Policy shape is the **evaluator** Policy (version: 1 + rules
 * + optional constitution/sources) — NOT the remote `policy-builder.ts`
 * PolicyInput (codeowners / rulesets / contributing) and NOT
 * `src/types/policy.ts` intelligence DSL stubs.
 *
 * LEAN by design:
 * - Schema PolicyRules / PolicySources / Policy / GateContext / GateEvaluation
 * - Pure `evaluateGate(policy, context)` — same semantics as cue
 * - No GitHub fetch / no branch-protection / no rulesets materialization
 *
 * Snapshot paths this slice:
 *   gate/evaluation.json   (GateEvaluation)
 *   policy/policy.json     (Policy, load + optional rewrite)
 * Remote policy build (policy-builder / enhanced-snapshot writePolicyFile)
 * is OUT OF SCOPE — follow-up snippet only.
 *
 * MirrorFs markdown OOS. Intelligence DSL Gate/PolicyRule OOS.
 */
import { Schema } from 'effect'

/** Cue risk_level. */
export const RiskLevel = Schema.Literals(['low', 'medium', 'high'])
export type RiskLevel = typeof RiskLevel.Type

/** Cue checks_status value. */
export const CheckStatus = Schema.Literals(['success', 'failure', 'pending'])
export type CheckStatus = typeof CheckStatus.Type

/**
 * Cue PolicyRules — optional rule knobs only (no remote protection dump).
 */
export const PolicyRules = Schema.Struct({
  requires_review_count: Schema.optional(Schema.Int),
  blocks_paths: Schema.optional(Schema.Array(Schema.String)),
  danger_files: Schema.optional(Schema.Array(Schema.String)),
  required_checks: Schema.optional(Schema.Array(Schema.String)),
  required_labels: Schema.optional(Schema.Array(Schema.String)),
})
export type PolicyRules = typeof PolicyRules.Type

/**
 * Cue Policy.sources — provenance flags / constitution path (local only).
 */
export const PolicySources = Schema.Struct({
  constitution_file: Schema.optional(Schema.String),
  branch_protection: Schema.optional(Schema.Boolean),
  rulesets: Schema.optional(Schema.Boolean),
})
export type PolicySources = typeof PolicySources.Type

/**
 * Evaluator Policy (gate-evaluator.ts) — version literal 1 + rules.
 * Distinct from policy-builder PolicyInput and types/policy intelligence DSL.
 */
export class Policy extends Schema.Class<Policy>('Policy')({
  version: Schema.Literal(1),
  rules: PolicyRules,
  constitution: Schema.optional(Schema.String),
  sources: PolicySources,
}) {}

/**
 * Transient / request context for `evaluateGate` — not a remote PR dump.
 */
export const GateContext = Schema.Struct({
  files: Schema.optional(Schema.Array(Schema.String)),
  review_count: Schema.optional(Schema.Int),
  checks_status: Schema.optional(
    Schema.Record(Schema.String, CheckStatus)
  ),
  labels: Schema.optional(Schema.Array(Schema.String)),
})
export type GateContext = typeof GateContext.Type

/**
 * Pure evaluation result written to gate/evaluation.json.
 */
export class GateEvaluation extends Schema.Class<GateEvaluation>(
  'GateEvaluation'
)({
  passed: Schema.Boolean,
  warnings: Schema.Array(Schema.String),
  errors: Schema.Array(Schema.String),
  risk_level: RiskLevel,
}) {}

export const decodePolicyRules = Schema.decodeUnknownSync(PolicyRules)
export const decodePolicySources = Schema.decodeUnknownSync(PolicySources)
export const decodePolicy = Schema.decodeUnknownSync(Policy)
export const decodeGateContext = Schema.decodeUnknownSync(GateContext)
export const decodeGateEvaluation = Schema.decodeUnknownSync(GateEvaluation)
export const decodeRiskLevel = Schema.decodeUnknownSync(RiskLevel)
export const decodeCheckStatus = Schema.decodeUnknownSync(CheckStatus)

/**
 * Minimal glob: `*` (non-slash), `**` (any), `?` (one char), `.` literal.
 * Ported from cue `matchGlob` — kept module-private via evaluateGate tests.
 */
function matchGlob(path: string, pattern: string): boolean {
  // Replace ** before * so the .* placeholder is not re-eaten by the * rule.
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '\0')
    .replace(/\*/g, '[^/]*')
    .replace(/\0/g, '.*')
    .replace(/\?/g, '.')
  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(path)
}

/**
 * Pure gate evaluator — mirrors `src/sync/gate-evaluator.ts` semantics.
 * No I/O. Returns Schema `GateEvaluation` via `.make`.
 */
export function evaluateGate(
  policy: Policy,
  context: GateContext
): GateEvaluation {
  const warnings: Array<string> = []
  const errors: Array<string> = []
  let risk_level: RiskLevel = 'low'

  const { rules } = policy

  if (rules.requires_review_count !== undefined && context.review_count !== undefined) {
    if (context.review_count < rules.requires_review_count) {
      errors.push(
        `Requires ${rules.requires_review_count} reviews, but only ${context.review_count} found`
      )
      risk_level = 'high'
    }
  }

  if (rules.blocks_paths && context.files) {
    const blockedFiles = context.files.filter((file) =>
      rules.blocks_paths!.some((pattern) => matchGlob(file, pattern))
    )
    if (blockedFiles.length > 0) {
      errors.push(`Blocked paths modified: ${blockedFiles.join(', ')}`)
      risk_level = 'high'
    }
  }

  if (rules.danger_files && context.files) {
    const dangerFiles = context.files.filter((file) =>
      rules.danger_files!.includes(file)
    )
    if (dangerFiles.length > 0) {
      warnings.push(`Danger files modified: ${dangerFiles.join(', ')}`)
      if (risk_level === 'low') risk_level = 'medium'
    }
  }

  if (rules.required_checks && context.checks_status) {
    const failedChecks = rules.required_checks.filter(
      (check) => context.checks_status![check] !== 'success'
    )
    if (failedChecks.length > 0) {
      errors.push(`Required checks not passing: ${failedChecks.join(', ')}`)
      risk_level = 'high'
    }
  }

  if (rules.required_labels && context.labels) {
    const missingLabels = rules.required_labels.filter(
      (label) => !context.labels!.includes(label)
    )
    if (missingLabels.length > 0) {
      warnings.push(`Missing required labels: ${missingLabels.join(', ')}`)
      if (risk_level === 'low') risk_level = 'medium'
    }
  }

  return GateEvaluation.make({
    passed: errors.length === 0,
    warnings,
    errors,
    risk_level,
  })
}

/** Empty default policy (all rules unset → evaluateGate always passes). */
export function emptyPolicy(): Policy {
  return Policy.make({
    version: 1,
    rules: PolicyRules.make({}),
    sources: PolicySources.make({}),
  })
}
