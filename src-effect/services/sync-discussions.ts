/**
 * Stream.paginate sync for repo discussions → discussions/discussions.json
 *
 * Copy to: src-effect/services/sync-discussions.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchDiscussions — see sync-discussions.md / snippet.
 * MirrorFs has no writeDiscussions yet → writes via FileSystem under config.directory.
 * Transport: GraphQL `repository.discussions(first, after)` (REST lacks list discussions).
 *
 * Schema models first; MirrorFs markdown/layout (`discussions/<slug>/*.md`, `discussions.md`)
 * is OUT OF SCOPE (legacy lives in src/sync/sync-discussions.ts). Comments sync is follow-up.
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { Discussion, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const DISCUSSIONS_DIR_NAME = "discussions"
const DISCUSSIONS_FILE_NAME = "discussions.json"
const FIRST = 100

/** Cursor page state for GraphQL `after` pagination. */
type PageState = { readonly cursor: string | null }

/** One GraphQL discussions page (additive client surface). */
export type DiscussionsPage = {
  readonly discussions: Array<Discussion>
  readonly pageInfo: {
    readonly hasNextPage: boolean
    readonly endCursor: string | null
  }
}

export interface SyncDiscussionsSummary {
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

export class SyncDiscussions extends Context.Service<
  SyncDiscussions,
  {
    readonly sync: () => Effect.Effect<SyncDiscussionsSummary, SyncError>
    readonly stream: () => Stream.Stream<Discussion, SyncError>
  }
>()("ghfs/services/SyncDiscussions") {
  static readonly layer = Layer.effect(
    SyncDiscussions,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<Discussion, SyncError> =>
        Stream.paginate({ cursor: null } as PageState, (state) =>
          Effect.gen(function* () {
            const page = yield* mapGitHub(
              github.fetchDiscussions({
                after: state.cursor,
                first: FIRST
              })
            )

            const discussions = page.discussions

            if (discussions.length === 0) {
              return [discussions, Option.none()] as const
            }

            const next =
              page.pageInfo.hasNextPage && page.pageInfo.endCursor
                ? Option.some({ cursor: page.pageInfo.endCursor })
                : Option.none<PageState>()

            return [discussions, next] as const
          })
        )

      const sync = Effect.fn("SyncDiscussions.sync")(function* (): Effect.fn.Return<
        SyncDiscussionsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing discussions via Stream.paginate (GraphQL cursor)")
          yield* mapFs(mirror.ensureDirectory())

          const discussionsDir = path.join(config.directory, DISCUSSIONS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(discussionsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(discussionsDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<Discussion>, (acc, discussion) => {
              acc.push(discussion)
              return acc
            })
          )

          // GraphQL id is opaque String — sort by public number for stable snapshots.
          collected.sort((a, b) => a.number - b.number)

          const filePath = path.join(discussionsDir, DISCUSSIONS_FILE_NAME)
          // Schema-first: DateTimeUtc → ISO strings (markdown layout OOS)
          const encoded = Schema.encodeSync(Schema.Array(Discussion))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeDiscussions — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeDiscussions(discussions) → discussions/discussions.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Discussions synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncDiscussions.of({ sync, stream })
    })
  )
}
