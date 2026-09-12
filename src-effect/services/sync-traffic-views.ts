/**
 * Single-resource sync for traffic views → traffic/views.json
 *
 * Copy to: src-effect/services/sync-traffic-views.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchTrafficViews — see sync-traffic-views.md / snippet.
 * MirrorFs has no writeTrafficViews yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/traffic/views (single fetch — not paginated).
 * 403/404 → { count: 0, uniques: 0, views: [] } in client.
 *
 * Cue: src/sync/sync-repository-kitchen-sink.ts → kitchen-sink/traffic-views.json
 * via provider.fetchTrafficViews. This slice: lean JSON **object** at
 * traffic/views.json (not kitchen-sink/).
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed
 * (mirrors sync-vulnerability-reporting / sync-participation). Always write.
 * Distinct from SyncTrafficReferrers / SyncTrafficPaths. Pattern mirrors landed
 * sync-traffic-paths (tip 38a2488 / #255).
 * Do NOT rewrite SyncTrafficPaths / SyncTrafficReferrers / SyncSatellites.
 *
 * Clones stay OOS this peel.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, TrafficViews } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean sibling of kitchen-sink cue path under config.directory. */
const TRAFFIC_DIR_NAME = "traffic"
const VIEWS_FILE_NAME = "views.json"

/** Additive surface expected on GitHubClient (see sync-traffic-views.md). */
type GitHubClientTrafficViews = {
  readonly fetchTrafficViews: () => Effect.Effect<TrafficViews, GitHubError>
}

export interface SyncTrafficViewsSummary {
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

export class SyncTrafficViews extends Context.Service<
  SyncTrafficViews,
  {
    readonly sync: () => Effect.Effect<SyncTrafficViewsSummary, SyncError>
    readonly stream: () => Stream.Stream<TrafficViews, SyncError>
  }
>()("ghfs/services/SyncTrafficViews") {
  static readonly layer = Layer.effect(
    SyncTrafficViews,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchTrafficViews lands (snippet only).
      const github = githubBase as unknown as GitHubClientTrafficViews
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchOne = (): Effect.Effect<TrafficViews, SyncError> =>
        mapGitHub(github.fetchTrafficViews())

      const stream = (): Stream.Stream<TrafficViews, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const row = yield* fetchOne()
            return Stream.succeed(row)
          })
        )

      const sync = Effect.fn("SyncTrafficViews.sync")(function* (): Effect.fn.Return<
        SyncTrafficViewsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing traffic views via single-resource fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, TRAFFIC_DIR_NAME)
          const filePath = path.join(dir, VIEWS_FILE_NAME)

          const status = yield* fetchOne()

          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const encoded = Schema.encodeSync(TrafficViews)(status)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeTrafficViews — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeTrafficViews(status) → traffic/views.json
          // Always write lean object (including empty views series).
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Traffic views synced", {
            synced: 1,
            count: status.count,
            days: status.views.length,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncTrafficViews.of({ sync, stream })
    })
  )
}
