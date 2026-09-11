/**
 * Single-fetch sync for weekly commit activity →
 * commit-activity/commit-activity.json
 *
 * Copy to: src-effect/services/sync-commit-activity.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchCommitActivity — see sync-commit-activity.md / snippet.
 * MirrorFs has no writeCommitActivity yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/stats/commit_activity (single fetch — no page/per_page).
 * GitHub may return 202 while stats compute → client maps to [].
 *
 * Cue: src/sync/sync-repository-kitchen-sink.ts writeKitchenSinkData →
 * kitchen-sink/commit-activity.json via provider.fetchCommitActivity.
 * This slice: lean JSON array under commit-activity/ (sibling custom-properties/).
 * Kitchen-sink README / enabledFeatures markdown OOS.
 *
 * Single-fetch list — no Stream.paginate. Optional Stream.fromIterable
 * (mirrors sync-custom-properties). Pattern mirrors landed sync-custom-properties
 * (tip e817e7c / #247). Do NOT rewrite SyncCustomProperties / SyncAutolinks /
 * SyncSatellites bodies.
 *
 * Remaining kitchen-sink leftovers (participation, tags, git refs, assignee
 * suggestions, vuln reporting, traffic) stay OOS this peel.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { CommitActivity, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean sibling of kitchen-sink cue path under config.directory. */
const COMMIT_ACTIVITY_DIR_NAME = "commit-activity"
const COMMIT_ACTIVITY_FILE_NAME = "commit-activity.json"

/** Additive surface expected on GitHubClient (see sync-commit-activity.md). */
type GitHubClientCommitActivity = {
  readonly fetchCommitActivity: () => Effect.Effect<
    Array<CommitActivity>,
    GitHubError
  >
}

export interface SyncCommitActivitySummary {
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

function compareCommitActivity(a: CommitActivity, b: CommitActivity): number {
  return a.week - b.week
}

export class SyncCommitActivity extends Context.Service<
  SyncCommitActivity,
  {
    readonly sync: () => Effect.Effect<SyncCommitActivitySummary, SyncError>
    readonly stream: () => Stream.Stream<CommitActivity, SyncError>
  }
>()("ghfs/services/SyncCommitActivity") {
  static readonly layer = Layer.effect(
    SyncCommitActivity,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchCommitActivity lands (snippet only).
      const github = githubBase as unknown as GitHubClientCommitActivity
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchAll = (): Effect.Effect<Array<CommitActivity>, SyncError> =>
        mapGitHub(github.fetchCommitActivity())

      const stream = (): Stream.Stream<CommitActivity, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const rows = yield* fetchAll()
            return Stream.fromIterable(rows)
          })
        )

      const sync = Effect.fn("SyncCommitActivity.sync")(function* (): Effect.fn.Return<
        SyncCommitActivitySummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing repository commit activity via single-fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, COMMIT_ACTIVITY_DIR_NAME)
          const filePath = path.join(dir, COMMIT_ACTIVITY_FILE_NAME)

          const collected = yield* fetchAll()
          collected.sort(compareCommitActivity)

          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const encoded = Schema.encodeSync(Schema.Array(CommitActivity))(
            collected
          )
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeCommitActivity — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeCommitActivity(rows) → commit-activity/commit-activity.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Repository commit activity synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncCommitActivity.of({ sync, stream })
    })
  )
}
