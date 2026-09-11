/**
 * Organization team (Schema-first) — lean org teams list row.
 *
 * Copy to: src-effect/domain/team.ts
 * Then export from domain/index.ts: `export * from "./team"`
 *
 * Fields cover legacy ProviderGraphQLTeam / sync-teams.ts cues:
 * id, slug, name, privacy, membersCount, repositoriesCount, createdAt,
 * updatedAt, url, description?. Members *list* is OUT OF SCOPE (counts only).
 *
 * Snapshot path this slice: `teams/teams.json` (JSON array).
 * MirrorFs markdown/layout (`teams/index.md`, `teams/<slug>.md`) OUT OF SCOPE.
 *
 * Prefer GraphQL org teams cursor (counts + timestamps). REST
 * `GET /orgs/{org}/teams` is documented as an alternate lean list.
 */
import { Schema } from 'effect'

/**
 * Known team `privacy` values (normalized lowercase), with String
 * fallback for forward-compat (GraphQL wire is often `SECRET` / `CLOSED` /
 * `VISIBLE`; REST uses `secret` / `closed`).
 */
export const TeamPrivacy = Schema.Union([
  Schema.Literals(['secret', 'closed', 'visible']),
  Schema.String,
])
export type TeamPrivacy = typeof TeamPrivacy.Type

/**
 * Lean organization team list row (no embedded members).
 * Wire via additive `GitHubClient.fetchTeams` — see snippet.
 */
export class Team extends Schema.Class<Team>('Team')({
  /** GraphQL global id, or REST `node_id` / stringified numeric id. */
  id: Schema.String,
  slug: Schema.String,
  name: Schema.String,
  privacy: TeamPrivacy,
  /** Members *count* only — member list OOS. */
  membersCount: Schema.Int,
  repositoriesCount: Schema.Int,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  url: Schema.String,
  description: Schema.NullOr(Schema.String),
}) {}
