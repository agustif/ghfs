/**
 * Repo rule suite insight (Schema-first) — lean REST rule-suites *list* row.
 *
 * Copy to: src-effect/domain/rule-suite.ts
 * Then export from domain/index.ts: `export * from "./rule-suite"`
 *
 * Fields cover GitHub REST list wire
 * `GET /repos/{owner}/{repo}/rulesets/rule-suites` (not get-one detail):
 * id, actor_id → actorId, actor_name → actorName, before_sha → beforeSha,
 * after_sha → afterSha, ref, repository_id → repositoryId,
 * repository_name → repositoryName, pushed_at → pushedAt, result,
 * evaluation_result → evaluationResult.
 *
 * Get-one `rule_evaluations` detail, kitchen-sink repo/synced_at/count
 * wrapper, and MirrorFs markdown are OUT OF SCOPE (lean array snapshot only).
 *
 * Snapshot path this slice: `rule-suites/rule-suites.json` (JSON array).
 * Legacy wrote `.ghfs/rule-suites/rule-suites.json` with
 * `{ repo, synced_at, count, rule_suites }` via writeRuleSuitesFile —
 * lean array under rule-suites/ matches sibling autolinks/pages-builds style.
 *
 * Wire via additive `GitHubClient.fetchRuleSuites({ limit?: number })` —
 * single-fetch `per_page` (default 30) — see snippet.
 *
 * Tip: 1c6a73c — peel from actions-snapshot writeRuleSuitesFile.
 */
import { Schema } from 'effect'

/**
 * Known GitHub rule-suite `result` / `evaluation_result` values, with String
 * fallback for forward-compat.
 */
export const RuleSuiteResult = Schema.Union([
  Schema.Literals(['pass', 'fail', 'bypass']),
  Schema.String,
])
export type RuleSuiteResult = typeof RuleSuiteResult.Type

/**
 * Lean repository rule-suite *list* insight row (not get-one detail).
 * Wire via additive `GitHubClient.fetchRuleSuites` — see snippet.
 */
export class RuleSuite extends Schema.Class<RuleSuite>('RuleSuite')({
  /** GitHub rule suite insight id. */
  id: Schema.Number,
  /** Actor user id (wire `actor_id`; null when absent). */
  actorId: Schema.NullOr(Schema.Number),
  /** Actor login (wire `actor_name`; null when absent). */
  actorName: Schema.NullOr(Schema.String),
  /** First commit sha before the push evaluation (wire `before_sha`). */
  beforeSha: Schema.String,
  /** Last commit sha in the push evaluation (wire `after_sha`). */
  afterSha: Schema.String,
  /** Ref the evaluation ran on (wire `ref`, e.g. `refs/heads/main`). */
  ref: Schema.String,
  /** Repository id (wire `repository_id`). */
  repositoryId: Schema.Number,
  /** Repository name without `.git` (wire `repository_name`). */
  repositoryName: Schema.String,
  /** Push evaluation timestamp (wire `pushed_at`). */
  pushedAt: Schema.DateTimeUtc,
  /** Active-enforcement suite result (wire `result`: pass|fail|bypass). */
  result: RuleSuiteResult,
  /**
   * Active+evaluate suite result (wire `evaluation_result`).
   * NullOr for get-one/list forward-compat.
   */
  evaluationResult: Schema.NullOr(RuleSuiteResult),
}) {}

export type RuleSuiteEncoded = typeof RuleSuite.Encoded
export type RuleSuiteType = typeof RuleSuite.Type

export const decodeRuleSuite = Schema.decodeUnknownSync(RuleSuite)
export const decodeRuleSuites = Schema.decodeUnknownSync(Schema.Array(RuleSuite))
