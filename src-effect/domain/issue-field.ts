/**
 * Organization issue field (Schema-first) — lean graph-metadata peel.
 *
 * Copy to: src-effect/domain/issue-field.ts
 * Then export from domain/index.ts: `export * from "./issue-field"`
 *
 * Fields cover legacy ProviderIssueField / writeRepositoryGraphMetadata
 * issue-fields.json in src/sync/graph-metadata.ts: id, nodeId, name,
 * description, dataType, options?.
 *
 * Snapshot path this slice: `.metadata/issue-fields.json` (lean JSON array;
 * matches cue under config.directory). Skip write when empty (cue).
 * Distinct from SyncIssueTypes (issue-types.json).
 *
 * Wire via additive `GitHubClient.fetchOrganizationIssueFields` —
 * `GET /orgs/{org}/issue-fields` (org = repo owner) — see snippet.
 */
import { Schema } from "effect"

export const IssueFieldDataType = Schema.Union([
  Schema.Literals([
    "text",
    "date",
    "single_select",
    "multi_select",
    "number"
  ]),
  Schema.String
])
export type IssueFieldDataType = typeof IssueFieldDataType.Type

export const IssueFieldOptionColor = Schema.NullOr(
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
export type IssueFieldOptionColor = typeof IssueFieldOptionColor.Type

export const IssueFieldOption = Schema.Struct({
  id: Schema.Int,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  color: IssueFieldOptionColor
})
export type IssueFieldOption = typeof IssueFieldOption.Type

/**
 * Lean organization issue-field list row.
 */
export class IssueField extends Schema.Class<IssueField>("IssueField")({
  id: Schema.Int,
  nodeId: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  dataType: IssueFieldDataType,
  options: Schema.optional(Schema.NullOr(Schema.Array(IssueFieldOption)))
}) {}
