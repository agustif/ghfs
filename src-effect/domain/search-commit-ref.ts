/**
 * Repo commit-search fixes/closes/resolves hit (Schema-first) — lean search commit-refs row.
 *
 * Copy to: src-effect/domain/search-commit-ref.ts
 * Then export from domain/index.ts: `export * from "./search-commit-ref"`
 *
 * Fields cover legacy `CommitRefResult` in src/sync/search.ts searchCommitRefs:
 * type, source, timestamp, sha, message, author, date, url, references: number[].
 * Kitchen-sink SearchCommitResult dumps and MirrorFs markdown are OUT OF SCOPE
 * (lean array snapshot only this slice).
 *
 * Snapshot path this slice: `search/commit-refs.json` (JSON array).
 * Legacy wrote `.ghfs/search/commit-refs.jsonl` (jsonl) — lean JSON **array**
 * under search/ matches sibling `search/code-todos.json`; jsonl noted as legacy.
 *
 * Wire via additive `GitHubClient.searchCommits({ query, maxResults? })` —
 * `GET /search/commits?q={term}+repo:{owner}/{name}` with sort=committer-date —
 * see snippet. Sync runs a **single** fixed query
 * `fixes OR closes OR resolves OR fix OR close OR resolve`, then
 * `extractIssueReferences(message)` → keep rows with references.length > 0.
 *
 * Tip: c735f50 — peel from src/sync/search.ts searchCommitRefs only
 * (do NOT port issueQueries / mentions; code-todos already landed).
 */
import { Schema } from 'effect'

/**
 * Transient hit from `GitHubClient.searchCommits` — sha/message/author/date/url.
 * Sync stamps `type` / `source` / `timestamp` and extracts `references` onto CommitRef.
 */
export interface SearchCommitHit {
  readonly sha: string
  readonly message: string
  readonly author: string
  readonly date: string
  readonly url: string
}

/**
 * Extract unique issue numbers from a commit message via GitHub closing-keyword
 * patterns (`fix(es|ed)?|close(s|d)?|resolve(s|d)? #N`). Mirrors legacy
 * `extractIssueReferences` in src/sync/search.ts.
 */
export function extractIssueReferences(message: string): Array<number> {
  const pattern = /(?:fix(?:es|ed)?|close(?:s|d)?|resolve(?:s|d)?)\s+#(\d+)/gi
  const matches = [...message.matchAll(pattern)]
  return [...new Set(matches.map((m) => Number.parseInt(m[1]!, 10)))]
}

/**
 * Lean commit-ref search snapshot row (legacy CommitRefResult).
 * Wire via additive `GitHubClient.searchCommits` — see snippet.
 *
 * Alias: SearchCommitRef (same class) for callers that prefer the search-prefixed name.
 */
export class CommitRef extends Schema.Class<CommitRef>('CommitRef')({
  /** Always `commit` for this satellite (legacy `type: 'commit'`). */
  type: Schema.Literals(['commit']),
  /** Always `commit-search` (legacy `source: 'commit-search'`). */
  source: Schema.Literals(['commit-search']),
  /** ISO-8601 sync stamp shared across the batch (legacy `timestamp`). */
  timestamp: Schema.String,
  /** Full commit sha (wire `sha`). */
  sha: Schema.String,
  /** Full commit message (wire `commit.message`). */
  message: Schema.String,
  /** Author login or commit-author name (wire `author.login` ?? `commit.author.name`). */
  author: Schema.String,
  /** Author date ISO string (wire `commit.author.date`). */
  date: Schema.String,
  /** HTML url for the commit (wire `html_url`). */
  url: Schema.String,
  /** Unique issue numbers extracted from message via closing keywords. */
  references: Schema.Array(Schema.Number),
}) {}

/** Prefer `CommitRef`; alias kept for SearchCommitRef naming cue. */
export { CommitRef as SearchCommitRef }

export type CommitRefEncoded = typeof CommitRef.Encoded
export type CommitRefType = typeof CommitRef.Type

export const decodeCommitRef = Schema.decodeUnknownSync(CommitRef)
export const decodeCommitRefs = Schema.decodeUnknownSync(Schema.Array(CommitRef))
