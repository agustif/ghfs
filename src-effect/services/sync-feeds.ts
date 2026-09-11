/**
 * Single-resource sync for activity feed URLs → feeds.json
 *
 * Copy to: src-effect/services/sync-feeds.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchFeeds — see sync-feeds.md / snippet.
 * MirrorFs has no writeFeeds yet → writes via FileSystem under config.directory.
 *
 * Cue: src/sync/extended-metadata.ts writeFeeds → FEEDS_FILE_NAME
 * (`feeds.json` at mirror root). Lean object only (no wrapper).
 * Last peel in the extended-metadata writer cluster.
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed for a
 * uniform stream() surface (mirrors sync-network-summary / sync-viewer-status).
 * Pattern mirrors landed sync-network-summary (tip 97f85bd / #241).
 * Do NOT rewrite SyncActivityEvents / SyncActivitySummary.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { Feeds, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue FEEDS_FILE_NAME at mirror root. */
const FEEDS_FILE_NAME = "feeds.json"

/** Additive surface expected on GitHubClient (see sync-feeds.md). */
type GitHubClientFeeds = {
  readonly fetchFeeds: () => Effect.Effect<Feeds, GitHubError>
}

export interface SyncFeedsSummary {
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

export class SyncFeeds extends Context.Service<
  SyncFeeds,
  {
    readonly sync: () => Effect.Effect<SyncFeedsSummary, SyncError>
    readonly stream: () => Stream.Stream<Feeds, SyncError>
  }
>()("ghfs/services/SyncFeeds") {
  static readonly layer = Layer.effect(
    SyncFeeds,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchFeeds lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientFeeds
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchFeeds = (): Effect.Effect<Feeds, SyncError> =>
        mapGitHub(github.fetchFeeds())

      const stream = (): Stream.Stream<Feeds, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const feeds = yield* fetchFeeds()
            return Stream.succeed(feeds)
          })
        )

      const sync = Effect.fn("SyncFeeds.sync")(function* (): Effect.fn.Return<
        SyncFeedsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing feeds via single-resource fetch")
          yield* mapFs(mirror.ensureDirectory())

          const feeds = yield* fetchFeeds()

          const filePath = path.join(config.directory, FEEDS_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; cue root feeds.json)
          const encoded = Schema.encodeSync(Feeds)(feeds)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeFeeds — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeFeeds(feeds) → feeds.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Feeds synced", {
            synced: 1,
            timelineUrl: feeds.timelineUrl,
            userUrl: feeds.userUrl,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncFeeds.of({ sync, stream })
    })
  )
}
