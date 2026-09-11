/**
 * Repo release (Schema-first).
 *
 * Copy to: src-effect/domain/release.ts
 * Then export from domain/index.ts: `export * from "./release"`
 *
 * Fields cover legacy sync-releases.ts usage (tagName, name, author, body, url,
 * draft/prerelease, createdAt, publishedAt) with GitHub-ish `draft`/`prerelease`
 * naming (map wire / legacy isDraft→draft, isPrerelease→prerelease in the client snippet).
 *
 * Legacy wrote `releases/*.md` + `releases.md` index — MirrorFs markdown/layout
 * is OUT OF SCOPE; this slice snapshots JSON under `releases/releases.json`.
 */
import { Schema } from 'effect'

export class Release extends Schema.Class<Release>('Release')({
  id: Schema.Int,
  tagName: Schema.String,
  name: Schema.NullOr(Schema.String),
  author: Schema.NullOr(Schema.String),
  body: Schema.NullOr(Schema.String),
  /** Prefer human-facing URL (often html_url); see client mapper. */
  url: Schema.String,
  htmlUrl: Schema.optional(Schema.String),
  /** GitHub wire `draft` (legacy isDraft). */
  draft: Schema.Boolean,
  /** GitHub wire `prerelease` (legacy isPrerelease). */
  prerelease: Schema.Boolean,
  createdAt: Schema.DateTimeUtc,
  publishedAt: Schema.NullOr(Schema.DateTimeUtc),
}) {}
