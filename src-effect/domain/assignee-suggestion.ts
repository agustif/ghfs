/**
 * Assignable user suggestion (Schema-first) — lean kitchen-sink peel.
 *
 * Copy to: src-effect/domain/assignee-suggestion.ts
 * Then export from domain/index.ts: `export * from "./assignee-suggestion"`
 *
 * Fields cover legacy AssigneeSuggestion / writeKitchenSinkData
 * assignee-suggestions.json in src/sync/sync-repository-kitchen-sink.ts:
 * login, id, node_id → nodeId, avatar_url → avatarUrl, type, site_admin → siteAdmin.
 *
 * Snapshot path this slice: `assignee-suggestions/assignee-suggestions.json`
 * (lean JSON **array** under config.directory — not kitchen-sink/).
 * Kitchen-sink README / enabledFeatures markdown OOS.
 * Distinct from Collaborator (#210 — permissions/role) and Person (#208 —
 * contributions/htmlUrl).
 *
 * Wire via additive `GitHubClient.fetchAssigneeSuggestions` —
 * `GET /repos/{owner}/{repo}/assignees?page=&per_page=` — see snippet.
 *
 * Remaining kitchen-sink leftovers (vuln reporting, traffic) stay OUT OF SCOPE.
 */
import { Schema } from "effect"

/**
 * Lean assignable-user list row (who can be assigned to issues).
 */
export class AssigneeSuggestion extends Schema.Class<AssigneeSuggestion>(
  "AssigneeSuggestion"
)({
  login: Schema.String,
  id: Schema.Number,
  /** Wire `node_id`. */
  nodeId: Schema.String,
  /** Wire `avatar_url`. */
  avatarUrl: Schema.String,
  /** Wire `type` (e.g. User / Bot). */
  type: Schema.String,
  /** Wire `site_admin`. */
  siteAdmin: Schema.Boolean
}) {}

export const decodeAssigneeSuggestion =
  Schema.decodeUnknownSync(AssigneeSuggestion)
export const decodeAssigneeSuggestions = Schema.decodeUnknownSync(
  Schema.Array(AssigneeSuggestion)
)
