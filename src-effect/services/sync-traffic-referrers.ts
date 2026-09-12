/**
 * Single-fetch sync for popular traffic referrers → traffic/referrers.json
 *
 * Copy to: src-effect/services/sync-traffic-referrers.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchTrafficReferrers — see sync-traffic-referrers.md / snippet.
 * MirrorFs has no writeTrafficReferrers yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/traffic/popular/referrers (single fetch — not paginated;
 * GitHub returns the top list).
 *
 * Cue: src/sync/sync-repository-kitchen-sink.ts → kitchen-sink/traffic-referrers.json
 * via provider.fetchTrafficReferrers. This slice: lean JSON **array** at
 * traffic/referrers.json (not kitchen-sink/).
 *
 * Single-fetch list — no Stream.paginate. Optional Stream.fromIterable
 * (mirrors sync-commit-activity). Always write, including empty [].
 * Distinct from SyncNetworkSummary. Pattern mirrors landed
 * sync-vulnerability-reporting (tip ea49cf0 / #253) kitchen-sink peel docs.
 * Do NOT rewrite SyncVulnerabilityReporting / SyncNetworkSummary / SyncSatellites.
 *
 * Paths / views / clones stay OOS this peel.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, TrafficReferrer } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean sibling of kitchen-sink cue path under config.directory. */
const TRAFFIC_DIR_NAME = "traffic"
const REFERRERS_FILE_NAME = "referrers.json"

/** Additive surface expected on GitHubClient (see sync-traffic-referrers.md). */
type GitHubClientTrafficReferrers = {
  readonly fetchTrafficReferrers: () => Effect.Effect<
    Array<TrafficReferrer>,
    GitHubError
  >
}

export interface SyncTrafficReferrersSummary {
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

function compareTrafficReferrers(a: TrafficReferrer, b: TrafficReferrer): number {
  const byCount = b.count - a.count
  return byCount !== 0 ? byCount : a.referrer.localeCompare(b.referrer)
}

export class SyncTrafficReferrers extends Context.Service<
  SyncTrafficReferrers,
  {
    readonly sync: () => Effect.Effect<SyncTrafficReferrersSummary, SyncError>
    readonly stream: () => Stream.Stream<TrafficReferrer, SyncError>
  }
>()("ghfs/services/SyncTrafficReferrers") {
  static readonly layer = Layer.effect(
    SyncTrafficReferrers,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchTrafficReferrers lands (snippet only).
      const github = githubBase as unknown as GitHubClientTrafficReferrers
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchAll = (): Effect.Effect<Array<TrafficReferrer>, SyncError> =>
        mapGitHub(github.fetchTrafficReferrers())

      const stream = (): Stream.Stream<TrafficReferrer, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const rows = yield* fetchAll()
            return Stream.fromIterable(rows)
          })
        )

      const sync = Effect.fn("SyncTrafficReferrers.sync")(function* (): Effect.fn.Return<
        SyncTrafficReferrersSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing traffic referrers via single-fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, TRAFFIC_DIR_NAME)
          const filePath = path.join(dir, REFERRERS_FILE_NAME)

          const collected = yield* fetchAll()
          collected.sort(compareTrafficReferrers)

          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const encoded = Schema.encodeSync(Schema.Array(TrafficReferrer))(
            collected
          )
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeTrafficReferrers — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeTrafficReferrers(rows) → traffic/referrers.json
          // Always write, including empty [].
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Traffic referrers synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncTrafficReferrers.of({ sync, stream })
    })
  )
}
