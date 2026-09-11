/**
 * Single-fetch sync for raw repo activity events → activity.json
 *
 * Copy to: src-effect/services/sync-activity-events.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * REUSES tip GitHubClient.fetchActivityEvents (landed with SyncActivitySummary) —
 * no new github-client snippet this slice. Call with `{ limit: 100 }` (cue
 * writeActivityEvents(100)). Map ActivityEventInput → RepoActivityEvent
 * (persist payload; summary path strips it via buildActivitySummary).
 *
 * MirrorFs has no writeActivityEvents yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/events?per_page= (via tip client).
 *
 * DISTINCT from SyncActivitySummary (activity-summary/activity-summary.json slim rows).
 * Cue: src/sync/extended-metadata.ts writeActivityEvents → ACTIVITY_EVENTS_FILE_NAME
 * (legacy NDJSON `activity.jsonl`). This peel writes lean JSON **array** at
 * `activity.json` (same as commit-comments peel).
 *
 * Single-fetch list — no Stream.paginate (cue uses fixed limit). Optional
 * Stream.fromIterable for a uniform stream() surface (mirrors sync-commit-comments).
 * Pattern mirrors landed sync-commit-comments / sync-network-summary (tip aa0c344 / #240).
 * Do NOT rewrite SyncActivitySummary.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { ActivityEventInput, GitHubError } from "../domain"
import { FileSystemError, RepoActivityEvent, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean JSON array at mirror root (legacy cue was activity.jsonl NDJSON). */
const ACTIVITY_EVENTS_FILE_NAME = "activity.json"
/** Match cue writeActivityEvents → fetchActivityEvents(100). */
const DEFAULT_LIMIT = 100

/** Tip surface already on GitHubClient (SyncActivitySummary). */
type GitHubClientActivityEvents = {
  readonly fetchActivityEvents: (params?: {
    readonly limit?: number
  }) => Effect.Effect<Array<ActivityEventInput>, GitHubError>
}

export interface SyncActivityEventsSummary {
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

function toRepoActivityEvent(row: ActivityEventInput): RepoActivityEvent {
  return new RepoActivityEvent({
    id: row.id,
    type: row.type,
    actor: row.actor,
    createdAt: row.createdAt,
    payload: row.payload ?? {}
  })
}

export class SyncActivityEvents extends Context.Service<
  SyncActivityEvents,
  {
    readonly sync: () => Effect.Effect<SyncActivityEventsSummary, SyncError>
    readonly stream: () => Stream.Stream<RepoActivityEvent, SyncError>
  }
>()("ghfs/services/SyncActivityEvents") {
  static readonly layer = Layer.effect(
    SyncActivityEvents,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      const github = githubBase as unknown as GitHubClientActivityEvents
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchEvents = (): Effect.Effect<Array<RepoActivityEvent>, SyncError> =>
        Effect.gen(function* () {
          const rows = yield* mapGitHub(
            github.fetchActivityEvents({ limit: DEFAULT_LIMIT })
          )
          return rows.map(toRepoActivityEvent)
        })

      const stream = (): Stream.Stream<RepoActivityEvent, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const events = yield* fetchEvents()
            return Stream.fromIterable(events)
          })
        )

      const sync = Effect.fn("SyncActivityEvents.sync")(function* (): Effect.fn.Return<
        SyncActivityEventsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing raw repo activity events via single-fetch (limit 100)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const events = yield* fetchEvents()
          // Stable order: createdAt desc (newest first), then id
          const sorted = [...events].sort((a, b) => {
            const byTime = b.createdAt.localeCompare(a.createdAt)
            return byTime !== 0 ? byTime : a.id.localeCompare(b.id)
          })

          const filePath = path.join(config.directory, ACTIVITY_EVENTS_FILE_NAME)
          // Schema-first lean array (NDJSON / summary wrapper OOS)
          const encoded = Schema.encodeSync(Schema.Array(RepoActivityEvent))(sorted)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeActivityEvents — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeActivityEvents(rows) → activity.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Raw repo activity events synced", {
            synced: sorted.length,
            path: filePath
          })

          return { synced: sorted.length, path: filePath }
        })
      })

      return SyncActivityEvents.of({ sync, stream })
    })
  )
}
