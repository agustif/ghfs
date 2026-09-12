/**
 * Single-fetch sync for popular traffic paths → traffic/paths.json
 *
 * Copy to: src-effect/services/sync-traffic-paths.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchTrafficPaths — see sync-traffic-paths.md / snippet.
 * MirrorFs has no writeTrafficPaths yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/traffic/popular/paths (single fetch — not paginated;
 * GitHub returns the top list).
 *
 * Cue: src/sync/sync-repository-kitchen-sink.ts → kitchen-sink/traffic-paths.json
 * via provider.fetchTrafficPaths. This slice: lean JSON **array** at
 * traffic/paths.json (not kitchen-sink/).
 *
 * Single-fetch list — no Stream.paginate. Optional Stream.fromIterable
 * (mirrors sync-traffic-referrers). Always write, including empty [].
 * Distinct from SyncTrafficReferrers. Pattern mirrors landed
 * sync-traffic-referrers (tip 6c079bc / #254).
 * Do NOT rewrite SyncTrafficReferrers / SyncNetworkSummary / SyncSatellites.
 *
 * Views / clones stay OOS this peel.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, TrafficPath } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean sibling of kitchen-sink cue path under config.directory. */
const TRAFFIC_DIR_NAME = "traffic"
const PATHS_FILE_NAME = "paths.json"

/** Additive surface expected on GitHubClient (see sync-traffic-paths.md). */
type GitHubClientTrafficPaths = {
  readonly fetchTrafficPaths: () => Effect.Effect<
    Array<TrafficPath>,
    GitHubError
  >
}

export interface SyncTrafficPathsSummary {
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

function compareTrafficPaths(a: TrafficPath, b: TrafficPath): number {
  const byCount = b.count - a.count
  return byCount !== 0 ? byCount : a.path.localeCompare(b.path)
}

export class SyncTrafficPaths extends Context.Service<
  SyncTrafficPaths,
  {
    readonly sync: () => Effect.Effect<SyncTrafficPathsSummary, SyncError>
    readonly stream: () => Stream.Stream<TrafficPath, SyncError>
  }
>()("ghfs/services/SyncTrafficPaths") {
  static readonly layer = Layer.effect(
    SyncTrafficPaths,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchTrafficPaths lands (snippet only).
      const github = githubBase as unknown as GitHubClientTrafficPaths
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchAll = (): Effect.Effect<Array<TrafficPath>, SyncError> =>
        mapGitHub(github.fetchTrafficPaths())

      const stream = (): Stream.Stream<TrafficPath, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const rows = yield* fetchAll()
            return Stream.fromIterable(rows)
          })
        )

      const sync = Effect.fn("SyncTrafficPaths.sync")(function* (): Effect.fn.Return<
        SyncTrafficPathsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing traffic paths via single-fetch")
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, TRAFFIC_DIR_NAME)
          const filePath = path.join(dir, PATHS_FILE_NAME)

          const collected = yield* fetchAll()
          collected.sort(compareTrafficPaths)

          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const encoded = Schema.encodeSync(Schema.Array(TrafficPath))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeTrafficPaths — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeTrafficPaths(rows) → traffic/paths.json
          // Always write, including empty [].
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Traffic paths synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncTrafficPaths.of({ sync, stream })
    })
  )
}
