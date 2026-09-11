/**
 * Default-branch protection / "rulesets" observe snapshot (Schema-first).
 *
 * Copy to: src-effect/domain/branch-protection.ts
 * Then export from domain/index.ts: `export * from "./branch-protection"`
 *
 * Fields cover legacy ProviderBranchProtection / writeRulesetsFile in
 * src/sync/enhanced-snapshot.ts (fetchBranchProtection → rulesets/rulesets.json).
 *
 * DISTINCT from RuleSuite / SyncRuleSuites
 * (`GET …/rulesets/rule-suites` evaluation insights).
 *
 * Snapshot path this slice: `rulesets/rulesets.json` (lean BranchProtection
 * object). Legacy wrapper `{ synced_at, default_branch, protection }` OOS —
 * `pattern` carries the branch name. MirrorFs markdown OOS.
 *
 * Wire via additive `GitHubClient.fetchBranchProtection(branch)` — see snippet
 * (`GET /repos/{owner}/{repo}/branches/{branch}/protection`).
 */
import { Schema } from "effect"

export const RequiredStatusChecks = Schema.Struct({
  strict: Schema.Boolean,
  contexts: Schema.Array(Schema.String)
})
export type RequiredStatusChecks = typeof RequiredStatusChecks.Type

export const RequiredPullRequestReviews = Schema.Struct({
  dismissStaleReviews: Schema.Boolean,
  requireCodeOwnerReviews: Schema.Boolean,
  requiredApprovingReviewCount: Schema.Int
})
export type RequiredPullRequestReviews = typeof RequiredPullRequestReviews.Type

/**
 * Lean branch-protection snapshot (single resource; null fetch → skip write).
 */
export class BranchProtection extends Schema.Class<BranchProtection>(
  "BranchProtection"
)({
  /** Branch pattern / name this protection applies to (cue `pattern`). */
  pattern: Schema.String,
  requiredStatusChecks: Schema.NullOr(RequiredStatusChecks),
  requiredPullRequestReviews: Schema.NullOr(RequiredPullRequestReviews),
  enforceAdmins: Schema.Boolean,
  requiredLinearHistory: Schema.Boolean,
  allowForcePushes: Schema.Boolean,
  allowDeletions: Schema.Boolean
}) {}
