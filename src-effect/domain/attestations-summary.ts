/**
 * Attestations summary (Schema-first) — lean dependency-intelligence peel (SECOND).
 *
 * Copy to: src-effect/domain/attestations-summary.ts
 * Then export from domain/index.ts: `export * from "./attestations-summary"`
 *
 * Lean field only: totalCount (count of attestation list rows).
 * Do not persist attestation bodies / bundles.
 *
 * Snapshot path this slice: `security/attestations-summary.json` (lean JSON
 * **object** under config.directory). Matches write-dependency-intelligence cue.
 * Distinct from SbomSummary / SyncSecuritySummary (#220).
 *
 * Wire via additive `GitHubClient.fetchAttestations` (paginated) —
 * `GET /repos/{owner}/{repo}/attestations?page=&per_page=` — see snippet.
 * Sync counts rows via Stream.paginate; bodies discarded.
 *
 * Dep-graph / dep-reviews / full Dependabot alerts stay OOS.
 */
import { Schema } from "effect"

/**
 * Lean attestations summary snapshot (single resource — count only).
 */
export class AttestationsSummary extends Schema.Class<AttestationsSummary>(
  "AttestationsSummary"
)({
  totalCount: Schema.Number
}) {}

export const decodeAttestationsSummary = Schema.decodeUnknownSync(
  AttestationsSummary
)
