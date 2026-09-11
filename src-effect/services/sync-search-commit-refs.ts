/**
 * Single-fetch sync for GitHub commit-search closing-keyword refs → search/commit-refs.json
 *
 * Copy to: src-effect/services/sync-search-commit-refs.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.searchCommits — see sync-search-commit-refs.md / snippet.
 * MirrorFs has no writeCommitRefs yet → writes via FileSystem under config.directory.
 * API: GET /search/commits?q={query}+repo:{owner}/{name}&per_page=&sort=committer-date&order=desc
 *
 * Schema models first; MirrorFs markdown + legacy jsonl are OUT OF SCOPE
 * (lean JSON array only). Do NOT port issueQueries / mentions (code-todos already landed).
 *
 * Fetch style (legacy searchCommitRefs cue):
 *   single query 'fixes OR closes OR resolves OR fix OR close OR resolve'
 *   searchCommits({ query, maxResults }) — NO Effect.forEach fan-out, NO Stream.paginate
 *   extractIssueReferences(message); drop hits with references.length === 0
 * Optional Stream.fromIterable for a uniform stream() surface (mirrors sync-search-code-todos /
 * sync-autolinks). Pattern mirrors landed SyncSearchCodeTodos Context.Service + Layer +
 * FileSystem snapshot (tip c735f50 / #226 code-todos).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError, SearchCommitHit } from "../domain"
import {
  CommitRef,
  extractIssueReferences,
  FileSystemError,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const SEARCH_DIR_NAME = "search"
const COMMIT_REFS_FILE_NAME = "commit-refs.json"
/** Match legacy config.search.maxResults default. */
const DEFAULT_MAX_RESULTS = 100
/** Fixed query from src/sync/search.ts searchCommitRefs. */
const COMMIT_REF_QUERY =
  "fixes OR closes OR resolves OR fix OR close OR resolve" as const

/** Additive surface expected on GitHubClient (see sync-search-commit-refs.md). */
type GitHubClientSearchCommits = {
  readonly searchCommits: (params: {
    readonly query: string
    readonly maxResults?: number
  }) => Effect.Effect<Array<SearchCommitHit>, GitHubError>
}

export interface SyncSearchCommitRefsSummary {
  readonly synced: number
  readonly path: string
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

/** Legacy try/catch around searchCommits → []; keep observe resilient on search failure. */
function emptyOnFailure(
  effect: Effect.Effect<Array<SearchCommitHit>, SyncError>
): Effect.Effect<Array<SearchCommitHit>, never> {
  return effect.pipe(Effect.catchAll(() => Effect.succeed([] as Array<SearchCommitHit>)))
}

function compareCommitRefs(a: CommitRef, b: CommitRef): number {
  const byDate = b.date.localeCompare(a.date)
  if (byDate !== 0) return byDate
  const bySha = a.sha.localeCompare(b.sha)
  return bySha !== 0 ? bySha : a.url.localeCompare(b.url)
}

export class SyncSearchCommitRefs extends Context.Service<
  SyncSearchCommitRefs,
  {
    readonly sync: () => Effect.Effect<SyncSearchCommitRefsSummary, SyncError>
    readonly stream: () => Stream.Stream<CommitRef, SyncError>
  }
>()("ghfs/services/SyncSearchCommitRefs") {
  static readonly layer = Layer.effect(
    SyncSearchCommitRefs,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive searchCommits lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientSearchCommits
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchAll = (): Effect.Effect<Array<CommitRef>, SyncError> =>
        Effect.gen(function* () {
          const maxResults = DEFAULT_MAX_RESULTS
          const now = yield* DateTime.now
          const timestamp = DateTime.formatIso(now)

          // Single-fetch (legacy searchCommitRefs — one query, maxResults cap).
          const hits = yield* emptyOnFailure(
            mapGitHub(
              github.searchCommits({
                query: COMMIT_REF_QUERY,
                maxResults
              })
            )
          )

          const rows: Array<CommitRef> = []
          for (const hit of hits) {
            const references = extractIssueReferences(hit.message)
            if (references.length === 0) continue
            rows.push(
              CommitRef.make({
                type: "commit",
                source: "commit-search",
                timestamp,
                sha: hit.sha,
                message: hit.message,
                author: hit.author,
                date: hit.date,
                url: hit.url,
                references
              })
            )
          }
          return rows
        })

      const stream = (): Stream.Stream<CommitRef, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const rows = yield* fetchAll()
            return Stream.fromIterable(rows)
          })
        )

      const sync = Effect.fn("SyncSearchCommitRefs.sync")(function* (): Effect.fn.Return<
        SyncSearchCommitRefsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing search commit-refs via single-fetch searchCommits (fixes/closes/resolves, maxResults)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const searchDir = path.join(config.directory, SEARCH_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(searchDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(searchDir)))
          )

          const collected = yield* fetchAll()
          collected.sort(compareCommitRefs)

          const filePath = path.join(searchDir, COMMIT_REFS_FILE_NAME)
          // Schema-first encode (jsonl / MirrorFs markdown OOS)
          const encoded = Schema.encodeSync(Schema.Array(CommitRef))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeCommitRefs — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeCommitRefs(refs) → search/commit-refs.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Search commit-refs synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncSearchCommitRefs.of({ sync, stream })
    })
  )
}
