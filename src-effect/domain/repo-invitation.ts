/**
 * Pending repo collaborator invitation (Schema-first).
 *
 * Copy to: src-effect/domain/repo-invitation.ts
 * Then export from domain/index.ts: `export * from "./repo-invitation"`
 *
 * Fields cover legacy ProviderRepoInvitation / writeRepoInvitations in
 * src/sync/extended-metadata.ts: id, permissions, createdAt, inviter,
 * invitee, htmlUrl?.
 *
 * Distinct from Collaborator / Person (accepted collaborators & people lists).
 *
 * Snapshot path this slice: `invitations.json` (lean JSON array at mirror root;
 * matches REPO_INVITATIONS_FILE_NAME). Kitchen-sink wrappers / markdown OOS.
 *
 * Wire via additive `GitHubClient.fetchRepoInvitations` —
 * `GET /repos/{owner}/{repo}/invitations` — see snippet.
 */
import { Schema } from "effect"

/**
 * Lean pending repository invitation row.
 */
export class RepoInvitation extends Schema.Class<RepoInvitation>("RepoInvitation")({
  id: Schema.Int,
  /** Permission granted on accept (e.g. `read`, `write`, `admin`, `maintain`, `triage`). */
  permissions: Schema.String,
  createdAt: Schema.DateTimeUtc,
  inviter: Schema.NullOr(Schema.String),
  invitee: Schema.NullOr(Schema.String),
  htmlUrl: Schema.optional(Schema.String)
}) {}
