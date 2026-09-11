/**
 * Single-fetch sync for GitHub issue-search repo-name mentions → search/mentions.json
 *
 * Copy to: src-effect/services/sync-search-mentions.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.searchIssues — see sync-search-mentions.md / snippet.
 * MirrorFs has no writeMentions yet → writes via FileSystem under config.directory.
 * API: GET /search/issues?q={owner}/{name}+OR+{name}&per_page=&page=1
 * (NO auto `repo:` scope — cross-repo text mention of the repo name; heavy.)
 *
 * Schema models first; MirrorFs markdown + legacy jsonl are OUT OF SCOPE
 * (lean JSON array only). Do NOT port issueQueries (config-driven Record —
 * separate follow-up). code-todos / commit-refs already landed.
 *
 * Fetch style (legacy searchMentions cue):
 *   query `${owner}/${repoName} OR ${repoName}` from config.repo
 *   searchIssues({ query, maxResults }) — NO Effect.forEach fan-out, NO Stream.paginate
 *   fetchAuthenticatedUser NOT required for exact cue (repo-name OR; not @user)
 * Optional Stream.fromIterable for a uniform stream() surface (mirrors
 * sync-search-commit-refs / sync-search-code-todos). Pattern mirrors landed
 * SyncSearchCommitRefs Context.Service + Layer + FileSystem snapshot (tip a6bd448 / #227).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError, SearchIssueHit } from "../domain"
import { FileSystemError, Mention, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const SEARCH_DIR_NAME = "search"
const MENTIONS_FILE_NAME = "mentions.json"
/** Match legacy config.search.maxResults default. */
const DEFAULT_MAX_RESULTS = 100

/** Additive surface expected on GitHubClient (see sync-search-mentions.md). */
type GitHubClientSearchIssues = {
  readonly searchIssues: (params: {
    readonly query: string
    readonly maxResults?: number
  }) => Effect.Effect<Array<SearchIssueHit>, GitHubError>
}

export interface SyncSearchMentionsSummary {
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

/** Legacy try/catch around searchIssues → []; keep observe resilient on search failure. */
function emptyOnFailure(
  effect: Effect.Effect<Array<SearchIssueHit>, SyncError>
): Effect.Effect<Array<SearchIssueHit>, never> {
  return effect.pipe(Effect.catchAll(() => Effect.succeed([] as Array<SearchIssueHit>)))
}

/** Exact cue query from src/sync/search.ts searchMentions. */
function buildMentionsQuery(repo: string): string {
  const [owner, repoName] = repo.split("/")
  return `${owner}/${repoName} OR ${repoName}`
}

function compareMentions(a: Mention, b: Mention): number {
  const byUpdated = b.updated.localeCompare(a.updated)
  if (byUpdated !== 0) return byUpdated
  const byNumber = a.number - b.number
  return byNumber !== 0 ? byNumber : a.url.localeCompare(b.url)
}

export class SyncSearchMentions extends Context.Service<
  SyncSearchMentions,
  {
    readonly sync: () => Effect.Effect<SyncSearchMentionsSummary, SyncError>
    readonly stream: () => Stream.Stream<Mention, SyncError>
  }
>()("ghfs/services/SyncSearchMentions") {
  static readonly layer = Layer.effect(
    SyncSearchMentions,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive searchIssues lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientSearchIssues
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchAll = (): Effect.Effect<Array<Mention>, SyncError> =>
        Effect.gen(function* () {
          const maxResults = DEFAULT_MAX_RESULTS
          const now = yield* DateTime.now
          const timestamp = DateTime.formatIso(now)
          const query = buildMentionsQuery(config.repo)

          // Single-fetch (legacy searchMentions — one query, maxResults cap).
          // fetchAuthenticatedUser not used — cue is repo-name OR, not @user.
          const hits = yield* emptyOnFailure(
            mapGitHub(
              github.searchIssues({
                query,
                maxResults
              })
            )
          )

          return hits.map((hit) =>
            Mention.make({
              type: "issue",
              source: "mention-search",
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
          )
        })

      const stream = (): Stream.Stream<Mention, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const rows = yield* fetchAll()
            return Stream.fromIterable(rows)
          })
        )

      const sync = Effect.fn("SyncSearchMentions.sync")(function* (): Effect.fn.Return<
        SyncSearchMentionsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing search mentions via single-fetch searchIssues (repo-name OR query, maxResults)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const searchDir = path.join(config.directory, SEARCH_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(searchDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(searchDir)))
          )

          const collected = yield* fetchAll()
          collected.sort(compareMentions)

          const filePath = path.join(searchDir, MENTIONS_FILE_NAME)
          // Schema-first encode (jsonl / MirrorFs markdown OOS)
          const encoded = Schema.encodeSync(Schema.Array(Mention))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeMentions — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeMentions(mentions) → search/mentions.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Search mentions synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncSearchMentions.of({ sync, stream })
    })
  )
}
