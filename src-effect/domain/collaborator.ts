/**
 * Repo collaborator (Schema-first) — lean REST collaborators list row.
 *
 * Copy to: src-effect/domain/collaborator.ts
 * Then export from domain/index.ts: `export * from "./collaborator"`
 *
 * Fields cover legacy ProviderCollaborator / CollaboratorInfo cues:
 * login, name?, avatarUrl?, permission?, roleName?, permissions{
 *   admin, maintain, push, triage, pull
 * }. Teams / apps bundling from legacy sync-collaborators.ts is OUT OF SCOPE
 * (collaborators *list* only this slice).
 *
 * Snapshot path this slice: `collaborators/collaborators.json` (JSON array).
 * MirrorFs markdown/layout OUT OF SCOPE.
 *
 * Wire via additive `GitHubClient.fetchCollaborators` —
 * `GET /repos/{owner}/{repo}/collaborators?page=&per_page=` — see snippet.
 */
import { Schema } from 'effect'

/**
 * Nested collaborator permission flags (GitHub wire `permissions` object).
 * Optional on the lean row — include when the API returns it.
 */
export const CollaboratorPermissions = Schema.Struct({
  admin: Schema.Boolean,
  maintain: Schema.Boolean,
  push: Schema.Boolean,
  triage: Schema.Boolean,
  pull: Schema.Boolean,
})
export type CollaboratorPermissions = typeof CollaboratorPermissions.Type

/**
 * Lean repo collaborator list row.
 * Wire via additive `GitHubClient.fetchCollaborators` — see snippet.
 */
export class Collaborator extends Schema.Class<Collaborator>('Collaborator')({
  login: Schema.String,
  /** Display name when known; collaborators list usually yields null. */
  name: Schema.NullOr(Schema.String),
  avatarUrl: Schema.NullOr(Schema.String),
  /** Effective permission string (e.g. admin/maintain/push/triage/pull). */
  permission: Schema.NullOr(Schema.String),
  /** Custom / fine-grained role name when present (`role_name` on wire). */
  roleName: Schema.optional(Schema.NullOr(Schema.String)),
  /** Nested boolean permission flags when present on wire. */
  permissions: Schema.optional(CollaboratorPermissions),
}) {}
