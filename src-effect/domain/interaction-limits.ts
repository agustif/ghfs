/**
 * Repo interaction limits (Schema-first) — lean REST restrictions snapshot.
 *
 * Copy to: src-effect/domain/interaction-limits.ts
 * Then export from domain/index.ts: `export * from "./interaction-limits"`
 *
 * Fields cover legacy ProviderInteractionLimits / sync-interaction-limits.ts:
 * limit, origin, expires_at → expiresAt. Kitchen-sink repo/synced_at wrapper
 * and MirrorFs markdown are OUT OF SCOPE (JSON snapshot only this slice).
 *
 * Snapshot path this slice: `interaction-limits/interaction-limits.json`
 * (InteractionLimits JSON). Legacy wrote `governance/interaction-limits.json`
 * with a repo/synced_at/restrictions wrapper — lean object under
 * interaction-limits/ matches sibling codeowners style.
 *
 * Wire via additive `GitHubClient.fetchInteractionLimits` —
 * `GET /repos/{owner}/{repo}/interaction-limits` — see snippet.
 */
import { Schema } from 'effect'

/**
 * Known GitHub interaction-limit restriction kinds.
 * Wire may also yield null when no restriction is set → NullOr at the field.
 */
export const InteractionLimitKind = Schema.Literals([
  'existing_users',
  'contributors_only',
  'collaborators_only',
])
export type InteractionLimitKind = typeof InteractionLimitKind.Type

/**
 * Lean repo interaction-limits snapshot (single resource, not a list).
 * Wire via additive `GitHubClient.fetchInteractionLimits` — see snippet.
 */
export class InteractionLimits extends Schema.Class<InteractionLimits>(
  'InteractionLimits',
)({
  /** Restriction kind, or null when none is active. */
  limit: Schema.NullOr(InteractionLimitKind),
  /** Where the restriction originates (e.g. `repository`, `organization`). */
  origin: Schema.String,
  /** ISO-8601 expiry, or null when unrestricted / no expiry. */
  expiresAt: Schema.NullOr(Schema.String),
}) {}
