/**
 * Repo contributor / person (Schema-first) — lean REST contributors list row.
 *
 * Copy to: src-effect/domain/person.ts
 * Then export from domain/index.ts: `export * from "./person"`
 *
 * Fields cover lean `GET /repos/{owner}/{repo}/contributors` wire
 * (login, avatar_url, html_url, contributions, type) plus optional `name`
 * (NullOr — not on the contributors list response; reserved for follow-up
 * profile enrichment). AuthoredPRs / reviews / codeowners are OUT OF SCOPE
 * (legacy kitchen-sink lives in src/sync/sync-people.ts).
 *
 * Snapshot path this slice: `people/people.json` (JSON array).
 * MirrorFs markdown/layout OUT OF SCOPE. Collaborators follow-up.
 */
import { Schema } from 'effect'

/**
 * Known contributor `type` values (normalized lowercase), with String
 * fallback for forward-compat (GitHub wire is often `User` / `Bot`).
 */
export const PersonType = Schema.Union([
  Schema.Literals(['user', 'bot']),
  Schema.String,
])
export type PersonType = typeof PersonType.Type

/**
 * Lean people/contributor list row.
 * Wire via additive `GitHubClient.fetchContributors` — see snippet.
 */
export class Person extends Schema.Class<Person>('Person')({
  login: Schema.String,
  /** Display name when known; contributors list usually yields null. */
  name: Schema.NullOr(Schema.String),
  avatarUrl: Schema.NullOr(Schema.String),
  htmlUrl: Schema.optional(Schema.String),
  contributions: Schema.optional(Schema.Int),
  type: Schema.optional(PersonType),
}) {}
