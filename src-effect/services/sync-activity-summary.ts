/**
 * Single-resource sync for GitHub repo activity summary →
 * activity-summary/activity-summary.json
 *
 * Copy to: src-effect/services/sync-activity-summary.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchActivityEvents — see sync-activity-summary.md / snippet.
 * MirrorFs has no writeActivitySummary yet → writes via FileSystem under config.directory.
 *
 * Schema models first; MirrorFs markdown from legacy extended-metadata-ergonomics
 * activity.md is OUT OF SCOPE (JSON snapshot only this slice).
 *
 * Single-fetch style (match cue src/sync/activity-summary.ts):
 *   fetchActivityEvents({ limit: 50 }) → buildActivitySummary → write JSON.
 * No Stream.paginate (cue uses limit / single listRepoEvents page, not full pagination).
 * Optional Stream.succeed for a uniform stream() surface (mirrors sync-security-summary /
 * sync-interaction-limits / sync-metadata).
 *
 * Pattern mirrors landed sync-security-summary Context.Service + Layer + FileSystem
 * snapshot (tip eed6117 / #220 SyncSecuritySummary).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { ActivityEventInput, GitHubError } from "../domain"
import {
  ActivitySummary,
  buildActivitySummary,
  FileSystemError,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const ACTIVITY_SUMMARY_DIR_NAME = "activity-summary"
const ACTIVITY_SUMMARY_FILE_NAME = "activity-summary.json"
/** Match cue buildActivitySummary(context, 50) default. */
const DEFAULT_EVENT_LIMIT = 50

/** Additive surface expected on GitHubClient (see sync-activity-summary.md). */
type GitHubClientActivitySummary = {
  readonly fetchActivityEvents: (params?: {
    readonly limit?: number
  }) => Effect.Effect<Array<ActivityEventInput>, GitHubError>
}

export interface SyncActivitySummarySummary {
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

/** Cue catches fetch failure → null / skip; keep summary resilient with empty events. */
function emptyOnFailure(
  effect: Effect.Effect<Array<ActivityEventInput>, SyncError>
): Effect.Effect<Array<ActivityEventInput>, never> {
  return effect.pipe(
    Effect.catchAll(() => Effect.succeed([] as Array<ActivityEventInput>))
  )
}

export class SyncActivitySummary extends Context.Service<
  SyncActivitySummary,
  {
    readonly sync: () => Effect.Effect<SyncActivitySummarySummary, SyncError>
    readonly stream: () => Stream.Stream<ActivitySummary, SyncError>
  }
>()("ghfs/services/SyncActivitySummary") {
  static readonly layer = Layer.effect(
    SyncActivitySummary,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchActivityEvents lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientActivitySummary
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchSnapshot = (): Effect.Effect<ActivitySummary, SyncError> =>
        Effect.gen(function* () {
          const events = yield* emptyOnFailure(
            mapGitHub(
              github.fetchActivityEvents({ limit: DEFAULT_EVENT_LIMIT })
            )
          )
          const now = yield* DateTime.now
          return buildActivitySummary({
            events,
            syncedAt: DateTime.formatIso(now)
          })
        })

      const stream = (): Stream.Stream<ActivitySummary, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const summary = yield* fetchSnapshot()
            return Stream.succeed(summary)
          })
        )

      const sync = Effect.fn("SyncActivitySummary.sync")(function* (): Effect.fn.Return<
        SyncActivitySummarySummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing activity summary via single limited events fetch (limit 50)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const summaryDir = path.join(config.directory, ACTIVITY_SUMMARY_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(summaryDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(summaryDir)))
          )

          const summary = yield* fetchSnapshot()

          const filePath = path.join(summaryDir, ACTIVITY_SUMMARY_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; no payload dumps)
          const encoded = Schema.encodeSync(ActivitySummary)(summary)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeActivitySummary — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeActivitySummary(summary) → activity-summary/activity-summary.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Activity summary synced", {
            synced: 1,
            events: summary.events.length,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncActivitySummary.of({ sync, stream })
    })
  )
}
