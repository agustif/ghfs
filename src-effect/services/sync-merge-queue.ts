/**
 * Stream.paginate sync for merge queue entries → merge-queue/entries.json
 *
 * Copy to: src-effect/services/sync-merge-queue.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchMergeQueueEntries — see sync-merge-queue.md / snippet.
 * MirrorFs has no writeMergeQueue yet → writes via FileSystem under config.directory.
 * Transport: GraphQL `repository.mergeQueue.entries(first, after)` (REST is weak for merge queue).
 *
 * Schema models first; MirrorFs markdown/layout (`merge-queue.md`) is OUT OF SCOPE
 * (legacy lives in src/sync/sync-merge-queue.ts).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, MergeQueueEntry, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const MERGE_QUEUE_DIR_NAME = "merge-queue"
const MERGE_QUEUE_FILE_NAME = "entries.json"
const FIRST = 100

/** Cursor page state for GraphQL `after` pagination. */
type PageState = { readonly cursor: string | null }

/** One GraphQL merge-queue entries page (additive client surface). */
export type MergeQueueEntriesPage = {
  readonly entries: Array<MergeQueueEntry>
  readonly pageInfo: {
    readonly hasNextPage: boolean
    readonly endCursor: string | null
  }
}

export interface SyncMergeQueueSummary {
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

export class SyncMergeQueue extends Context.Service<
  SyncMergeQueue,
  {
    readonly sync: () => Effect.Effect<SyncMergeQueueSummary, SyncError>
    readonly stream: () => Stream.Stream<MergeQueueEntry, SyncError>
  }
>()("ghfs/services/SyncMergeQueue") {
  static readonly layer = Layer.effect(
    SyncMergeQueue,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<MergeQueueEntry, SyncError> =>
        Stream.paginate({ cursor: null } as PageState, (state) =>
          Effect.gen(function* () {
            const page = yield* mapGitHub(
              github.fetchMergeQueueEntries({
                after: state.cursor,
                first: FIRST
              })
            )

            const entries = page.entries

            if (entries.length === 0) {
              return [entries, Option.none()] as const
            }

            const next =
              page.pageInfo.hasNextPage && page.pageInfo.endCursor
                ? Option.some({ cursor: page.pageInfo.endCursor })
                : Option.none<PageState>()

            return [entries, next] as const
          })
        )

      const sync = Effect.fn("SyncMergeQueue.sync")(function* (): Effect.fn.Return<
        SyncMergeQueueSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing merge queue via Stream.paginate (GraphQL cursor)")
          yield* mapFs(mirror.ensureDirectory())

          const mergeQueueDir = path.join(config.directory, MERGE_QUEUE_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(mergeQueueDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(mergeQueueDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<MergeQueueEntry>, (acc, entry) => {
              acc.push(entry)
              return acc
            })
          )

          // Stable snapshots: sort by queue position ascending.
          collected.sort((a, b) => a.position - b.position)

          const filePath = path.join(mergeQueueDir, MERGE_QUEUE_FILE_NAME)
          // Schema-first: DateTimeUtc → ISO strings (markdown layout OOS)
          const encoded = Schema.encodeSync(Schema.Array(MergeQueueEntry))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeMergeQueue — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeMergeQueue(entries) → merge-queue/entries.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Merge queue synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncMergeQueue.of({ sync, stream })
    })
  )
}
