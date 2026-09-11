/**
 * Single-resource sync for local sync status observe summary →
 * status/status.json
 *
 * Copy to: src-effect/services/sync-status.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * NO GitHubClient fetch — MirrorFs.readSyncState() only (document in sync-status.md).
 * MirrorFs has no writeStatus yet → writes via FileSystem under config.directory.
 *
 * Schema models first; MirrorFs markdown OOS (JSON snapshot only this slice).
 *
 * Single-resource local scan (match cue src/sync/status.ts — no list API):
 *   MirrorFs.readSyncState() → best-effort StatusSummaryInput
 *   buildStatusSummary → write JSON
 * No Stream.paginate. Optional Stream.succeed for a uniform stream() surface
 * (mirrors sync-me-summary / sync-deployments-summary).
 *
 * IMPORTANT tip deviation: Effect SyncState is thinner than legacy
 * (no lastSyncRun / executions). Do NOT rewrite SyncState / SyncSatellites /
 * MirrorFs. Best-effort map leaves lastSyncRun / lastExecution undefined and
 * executionRuns = 0 until richer input is available (CLI/tests can feed them
 * into buildStatusSummary directly).
 *
 * Pattern mirrors landed sync-me-summary Context.Service + Layer + FileSystem
 * snapshot (tip 7c8ea36 / #230 latest-pages-build; me-summary local+thin).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { SyncState } from "../domain"
import {
  buildStatusSummary,
  FileSystemError,
  StatusSummary,
  SyncError,
  type StatusSummaryInput
} from "../domain"
import { GhfsConfig } from "./config"
import { MirrorFs } from "./mirror-fs"

const STATUS_DIR_NAME = "status"
const STATUS_FILE_NAME = "status.json"

export interface SyncStatusSummary {
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

/**
 * Best-effort map from tip Effect SyncState → StatusSummaryInput.
 * Tip SyncState has repo / lastSyncedAt / items only — no executions or
 * lastSyncRun. Leave those unset so buildStatusSummary omits them
 * (documented deviation).
 */
function inputFromSyncState(state: SyncState | null): StatusSummaryInput {
  if (!state) {
    return { items: [], executionRuns: 0 }
  }
  return {
    ...(state.repo !== undefined ? { repo: state.repo } : {}),
    ...(state.lastSyncedAt !== undefined
      ? { lastSyncedAt: DateTime.formatIso(state.lastSyncedAt) }
      : {}),
    items: Object.values(state.items).map((item) => ({ state: item.state })),
    executionRuns: 0
  }
}

function nullStateOnFailure(
  effect: Effect.Effect<SyncState | null, SyncError>
): Effect.Effect<SyncState | null, never> {
  return effect.pipe(
    Effect.catchAll(() => Effect.succeed(null as SyncState | null))
  )
}

export class SyncStatus extends Context.Service<
  SyncStatus,
  {
    readonly sync: () => Effect.Effect<SyncStatusSummary, SyncError>
    readonly stream: () => Stream.Stream<StatusSummary, SyncError>
  }
>()("ghfs/services/SyncStatus") {
  static readonly layer = Layer.effect(
    SyncStatus,
    Effect.gen(function* () {
      // Local observe only — no GitHubClient (no GitHub fetch for status).
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchSnapshot = (): Effect.Effect<StatusSummary, SyncError> =>
        Effect.gen(function* () {
          const state = yield* nullStateOnFailure(mapFs(mirror.readSyncState()))
          return buildStatusSummary(inputFromSyncState(state))
        })

      const stream = (): Stream.Stream<StatusSummary, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const summary = yield* fetchSnapshot()
            return Stream.succeed(summary)
          })
        )

      const sync = Effect.fn("SyncStatus.sync")(function* (): Effect.fn.Return<
        SyncStatusSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing status via local SyncState scan (best-effort lean fields; no GitHub fetch)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const statusDir = path.join(config.directory, STATUS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(statusDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(statusDir)))
          )

          const summary = yield* fetchSnapshot()

          const filePath = path.join(statusDir, STATUS_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; write snapshot for observe consistency)
          const encoded = Schema.encodeSync(StatusSummary)(summary)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeStatus — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeStatus(summary) → status/status.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Status summary synced", {
            synced: 1,
            totalTracked: summary.totalTracked,
            openCount: summary.openCount,
            closedCount: summary.closedCount,
            executionRuns: summary.executionRuns,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncStatus.of({ sync, stream })
    })
  )
}
