/**
 * Multi-term single-page sync for GitHub code-search TODOs → search/code-todos.json
 *
 * Copy to: src-effect/services/sync-search-code-todos.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.searchCode — see sync-search-code-todos.md / snippet.
 * MirrorFs has no writeCodeTodos yet → writes via FileSystem under config.directory.
 * API: GET /search/code?q={term}+repo:{owner}/{name}&per_page= (text-match Accept)
 *
 * Schema models first; MirrorFs markdown + legacy jsonl are OUT OF SCOPE
 * (lean JSON array only). Do NOT port commitRefs / issueQueries / mentions.
 *
 * Fetch style (legacy searchCodeTodos cue):
 *   fixed terms TODO / FIXME / @todo / @fixme
 *   Effect.forEach over terms with maxResults split (ceil(max/terms))
 *   No Stream.paginate (legacy uses maxResults cap per term, not full search pages)
 * Optional Stream.fromIterable for a uniform stream() surface (mirrors sync-rule-suites /
 * sync-autolinks). Pattern mirrors landed sync-rule-suites Context.Service + Layer +
 * FileSystem snapshot (tip f68fc6b / #225 rule-suites).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError, SearchCodeHit } from "../domain"
import { CodeTodo, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const SEARCH_DIR_NAME = "search"
const CODE_TODOS_FILE_NAME = "code-todos.json"
/** Match legacy config.search.maxResults default. */
const DEFAULT_MAX_RESULTS = 100
/** Fixed query terms from src/sync/search.ts searchCodeTodos. */
const CODE_TODO_QUERY_TERMS = ["TODO", "FIXME", "@todo", "@fixme"] as const

/** Additive surface expected on GitHubClient (see sync-search-code-todos.md). */
type GitHubClientSearchCode = {
  readonly searchCode: (params: {
    readonly query: string
    readonly maxResults?: number
  }) => Effect.Effect<Array<SearchCodeHit>, GitHubError>
}

export interface SyncSearchCodeTodosSummary {
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

/** Legacy try/catch per term → []; keep observe resilient when one query fails. */
function emptyOnFailure(
  effect: Effect.Effect<Array<SearchCodeHit>, SyncError>
): Effect.Effect<Array<SearchCodeHit>, never> {
  return effect.pipe(Effect.catchAll(() => Effect.succeed([] as Array<SearchCodeHit>)))
}

function compareCodeTodos(a: CodeTodo, b: CodeTodo): number {
  const byPath = a.path.localeCompare(b.path)
  if (byPath !== 0) return byPath
  const bySha = a.sha.localeCompare(b.sha)
  return bySha !== 0 ? bySha : a.url.localeCompare(b.url)
}

export class SyncSearchCodeTodos extends Context.Service<
  SyncSearchCodeTodos,
  {
    readonly sync: () => Effect.Effect<SyncSearchCodeTodosSummary, SyncError>
    readonly stream: () => Stream.Stream<CodeTodo, SyncError>
  }
>()("ghfs/services/SyncSearchCodeTodos") {
  static readonly layer = Layer.effect(
    SyncSearchCodeTodos,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive searchCode lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientSearchCode
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchAll = (): Effect.Effect<Array<CodeTodo>, SyncError> =>
        Effect.gen(function* () {
          const maxResults = DEFAULT_MAX_RESULTS
          const perTerm = Math.ceil(maxResults / CODE_TODO_QUERY_TERMS.length)
          const now = yield* DateTime.now
          const timestamp = DateTime.formatIso(now)

          // Sequential forEach (default concurrency 1) — code-search rate limit is tight.
          const batches = yield* Effect.forEach(CODE_TODO_QUERY_TERMS, (term) =>
            emptyOnFailure(
              mapGitHub(github.searchCode({ query: term, maxResults: perTerm }))
            ).pipe(
              Effect.map((hits) =>
                hits.map((hit) =>
                  CodeTodo.make({
                    type: "code",
                    source: "code-search",
                    timestamp,
                    path: hit.path,
                    sha: hit.sha,
                    url: hit.url,
                    fragments: [...hit.fragments]
                  })
                )
              )
            )
          )

          return batches.flat()
        })

      const stream = (): Stream.Stream<CodeTodo, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const rows = yield* fetchAll()
            return Stream.fromIterable(rows)
          })
        )

      const sync = Effect.fn("SyncSearchCodeTodos.sync")(function* (): Effect.fn.Return<
        SyncSearchCodeTodosSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing search code-todos via forEach over fixed TODO/FIXME terms (maxResults split)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const searchDir = path.join(config.directory, SEARCH_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(searchDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(searchDir)))
          )

          const collected = yield* fetchAll()
          collected.sort(compareCodeTodos)

          const filePath = path.join(searchDir, CODE_TODOS_FILE_NAME)
          // Schema-first encode (jsonl / MirrorFs markdown OOS)
          const encoded = Schema.encodeSync(Schema.Array(CodeTodo))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeCodeTodos — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeCodeTodos(todos) → search/code-todos.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Search code-todos synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncSearchCodeTodos.of({ sync, stream })
    })
  )
}
