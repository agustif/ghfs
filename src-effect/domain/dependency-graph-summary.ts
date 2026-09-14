/**
 * Dependency-graph summary (Schema-first) — lean dependency-intelligence peel (THIRD).
 *
 * Copy to: src-effect/domain/dependency-graph-summary.ts
 * Then export from domain/index.ts: `export * from "./dependency-graph-summary"`
 *
 * Lean fields from GraphQL repository.dependencyGraphManifests:
 * hasSubmissions, submissionCount, manifestCount, dependencyCount,
 * latestSubmissionDate (always null on this field — not exposed).
 * Do not write lastUpdated (legacy write-dependency-intelligence stamp OOS).
 *
 * Snapshot path this slice: `security/dependency-graph-summary.json`
 * (lean JSON **object** under config.directory). Matches cue path.
 * Distinct from SbomSummary (SPDX packageCount) and AttestationsSummary.
 *
 * Wire via additive `GitHubClient.fetchDependencyGraphSummary` — GraphQL
 * (not REST paginate) — see snippet.
 *
 * Dep-reviews / full Dependabot alerts stay OOS.
 */
import { Schema } from "effect"

/**
 * Lean dependency-graph summary snapshot (single resource).
 */
export class DependencyGraphSummary extends Schema.Class<DependencyGraphSummary>(
  "DependencyGraphSummary"
)({
  hasSubmissions: Schema.Boolean,
  submissionCount: Schema.Number,
  manifestCount: Schema.Number,
  dependencyCount: Schema.Number,
  /** Not available on dependencyGraphManifests — always null this peel. */
  latestSubmissionDate: Schema.NullOr(Schema.String)
}) {}

export const decodeDependencyGraphSummary = Schema.decodeUnknownSync(
  DependencyGraphSummary
)
