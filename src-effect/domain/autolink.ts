/**
 * Repo autolink reference (Schema-first) — lean REST autolinks list row.
 *
 * Copy to: src-effect/domain/autolink.ts
 * Then export from domain/index.ts: `export * from "./autolink"`
 *
 * Fields cover legacy AutolinkReference / writeAutolinksFile cues:
 * id, key_prefix → keyPrefix, url_template → urlTemplate,
 * is_alphanumeric → isAlphanumeric. Optional wire `updated_at` → updatedAt.
 * Kitchen-sink repo/synced_at/count wrapper and MirrorFs markdown are
 * OUT OF SCOPE (lean array snapshot only this slice).
 *
 * Snapshot path this slice: `autolinks/autolinks.json` (JSON array).
 * Legacy wrote `.ghfs/autolinks.json` with `{ repo, synced_at, count, autolinks }`
 * — lean array under autolinks/ matches sibling collaborators/packages style.
 *
 * Wire via additive `GitHubClient.fetchAutolinks` —
 * `GET /repos/{owner}/{repo}/autolinks` (single fetch, not paginated) — see snippet.
 */
import { Schema } from 'effect'

/**
 * Lean repo autolink reference list row.
 * Wire via additive `GitHubClient.fetchAutolinks` — see snippet.
 */
export class Autolink extends Schema.Class<Autolink>('Autolink')({
  /** GitHub autolink id. */
  id: Schema.Number,
  /** Prefix that triggers the link (wire `key_prefix`, e.g. `TICKET-`). */
  keyPrefix: Schema.String,
  /** URL template containing `<num>` (wire `url_template`). */
  urlTemplate: Schema.String,
  /** Whether `<num>` matches alphanumeric chars (wire `is_alphanumeric`). */
  isAlphanumeric: Schema.Boolean,
  /** ISO-8601 update time when present on wire (`updated_at`). */
  updatedAt: Schema.optional(Schema.NullOr(Schema.String)),
}) {}

export const decodeAutolink = Schema.decodeUnknownSync(Autolink)
export const decodeAutolinks = Schema.decodeUnknownSync(Schema.Array(Autolink))
