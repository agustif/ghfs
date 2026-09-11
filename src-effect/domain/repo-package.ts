/**
 * Repo / org GitHub Package (Schema-first) — list metadata only.
 *
 * Copy to: src-effect/domain/repo-package.ts
 * Then export from domain/index.ts: `export * from "./repo-package"`
 *
 * Named `RepoPackage` (not bare `Package`) to avoid reserved-word / collision
 * confusion with npm package / Effect Package helpers.
 *
 * Fields cover legacy sync-packages.ts cues (name, packageType, visibility,
 * owner, createdAt, updatedAt, htmlUrl?, repository?.fullName). Package
 * *versions* are OUT OF SCOPE (follow-up).
 *
 * Snapshot path this slice: `packages/packages.json` (JSON array).
 * Legacy wrote per-package markdown + `packages.md` index — MirrorFs
 * markdown/layout OUT OF SCOPE.
 */
import { Schema } from 'effect'

/**
 * Known GitHub Packages `package_type` values, with String fallback for
 * forward-compat.
 */
export const RepoPackageType = Schema.Union([
  Schema.Literals([
    'npm',
    'maven',
    'rubygems',
    'docker',
    'nuget',
    'container',
  ]),
  Schema.String,
])
export type RepoPackageType = typeof RepoPackageType.Type

/**
 * Known package visibility values, with String fallback.
 */
export const RepoPackageVisibility = Schema.Union([
  Schema.Literals(['public', 'private', 'internal']),
  Schema.String,
])
export type RepoPackageVisibility = typeof RepoPackageVisibility.Type

/** Optional linked repository (wire `repository.full_name` → `fullName`). */
export const RepoPackageRepository = Schema.Struct({
  fullName: Schema.String,
})
export type RepoPackageRepository = typeof RepoPackageRepository.Type

/**
 * Org/user-scoped GitHub Package list row (NOT a version).
 * Wire via additive `GitHubClient.fetchPackages` — see snippet.
 */
export class RepoPackage extends Schema.Class<RepoPackage>('RepoPackage')({
  name: Schema.String,
  packageType: RepoPackageType,
  visibility: RepoPackageVisibility,
  /** Owner login (wire `owner.login`). */
  owner: Schema.String,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  htmlUrl: Schema.optional(Schema.String),
  repository: Schema.optional(RepoPackageRepository),
}) {}
