/**
 * Single-resource sync for repo fork parent/source → fork-status.json
 *
 * Copy to: src-effect/services/sync-fork-status.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchForkStatus — see sync-fork-status.md / snippet.
 * MirrorFs has no writeForkStatus yet → writes via FileSystem under config.directory.
 *
 * Cue: src/sync/extended-metadata.ts writeForkStatus → FORK_STATUS_FILE_NAME
 * (`fork-status.json` at mirror root). Lean object only (no wrapper).
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed for a
 * uniform stream() surface (mirrors sync-template / sync-viewer-status).
 * Pattern mirrors landed sync-template (tip 2bd6652 / #238).
 * Do NOT rewrite SyncMetadata.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, ForkStatus, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue FORK_STATUS_FILE_NAME at mirror root. */
const FORK_STATUS_FILE_NAME = "fork-status.json"

/** Additive surface expected on GitHubClient (see sync-fork-status.md). */
type GitHubClientForkStatus = {
  readonly fetchForkStatus: () => Effect.Effect<ForkStatus, GitHubError>
}

export interface SyncForkStatusSummary {
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

export class SyncForkStatus extends Context.Service<
  SyncForkStatus,
  {
    readonly sync: () => Effect.Effect<SyncForkStatusSummary, SyncError>
    readonly stream: () => Stream.Stream<ForkStatus, SyncError>
  }
>()("ghfs/services/SyncForkStatus") {
  static readonly layer = Layer.effect(
    SyncForkStatus,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchForkStatus lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientForkStatus
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchStatus = (): Effect.Effect<ForkStatus, SyncError> =>
        mapGitHub(github.fetchForkStatus())

      const stream = (): Stream.Stream<ForkStatus, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const status = yield* fetchStatus()
            return Stream.succeed(status)
          })
        )

      const sync = Effect.fn("SyncForkStatus.sync")(function* (): Effect.fn.Return<
        SyncForkStatusSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing fork status via single-resource fetch")
          yield* mapFs(mirror.ensureDirectory())

          const status = yield* fetchStatus()

          const filePath = path.join(config.directory, FORK_STATUS_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; cue root fork-status.json)
          const encoded = Schema.encodeSync(ForkStatus)(status)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeForkStatus — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeForkStatus(status) → fork-status.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Fork status synced", {
            synced: 1,
            isFork: status.isFork,
            parent: status.parent?.fullName ?? null,
            source: status.source?.fullName ?? null,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncForkStatus.of({ sync, stream })
    })
  )
}
