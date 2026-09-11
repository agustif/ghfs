/**
 * Repo wiki page (Schema-first).
 *
 * Copy to: src-effect/domain/wiki-page.ts
 * Then export from domain/index.ts: `export * from "./wiki-page"`
 *
 * Fields cover legacy sync-wiki.ts / ProviderWikiPage usage (name, title,
 * content/body, author, updatedAt, htmlUrl). History / WikiPageRevision is
 * OMITTED this slice (legacy history[{sha, author?, authoredDate?, message?}]
 * can land in a follow-up).
 *
 * Legacy wrote `wiki/*.md` + `wiki.md` index — MirrorFs markdown/layout is
 * OUT OF SCOPE; this slice snapshots JSON under `wiki/pages.json`.
 */
import { Schema } from 'effect'

/**
 * Repo-level GitHub Wiki page.
 * Wire via additive `GitHubClient.fetchWikiPages` (wiki repo Contents API
 * and/or shallow clone of `{repo}.wiki.git` — see snippet).
 */
export class WikiPage extends Schema.Class<WikiPage>('WikiPage')({
  /** Page slug / filename stem (e.g. "Home", "_Sidebar"). */
  name: Schema.String,
  /** Display title (often same as name with spaces). */
  title: Schema.String,
  /** Markdown body (legacy `content`; NullOr when listing without blob fetch). */
  content: Schema.NullOr(Schema.String),
  author: Schema.NullOr(Schema.String),
  updatedAt: Schema.NullOr(Schema.DateTimeUtc),
  htmlUrl: Schema.optional(Schema.String),
}) {}
