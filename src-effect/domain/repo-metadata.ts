/**
 * Repo metadata snapshot (Schema-first) — lean repo/security core for metadata.json.
 *
 * Copy to: src-effect/domain/repo-metadata.ts
 * Then export from domain/index.ts: `export * from "./repo-metadata"`
 *
 * Distinct from healed domain `Repo` (owner/name/fullName/description/defaultBranch
 * + embedded labels[]/milestones[]). This slice is the **metadata.json** shape:
 * repo core fields + optional security advisories + optional tiny CODEOWNERS
 * summary. Do NOT re-embed full labels[] / milestones[] (SyncLabels /
 * SyncMilestones own those). Do NOT embed full CODEOWNERS content
 * (SyncCodeowners owns that) — at most `{ path, linesCount }`.
 *
 * Snapshot path this slice: `metadata/metadata.json` under config.directory.
 * Legacy wrote storage-root `metadata.json` with embedded labels/milestones +
 * CODEOWNERS file side-write — lean object under metadata/ matches sibling
 * interaction-limits / codeowners style. MirrorFs markdown OOS.
 *
 * Wire via additive `GitHubClient.fetchRepository` (+ optional
 * `fetchSecurityAdvisories`) — see snippet.
 */
import { Schema } from 'effect'

/**
 * Tiny CODEOWNERS cue summary (NOT full content — SyncCodeowners owns that).
 * Optional on the snapshot when a fan-in wants to attach path + line count.
 */
export const RepoCodeownersSummary = Schema.Struct({
  path: Schema.String,
  linesCount: Schema.Int,
})
export type RepoCodeownersSummary = typeof RepoCodeownersSummary.Type

/** Nested vulnerable package identity on an advisory. */
export const RepoAdvisoryPackage = Schema.Struct({
  ecosystem: Schema.String,
  name: Schema.String,
})
export type RepoAdvisoryPackage = typeof RepoAdvisoryPackage.Type

/** Nested first-patched version marker (wire `first_patched_version`). */
export const RepoAdvisoryPatchedVersion = Schema.Struct({
  identifier: Schema.String,
})
export type RepoAdvisoryPatchedVersion = typeof RepoAdvisoryPatchedVersion.Type

/** Lean vulnerability row embedded under a security advisory. */
export const RepoAdvisoryVulnerability = Schema.Struct({
  package: RepoAdvisoryPackage,
  severity: Schema.String,
  vulnerableVersionRange: Schema.String,
  firstPatchedVersion: Schema.NullOr(RepoAdvisoryPatchedVersion),
})
export type RepoAdvisoryVulnerability = typeof RepoAdvisoryVulnerability.Type

/**
 * Lean repository security advisory (legacy metadata.json cue).
 * Wire `ghsa_id` → `id`; full SecurityAdvisory kitchen-sink (cwes, cvss,
 * references, description, …) is OUT OF SCOPE this slice.
 */
export class RepoSecurityAdvisory extends Schema.Class<RepoSecurityAdvisory>(
  'RepoSecurityAdvisory',
)({
  /** GHSA id (wire `ghsa_id` / legacy cue `id`). */
  id: Schema.String,
  severity: Schema.String,
  summary: Schema.String,
  publishedAt: Schema.String,
  vulnerabilities: Schema.Array(RepoAdvisoryVulnerability),
}) {}

/**
 * Lean repo/security metadata snapshot (NOT healed `Repo`, NOT labels/milestones lists).
 * Wire via additive `GitHubClient.fetchRepository` (+ optional advisories) — see snippet.
 */
export class RepoMetadata extends Schema.Class<RepoMetadata>('RepoMetadata')({
  name: Schema.String,
  fullName: Schema.String,
  description: Schema.NullOr(Schema.String),
  private: Schema.Boolean,
  archived: Schema.Boolean,
  defaultBranch: Schema.String,
  htmlUrl: Schema.String,
  fork: Schema.Boolean,
  hasIssues: Schema.Boolean,
  hasProjects: Schema.Boolean,
  hasWiki: Schema.Boolean,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  pushedAt: Schema.NullOr(Schema.String),
  /** Owner login (legacy flattened `owner: repo.owner.login`). */
  owner: Schema.String,
  stargazersCount: Schema.Int,
  watchersCount: Schema.Int,
  forksCount: Schema.Int,
  openIssuesCount: Schema.Int,
  language: Schema.NullOr(Schema.String),
  topics: Schema.Array(Schema.String),
  visibility: Schema.optional(Schema.NullOr(Schema.String)),
  allowMergeCommit: Schema.optional(Schema.Boolean),
  allowSquashMerge: Schema.optional(Schema.Boolean),
  allowRebaseMerge: Schema.optional(Schema.Boolean),
  mergeQueueEnabled: Schema.optional(Schema.NullOr(Schema.Boolean)),
  /** Tiny summary only — omit when SyncCodeowners owns the full file. */
  codeowners: Schema.optional(RepoCodeownersSummary),
  /** Present when advisories were fetched and non-empty (legacy cue). */
  securityAdvisories: Schema.optional(Schema.Array(RepoSecurityAdvisory)),
}) {}
