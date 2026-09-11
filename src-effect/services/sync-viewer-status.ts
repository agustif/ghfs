/**
 * Single-resource sync for authenticated viewer star/watch status →
 * viewer-status.json
 *
 * Copy to: src-effect/services/sync-viewer-status.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchViewerStatus — see sync-viewer-status.md / snippet.
 * MirrorFs has no writeViewerStatus yet → writes via FileSystem under config.directory.
 *
 * Cue: src/sync/extended-metadata.ts writeViewerStatus → VIEWER_STATUS_FILE_NAME
 * (`viewer-status.json` at mirror root). Lean object only (no wrapper).
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed for a
 * uniform stream() surface (mirrors sync-interaction-limits / sync-codeowners).
 * Pattern mirrors landed sync-interaction-limits (tip dd8c97f / #234).
 *
 * Inventory note: first peel from extended-metadata leftovers
 * (commit-comments / invitations / template / fork-status / network-summary /
 * activity-events / feeds remain for later slices).
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, ViewerStatus } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue VIEWER_STATUS_FILE_NAME at mirror root. */
const VIEWER_STATUS_FILE_NAME = "viewer-status.json"

/** Additive surface expected on GitHubClient (see sync-viewer-status.md). */
type GitHubClientViewerStatus = {
  readonly fetchViewerStatus: () => Effect.Effect<ViewerStatus, GitHubError>
}

export interface SyncViewerStatusSummary {
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

export class SyncViewerStatus extends Context.Service<
  SyncViewerStatus,
  {
    readonly sync: () => Effect.Effect<SyncViewerStatusSummary, SyncError>
    readonly stream: () => Stream.Stream<ViewerStatus, SyncError>
  }
>()("ghfs/services/SyncViewerStatus") {
  static readonly layer = Layer.effect(
    SyncViewerStatus,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchViewerStatus lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientViewerStatus
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchStatus = (): Effect.Effect<ViewerStatus, SyncError> =>
        mapGitHub(github.fetchViewerStatus())

      const stream = (): Stream.Stream<ViewerStatus, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const status = yield* fetchStatus()
            return Stream.succeed(status)
          })
        )

      const sync = Effect.fn("SyncViewerStatus.sync")(function* (): Effect.fn.Return<
        SyncViewerStatusSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing viewer status via single-resource fetch")
          yield* mapFs(mirror.ensureDirectory())

          const status = yield* fetchStatus()

          const filePath = path.join(config.directory, VIEWER_STATUS_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; cue root viewer-status.json)
          const encoded = Schema.encodeSync(ViewerStatus)(status)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeViewerStatus — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeViewerStatus(status) → viewer-status.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Viewer status synced", {
            synced: 1,
            starred: status.starred,
            subscription: status.subscription,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncViewerStatus.of({ sync, stream })
    })
  )
}
