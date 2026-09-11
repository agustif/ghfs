/**
 * Repository custom property value (Schema-first) — lean kitchen-sink peel.
 *
 * Copy to: src-effect/domain/custom-property-value.ts
 * Then export from domain/index.ts: `export * from "./custom-property-value"`
 *
 * Fields cover legacy CustomPropertyValue / writeKitchenSinkData
 * custom-properties.json in src/sync/sync-repository-kitchen-sink.ts:
 * property_name → propertyName, value (string | number | string[] | null).
 *
 * Snapshot path this slice: `custom-properties/custom-properties.json`
 * (lean JSON array under config.directory; sibling autolinks/ style —
 * not kitchen-sink/ wrapper). Kitchen-sink README / enabledFeatures
 * markdown OOS.
 *
 * Wire via additive `GitHubClient.fetchCustomProperties` —
 * `GET /repos/{owner}/{repo}/properties/values` — see snippet.
 *
 * Other kitchen-sink writers (commit activity, participation, tags, git refs,
 * assignee suggestions, vuln reporting, traffic, autolinks already peeled)
 * stay OUT OF SCOPE.
 */
import { Schema } from "effect"

/**
 * Wire `value` — GitHub custom property values are string, string[], or null;
 * legacy kitchen-sink type also allowed number.
 */
export const CustomPropertyValueValue = Schema.NullOr(
  Schema.Union([
    Schema.String,
    Schema.Number,
    Schema.Array(Schema.String)
  ])
)
export type CustomPropertyValueValue = typeof CustomPropertyValueValue.Type

/**
 * Lean repository custom-property value list row.
 */
export class CustomPropertyValue extends Schema.Class<CustomPropertyValue>(
  "CustomPropertyValue"
)({
  /** Wire `property_name`. */
  propertyName: Schema.String,
  /** Wire `value` (string | number | string[] | null). */
  value: CustomPropertyValueValue
}) {}

export const decodeCustomPropertyValue =
  Schema.decodeUnknownSync(CustomPropertyValue)
export const decodeCustomPropertyValues = Schema.decodeUnknownSync(
  Schema.Array(CustomPropertyValue)
)
