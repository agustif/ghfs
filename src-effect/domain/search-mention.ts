/**
 * Repo issue-search mentions hit (Schema-first) — lean search mentions row.
 *
 * Copy to: src-effect/domain/search-mention.ts
 * Then export from domain/index.ts: `export * from "./search-mention"`
 *
 * Fields cover legacy `IssueSearchResult` rows from src/sync/search.ts
 * searchMentions (source stamped `mention-search`):
 * type, source, timestamp, number, title, state, url, labels[], author,
 * created, updated.
 * Kitchen-sink SearchIssueResult dumps and MirrorFs markdown are OUT OF SCOPE
 * (lean array snapshot only this slice).
 *
 * Snapshot path this slice: `search/mentions.json` (JSON array).
 * Legacy wrote `.ghfs/search/repo-mentions.jsonl` (jsonl) — lean JSON **array**
 * under search/ matches sibling `search/code-todos.json` / `search/commit-refs.json`;
 * jsonl + `repo-mentions` filename noted as legacy.
 *
 * Wire via additive `GitHubClient.searchIssues({ query, maxResults? })` —
 * `GET /search/issues?q=…` — see snippet. Sync builds the exact cue query
 * `${owner}/${repoName} OR ${repoName}` from `config.repo` (repo-name mentions
 * across issues — heavy; NOT @user / me-summary mentions). Do NOT port
 * issueQueries (config-driven Record — separate follow-up).
 *
 * Tip: a6bd448 — peel from src/sync/search.ts searchMentions only
 * (do NOT port issueQueries; code-todos / commit-refs already landed).
 */
import { Schema } from 'effect'

/**
 * Transient hit from `GitHubClient.searchIssues` — issue fields only.
 * Sync stamps `type` / `source` / `timestamp` onto Mention for the snapshot.
 * Reusable later by issueQueries satellite (different `source` stamp).
 */
export interface SearchIssueHit {
  readonly number: number
  readonly title: string
  readonly state: 'open' | 'closed'
  readonly url: string
  readonly labels: ReadonlyArray<string>
  readonly author: string | null
  readonly created: string
  readonly updated: string
}

/**
 * Lean mention-search snapshot row (legacy IssueSearchResult with
 * `source: 'mention-search'`). Wire via additive `GitHubClient.searchIssues`
 * — see snippet.
 *
 * Alias: SearchMention (same class) for callers that prefer the search-prefixed name.
 * Distinct from domain `MeMentionItem` (local SyncState @user scan in me-summary).
 */
export class Mention extends Schema.Class<Mention>('Mention')({
  /** Always `issue` for this satellite (legacy `type: 'issue'`). */
  type: Schema.Literals(['issue']),
  /** Always `mention-search` (legacy `source: 'mention-search'`). */
  source: Schema.Literals(['mention-search']),
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

/** Prefer `Mention`; alias kept for SearchMention naming cue. */
export { Mention as SearchMention }

export type MentionEncoded = typeof Mention.Encoded
export type MentionType = typeof Mention.Type

export const decodeMention = Schema.decodeUnknownSync(Mention)
export const decodeMentions = Schema.decodeUnknownSync(Schema.Array(Mention))
