/**
 * GitHub Pages build (Schema-first) — lean REST pages/builds list row.
 *
 * Copy to: src-effect/domain/pages-build.ts
 * Then export from domain/index.ts: `export * from "./pages-build"`
 *
 * Fields cover legacy ProviderPagesBuild / sync-pages-builds.ts cues:
 * url, status, error?.message, commit, duration, createdAt, updatedAt,
 * pusher{ login, avatarUrl? }. Latest-build-only helpers and MirrorFs
 * markdown are OUT OF SCOPE (list snapshot only this slice).
 *
 * Snapshot path this slice: `pages-builds/pages-builds.json` (JSON array).
 * Legacy wrote `pages/builds.json` with a repo/synced_at wrapper — lean
 * array under pages-builds/ matches sibling collaborators/packages style.
 *
 * Wire via additive `GitHubClient.fetchPagesBuilds` —
 * `GET /repos/{owner}/{repo}/pages/builds?page=&per_page=` — see snippet.
 */
import { Schema } from 'effect'

/**
 * Known GitHub Pages build `status` values, with String fallback for
 * forward-compat. Wire may also yield null → use NullOr at the field.
 */
export const PagesBuildStatus = Schema.Union([
  Schema.Literals(['built', 'building', 'errored', 'queued']),
  Schema.String,
])
export type PagesBuildStatus = typeof PagesBuildStatus.Type

/** Nested build error object (wire `error`). */
export const PagesBuildError = Schema.Struct({
  message: Schema.NullOr(Schema.String),
})
export type PagesBuildError = typeof PagesBuildError.Type

/** Lean pusher identity on a pages build (wire `pusher`). */
export const PagesBuildPusher = Schema.Struct({
  login: Schema.String,
  avatarUrl: Schema.optional(Schema.String),
})
export type PagesBuildPusher = typeof PagesBuildPusher.Type

/**
 * Lean GitHub Pages build list row.
 * Wire via additive `GitHubClient.fetchPagesBuilds` — see snippet.
 */
export class PagesBuild extends Schema.Class<PagesBuild>('PagesBuild')({
  url: Schema.String,
  status: Schema.NullOr(PagesBuildStatus),
  error: Schema.optional(PagesBuildError),
  commit: Schema.String,
  duration: Schema.NullOr(Schema.Number),
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  pusher: Schema.NullOr(PagesBuildPusher),
}) {}
