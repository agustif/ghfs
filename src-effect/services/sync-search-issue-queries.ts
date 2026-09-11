/**
 * Multi-query sync for config.search.issueQueries → search/issue-queries.json
 *
 * Copy to: src-effect/services/sync-search-issue-queries.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.searchIssues — **reuse** search-mentions snippet
 * (see github-client-fetch-search-issue-queries.snippet.ts).
 * MirrorFs has no writeIssueQueries yet → writes via FileSystem under config.directory.
 * API: GET /search/issues?q={query}&per_page=&page=1 per config key
 * (NO auto `repo:` scope — query strings come from config as-is).
 *
 * Schema models first; MirrorFs markdown + legacy per-key jsonl are OUT OF SCOPE
 * (lean ONE file `{ queries: Record<key, Array<row>> }`). Do NOT re-port mentions /
 * code-todos / commit-refs. Do NOT rewrite SyncSatellites body or config.ts.
 *
 * Fetch style (legacy runIssueSearches cue):
 *   for each [key, query] in config.search.issueQueries
 *   searchIssues({ query, maxResults }) — Effect.forEach over entries
 *   stamp source `issue-search:${key}`; NO Stream.paginate
 * Optional cast: Effect GhfsConfig lacks search.issueQueries @ tip → read via
 * cast flags pattern (like SyncSatellites); default empty Record → write empty
 * `{ queries: {} }` snapshot. Do NOT rewrite config.ts.
 * Optional Stream.fromIterable for a uniform stream() surface (flattened hits;
 * mirrors sync-search-mentions / sync-search-code-todos).
 * Pattern mirrors landed SyncSearchMentions Context.Service + Layer + FileSystem
 * snapshot (tip 33f0a9a / #228).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError, SearchIssueHit } from "../domain"
import {
  FileSystemError,
  IssueQueriesSnapshot,
  issueSearchSource,
  SearchIssueQueryHit,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const SEARCH_DIR_NAME = "search"
const ISSUE_QUERIES_FILE_NAME = "issue-queries.json"
/** Match legacy config.search.maxResults default. */
const DEFAULT_MAX_RESULTS = 100

/** Additive surface expected on GitHubClient (reuse mentions snippet). */
type GitHubClientSearchIssues = {
  readonly searchIssues: (params: {
    readonly query: string
    readonly maxResults?: number
  }) => Effect.Effect<Array<SearchIssueHit>, GitHubError>
}

/**
 * Optional search flags — NOT on Effect GhfsConfig @ tip 33f0a9a
 * (only directory / token / repo / syncIssues / syncPulls / syncClosed / syncPatches).
 * Cast/read these keys; until additive config lands, default empty Record.
 * Do NOT rewrite config.ts this slice.
 */
type SearchIssueQueriesConfigCast = {
  readonly search?: {
    readonly issueQueries?: Record<string, string>
    readonly maxResults?: number
  }
}

export interface SyncSearchIssueQueriesSummary {
  readonly synced: number
  readonly path: string
  readonly queryKeys: number
}

function mapFs<A, R>(
  effect: Effect.Effect<A, FileSystemError, R>
): Effect.Effect<A, SyncError, R> {
  return Effect.mapError(
    effect,
    (error) =>
      new SyncError({
        message: error.message,
        cause: error
      })
  )
}

function mapGitHub<A, R>(
  effect: Effect.Effect<A, GitHubError, R>
): Effect.Effect<A, SyncError, R> {
  return Effect.mapError(
    effect,
    (error) =>
      new SyncError({
        message: error.message,
        cause: error
      })
  )
}

function toFsError(filePath: string) {
  return (error: BadArgument | SystemError): FileSystemError =>
    new FileSystemError({
      message: error.message,
      path:
        "pathOrDescriptor" in error && typeof error.pathOrDescriptor === "string"
          ? error.pathOrDescriptor
          : filePath,
      cause: error
    })
}

/** Legacy try/catch per key → []; keep observe resilient when one query fails. */
function emptyOnFailure(
  effect: Effect.Effect<Array<SearchIssueHit>, SyncError>
): Effect.Effect<Array<SearchIssueHit>, never> {
  return effect.pipe(Effect.catchAll(() => Effect.succeed([] as Array<SearchIssueHit>)))
}

/**
 * Optional cast — Effect GhfsConfig has no search.issueQueries yet.
 * Default empty Record (write empty snapshot); do not rewrite config.ts.
 */
export function readIssueQueries(
  config: object
): Record<string, string> {
  const cast = config as SearchIssueQueriesConfigCast
  const raw = cast.search?.issueQueries
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key === "string" && key.length > 0 && typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        out[key] = trimmed
      }
    }
  }
  return out
}

function readMaxResults(config: object): number {
  const cast = config as SearchIssueQueriesConfigCast
  const n = cast.search?.maxResults
  if (typeof n === "number" && Number.isFinite(n) && n > 0) {
    return Math.min(Math.floor(n), 100)
  }
  return DEFAULT_MAX_RESULTS
}

function compareHits(a: SearchIssueQueryHit, b: SearchIssueQueryHit): number {
  const byUpdated = b.updated.localeCompare(a.updated)
  if (byUpdated !== 0) return byUpdated
  const byNumber = a.number - b.number
  return byNumber !== 0 ? byNumber : a.url.localeCompare(b.url)
}

function stampHit(
  hit: SearchIssueHit,
  key: string,
  timestamp: string
): SearchIssueQueryHit {
  return SearchIssueQueryHit.make({
    type: "issue",
    source: issueSearchSource(key),
    timestamp,
    number: hit.number,
    title: hit.title,
    state: hit.state,
    url: hit.url,
    labels: [...hit.labels],
    author: hit.author,
    created: hit.created,
    updated: hit.updated
  })
}

export class SyncSearchIssueQueries extends Context.Service<
  SyncSearchIssueQueries,
  {
    readonly sync: () => Effect.Effect<SyncSearchIssueQueriesSummary, SyncError>
    readonly stream: () => Stream.Stream<SearchIssueQueryHit, SyncError>
  }
>()("ghfs/services/SyncSearchIssueQueries") {
  static readonly layer = Layer.effect(
    SyncSearchIssueQueries,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive searchIssues lands on healed github-client (reuse mentions snippet).
      const github = githubBase as unknown as GitHubClientSearchIssues
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchSnapshot = (): Effect.Effect<IssueQueriesSnapshot, SyncError> =>
        Effect.gen(function* () {
          const issueQueries = readIssueQueries(config)
          const maxResults = readMaxResults(config)
          const now = yield* DateTime.now
          const timestamp = DateTime.formatIso(now)
          const entries = Object.entries(issueQueries).sort(([a], [b]) =>
            a.localeCompare(b)
          )

          // Sequential forEach (default concurrency 1) — search rate limit is tight;
          // matches legacy runIssueSearches for-of loop.
          const pairs = yield* Effect.forEach(entries, ([key, query]) =>
            emptyOnFailure(
              mapGitHub(
                github.searchIssues({
                  query,
                  maxResults
                })
              )
            ).pipe(
              Effect.map((hits) => {
                const rows = hits.map((hit) => stampHit(hit, key, timestamp))
                rows.sort(compareHits)
                return [key, rows] as const
              })
            )
          )

          const queries: Record<string, Array<SearchIssueQueryHit>> = {}
          for (const [key, rows] of pairs) {
            queries[key] = rows
          }

          return IssueQueriesSnapshot.make({ queries })
        })

      const stream = (): Stream.Stream<SearchIssueQueryHit, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const snapshot = yield* fetchSnapshot()
            const flattened = Object.keys(snapshot.queries)
              .sort((a, b) => a.localeCompare(b))
              .flatMap((key) => snapshot.queries[key] ?? [])
            return Stream.fromIterable(flattened)
          })
        )

      const sync = Effect.fn("SyncSearchIssueQueries.sync")(function* (): Effect.fn.Return<
        SyncSearchIssueQueriesSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing search issue-queries via forEach over config.search.issueQueries (reuse searchIssues)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const searchDir = path.join(config.directory, SEARCH_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(searchDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(searchDir)))
          )

          const snapshot = yield* fetchSnapshot()
          const queryKeys = Object.keys(snapshot.queries).length
          const synced = Object.values(snapshot.queries).reduce(
            (n, rows) => n + rows.length,
            0
          )

          const filePath = path.join(searchDir, ISSUE_QUERIES_FILE_NAME)
          // Schema-first encode (per-key jsonl / MirrorFs markdown OOS)
          const encoded = Schema.encodeSync(IssueQueriesSnapshot)(snapshot)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeIssueQueries — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeIssueQueries(snapshot) → search/issue-queries.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Search issue-queries synced", {
            synced,
            queryKeys,
            path: filePath
          })

          return { synced, path: filePath, queryKeys }
        })
      })

      return SyncSearchIssueQueries.of({ sync, stream })
    })
  )
}
