/**
 * Single-resource sync for commit participation →
 * participation/participation.json
 *
 * Copy to: src-effect/services/sync-participation.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchParticipation — see sync-participation.md / snippet.
 * MirrorFs has no writeParticipation yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/stats/participation (single fetch — no page/per_page).
 * GitHub may return 202 while stats compute → client maps to { all: [], owner: [] }.
 *
 * Cue: src/sync/sync-repository-kitchen-sink.ts writeKitchenSinkData →
 * kitchen-sink/participation-stats.json via provider.fetchParticipationStats.
 * This slice: lean JSON object under participation/ (sibling commit-activity/).
 * Kitchen-sink README / enabledFeatures markdown OOS.
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed
 * (mirrors sync-fork-status / sync-feeds). Pattern mirrors landed
 * sync-commit-activity (tip e5c3c21 / #248). Do NOT rewrite SyncCommitActivity /
 * SyncCustomProperties / SyncSatellites bodies.
 *
 * Remaining kitchen-sink leftovers (tags, git refs, assignee suggestions,
 * vuln reporting, traffic) stay OOS this peel.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, Participation, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean sibling of kitchen-sink cue path under config.directory. */
const PARTICIPATION_DIR_NAME = "participation"
const PARTICIPATION_FILE_NAME = "participation.json"

/** Additive surface expected on GitHubClient (see sync-participation.md). */
type GitHubClientParticipation = {
  readonly fetchParticipation: () => Effect.Effect<Participation, GitHubError>
}

export interface SyncParticipationSummary {
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

export class SyncParticipation extends Context.Service<
  SyncParticipation,
  {
    readonly sync: () => Effect.Effect<SyncParticipationSummary, SyncError>
    readonly stream: () => Stream.Stream<Participation, SyncError>
  }
>()("ghfs/services/SyncParticipation") {
  static readonly layer = Layer.effect(
    SyncParticipation,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchParticipation lands (snippet only).
      const github = githubBase as unknown as GitHubClientParticipation
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchOne = (): Effect.Effect<Participation, SyncError> =>
        mapGitHub(github.fetchParticipation())

      const stream = (): Stream.Stream<Participation, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const row = yield* fetchOne()
            return Stream.succeed(row)
          })
        )

      const sync = Effect.fn("SyncParticipation.sync")(function* (): Effect.fn.Return<
        SyncParticipationSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing repository participation via single-resource fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, PARTICIPATION_DIR_NAME)
          const filePath = path.join(dir, PARTICIPATION_FILE_NAME)

          const stats = yield* fetchOne()

          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const encoded = Schema.encodeSync(Participation)(stats)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeParticipation — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeParticipation(stats) → participation/participation.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          const synced =
            stats.all.length > 0 || stats.owner.length > 0 ? 1 : 0

          yield* Effect.logInfo("Repository participation synced", {
            synced,
            path: filePath,
            allWeeks: stats.all.length,
            ownerWeeks: stats.owner.length
          })

          return { synced, path: filePath }
        })
      })

      return SyncParticipation.of({ sync, stream })
    })
  )
}
