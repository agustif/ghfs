/**
 * SBOM summary (Schema-first) — lean dependency-intelligence peel (FIRST).
 *
 * Copy to: src-effect/domain/sbom-summary.ts
 * Then export from domain/index.ts: `export * from "./sbom-summary"`
 *
 * Lean fields from GitHub dependency-graph SBOM (not full SPDX dump):
 * name, spdxVersion, packageCount (= packages.length).
 * Full `packages` array OOS.
 *
 * Snapshot path this slice: `security/sbom-summary.json` (lean JSON **object**
 * under config.directory). Cue wrote `security/sbom.json` with full SPDX —
 * do not dump packages this peel.
 * Distinct from SyncSecuritySummary (#220 — Dependabot/code/secret alert counts).
 *
 * Wire via additive `GitHubClient.fetchSbomSummary` —
 * `GET /repos/{owner}/{repo}/dependency-graph/sbom` — see snippet.
 *
 * Attestations / dep-graph / dep-reviews / full Dependabot alerts stay OOS.
 */
import { Schema } from "effect"

/**
 * Lean SBOM summary snapshot (single resource — no packages array).
 */
export class SbomSummary extends Schema.Class<SbomSummary>("SbomSummary")({
  name: Schema.NullOr(Schema.String),
  spdxVersion: Schema.NullOr(Schema.String),
  packageCount: Schema.Number
}) {}

export const decodeSbomSummary = Schema.decodeUnknownSync(SbomSummary)
