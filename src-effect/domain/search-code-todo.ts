/**
 * Repo code-search TODO/FIXME hit (Schema-first) — lean search code-todos row.
 *
 * Copy to: src-effect/domain/search-code-todo.ts
 * Then export from domain/index.ts: `export * from "./search-code-todo"`
 *
 * Fields cover legacy `CodeTodoResult` in src/sync/search.ts searchCodeTodos:
 * type, source, timestamp, path, sha, url, fragments[].
 * Kitchen-sink SearchCodeResult (name / repository) and MirrorFs markdown are
 * OUT OF SCOPE (lean array snapshot only this slice).
 *
 * Snapshot path this slice: `search/code-todos.json` (JSON array).
 * Legacy wrote `.ghfs/search/code-todos.jsonl` (jsonl) — lean JSON **array**
 * under search/ matches sibling satellite style; jsonl noted as legacy.
 * Alt sibling dir `search-code-todos/code-todos.json` also fine; prefer search/
 * so future commit-refs / issue-queries can share the search/ namespace.
 *
 * Wire via additive `GitHubClient.searchCode({ query, maxResults? })` —
 * `GET /search/code?q={term}+repo:{owner}/{name}` with text-match Accept —
 * see snippet. Sync fans out fixed terms TODO/FIXME/@todo/@fixme.
 *
 * Tip: f68fc6b — peel from src/sync/search.ts searchCodeTodos only
 * (do NOT port commitRefs / issueQueries / mentions).
 */
import { Schema } from 'effect'

/**
 * Transient hit from `GitHubClient.searchCode` — path/sha/url/fragments only.
 * Sync stamps `type` / `source` / `timestamp` onto CodeTodo for the snapshot.
 */
export interface SearchCodeHit {
  readonly path: string
  readonly sha: string
  readonly url: string
  readonly fragments: ReadonlyArray<string>
}

/**
 * Lean code-todo search snapshot row (legacy CodeTodoResult).
 * Wire via additive `GitHubClient.searchCode` — see snippet.
 *
 * Alias: SearchCodeTodo (same class) for callers that prefer the search-prefixed name.
 */
export class CodeTodo extends Schema.Class<CodeTodo>('CodeTodo')({
  /** Always `code` for this satellite (legacy `type: 'code'`). */
  type: Schema.Literals(['code']),
  /** Always `code-search` (legacy `source: 'code-search'`). */
  source: Schema.Literals(['code-search']),
  /** ISO-8601 sync stamp shared across the batch (legacy `timestamp`). */
  timestamp: Schema.String,
  /** File path within the repo (wire `path`). */
  path: Schema.String,
  /** Blob sha for the matched file (wire `sha`). */
  sha: Schema.String,
  /** HTML/API url for the match (wire `url` / `html_url`). */
  url: Schema.String,
  /** Text-match fragments (wire `text_matches[].fragment`). */
  fragments: Schema.Array(Schema.String),
}) {}

/** Prefer `CodeTodo`; alias kept for SearchCodeTodo naming cue. */
export { CodeTodo as SearchCodeTodo }

export type CodeTodoEncoded = typeof CodeTodo.Encoded
export type CodeTodoType = typeof CodeTodo.Type

export const decodeCodeTodo = Schema.decodeUnknownSync(CodeTodo)
export const decodeCodeTodos = Schema.decodeUnknownSync(Schema.Array(CodeTodo))
