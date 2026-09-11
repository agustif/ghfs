/**
 * Repository issue type (Schema-first) — lean graph-metadata peel.
 *
 * Copy to: src-effect/domain/issue-type.ts
 * Then export from domain/index.ts: `export * from "./issue-type"`
 *
 * Fields cover legacy ProviderIssueType / writeRepositoryGraphMetadata
 * issue-types.json in src/sync/graph-metadata.ts: id, nodeId, name,
 * description, color, isEnabled.
 *
 * Snapshot path this slice: `.metadata/issue-types.json` (lean JSON array;
 * matches cue under config.directory). Skip write when empty (cue).
 * Org issue-fields peel is OUT OF SCOPE this PR (next leftover).
 *
 * Wire via additive `GitHubClient.fetchRepositoryIssueTypes` —
 * `GET /repos/{owner}/{repo}/issue-types` — see snippet.
 */
import { Schema } from "effect"

/**
 * Known GitHub issue-type color tokens, with String|null fallback.
 */
export const IssueTypeColor = Schema.NullOr(
  Schema.Union([
    Schema.Literals([
      "gray",
      "blue",
      "green",
      "yellow",
      "orange",
      "red",
      "pink",
      "purple"
    ]),
    Schema.String
  ])
)
export type IssueTypeColor = typeof IssueTypeColor.Type

/**
 * Lean repository issue-type list row.
 */
export class IssueType extends Schema.Class<IssueType>("IssueType")({
  id: Schema.Int,
  nodeId: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  color: IssueTypeColor,
  isEnabled: Schema.Boolean
}) {}
