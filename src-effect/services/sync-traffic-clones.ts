/**
 * Single-resource sync for traffic clones → traffic/clones.json
 *
 * Copy to: src-effect/services/sync-traffic-clones.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchTrafficClones — see sync-traffic-clones.md / snippet.
 * MirrorFs has no writeTrafficClones yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/traffic/clones (single fetch — not paginated).
 * 403/404 → { count: 0, uniques: 0, clones: [] } in client.
 *
 * Cue: src/sync/sync-repository-kitchen-sink.ts → kitchen-sink/traffic-clones.json
 * via provider.fetchTrafficClones. This slice: lean JSON **object** at
 * traffic/clones.json (not kitchen-sink/).
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed
 * (mirrors sync-traffic-views). Always write.
 * Distinct from SyncTrafficViews (clones[] vs views[]). Pattern mirrors landed
 * sync-traffic-views (tip cd225ca / #256).
 * Do NOT rewrite SyncTrafficViews / SyncTrafficPaths / SyncTrafficReferrers /
 * SyncSatellites bodies.
 *
 * LAST kitchen-sink leftover peel — do not re-drop views/paths/referrers.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, TrafficClones } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean sibling of kitchen-sink cue path under config.directory. */
const TRAFFIC_DIR_NAME = "traffic"
const CLONES_FILE_NAME = "clones.json"

/** Additive surface expected on GitHubClient (see sync-traffic-clones.md). */
type GitHubClientTrafficClones = {
  readonly fetchTrafficClones: () => Effect.Effect<TrafficClones, GitHubError>
}

export interface SyncTrafficClonesSummary {
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

export class SyncTrafficClones extends Context.Service<
  SyncTrafficClones,
  {
    readonly sync: () => Effect.Effect<SyncTrafficClonesSummary, SyncError>
    readonly stream: () => Stream.Stream<TrafficClones, SyncError>
  }
>()("ghfs/services/SyncTrafficClones") {
  static readonly layer = Layer.effect(
    SyncTrafficClones,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchTrafficClones lands (snippet only).
      const github = githubBase as unknown as GitHubClientTrafficClones
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchOne = (): Effect.Effect<TrafficClones, SyncError> =>
        mapGitHub(github.fetchTrafficClones())

      const stream = (): Stream.Stream<TrafficClones, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const row = yield* fetchOne()
            return Stream.succeed(row)
          })
        )

      const sync = Effect.fn("SyncTrafficClones.sync")(function* (): Effect.fn.Return<
        SyncTrafficClonesSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing traffic clones via single-resource fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, TRAFFIC_DIR_NAME)
          const filePath = path.join(dir, CLONES_FILE_NAME)

          const status = yield* fetchOne()

          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const encoded = Schema.encodeSync(TrafficClones)(status)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeTrafficClones — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeTrafficClones(status) → traffic/clones.json
          // Always write lean object (including empty clones series).
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Traffic clones synced", {
            synced: 1,
            count: status.count,
            days: status.clones.length,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncTrafficClones.of({ sync, stream })
    })
  )
}
