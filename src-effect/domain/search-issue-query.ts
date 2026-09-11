/**
 * Config-driven issue-search query hit (Schema-first) — lean search issue-queries row.
 *
 * Copy to: src-effect/domain/search-issue-query.ts
 * Then export from domain/index.ts: `export * from "./search-issue-query"`
 *
 * Fields cover legacy `IssueSearchResult` rows from src/sync/search.ts
 * runIssueSearches (source stamped `issue-search:${key}`):
 * type, source, timestamp, number, title, state, url, labels[], author,
 * created, updated.
 * Kitchen-sink SearchIssueResult dumps and MirrorFs markdown are OUT OF SCOPE
 * (lean snapshot only this slice).
 *
 * Snapshot path this slice: `search/issue-queries.json`
 * Shape: `{ queries: Record<key, Array<SearchIssueQueryHit>> }` — Schema.Record
 * of arrays (Schema-friendly; one lean file).
 * Legacy wrote `.ghfs/search/issues-${key}.jsonl` (per-key jsonl) — lean ONE
 * file under search/ matches sibling `search/mentions.json` / `search/code-todos.json`
 * / `search/commit-refs.json`; per-key jsonl noted as legacy.
 *
 * Wire via additive `GitHubClient.searchIssues({ query, maxResults? })` —
 * **reuse** from search-mentions snippet (same GET /search/issues; no auto `repo:`
 * scope — callers pass fully formed query strings from config.search.issueQueries).
 * Sync stamps `source: \`issue-search:${key}\`` per config key.
 *
 * Reuses transient `SearchIssueHit` from domain/search-mention.ts (client → sync
 * stamps type/source/timestamp). Do NOT rewrite config.ts — read
 * `search.issueQueries` via optional cast (default empty Record → empty snapshot).
 *
 * Tip: 33f0a9a — peel from src/sync/search.ts runIssueSearches only
 * (mentions / code-todos / commit-refs already landed).
 */
import { Schema } from 'effect'

/**
 * Lean issue-query snapshot row (legacy IssueSearchResult with
 * `source: \`issue-search:${key}\``). Wire via additive `GitHubClient.searchIssues`
 * — reuse search-mentions snippet.
 *
 * Distinct from domain `Mention` (`source: 'mention-search'` Literals).
 * `source` is Schema.String because the key is config-driven.
 */
export class SearchIssueQueryHit extends Schema.Class<SearchIssueQueryHit>(
  'SearchIssueQueryHit',
)({
  /** Always `issue` for this satellite (legacy `type: 'issue'`). */
  type: Schema.Literals(['issue']),
  /**
   * Legacy `source: \`issue-search:${key}\`` — dynamic key from
   * `config.search.issueQueries`. Use `issueSearchSource(key)` when stamping.
   */
  source: Schema.String,
  /** ISO-8601 sync stamp shared across the batch (legacy `timestamp`). */
  timestamp: Schema.String,
  /** Issue / PR number (wire `number`). */
  number: Schema.Int,
  /** Issue title (wire `title`). */
  title: Schema.String,
  /** Open/closed (wire `state`; lean Literals). */
  state: Schema.Literals(['open', 'closed']),
  /** HTML url (wire `html_url`). */
  url: Schema.String,
  /** Label names (wire `labels[].name`). */
  labels: Schema.Array(Schema.String),
  /** Author login or null (wire `user?.login ?? null`). */
  author: Schema.NullOr(Schema.String),
  /** Created-at ISO string (wire `created_at`). */
  created: Schema.String,
  /** Updated-at ISO string (wire `updated_at`). */
  updated: Schema.String,
}) {}

/** Stamp helper — matches legacy `source: \`issue-search:${key}\``. */
export function issueSearchSource(key: string): string {
  return `issue-search:${key}`
}

/**
 * Lean one-file snapshot for all saved issueQueries.
 * Prefer over legacy per-key `issues-${key}.jsonl`.
 */
export class IssueQueriesSnapshot extends Schema.Class<IssueQueriesSnapshot>(
  'IssueQueriesSnapshot',
)({
  /** Map of config query key → lean hit rows for that query. */
  queries: Schema.Record(Schema.String, Schema.Array(SearchIssueQueryHit)),
}) {}

export type SearchIssueQueryHitEncoded = typeof SearchIssueQueryHit.Encoded
export type SearchIssueQueryHitType = typeof SearchIssueQueryHit.Type
export type IssueQueriesSnapshotEncoded = typeof IssueQueriesSnapshot.Encoded
export type IssueQueriesSnapshotType = typeof IssueQueriesSnapshot.Type

export const decodeSearchIssueQueryHit =
  Schema.decodeUnknownSync(SearchIssueQueryHit)
export const decodeSearchIssueQueryHits = Schema.decodeUnknownSync(
  Schema.Array(SearchIssueQueryHit),
)
export const decodeIssueQueriesSnapshot =
  Schema.decodeUnknownSync(IssueQueriesSnapshot)
