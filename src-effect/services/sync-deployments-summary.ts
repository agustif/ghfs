/**
 * Single-resource sync for GitHub deployments summary →
 * deployments-summary/deployments-summary.json
 *
 * Copy to: src-effect/services/sync-deployments-summary.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchDeployments — see sync-deployments-summary.md / snippet.
 * MirrorFs has no writeDeploymentsSummary yet → writes via FileSystem under config.directory.
 *
 * Schema models first; MirrorFs markdown from legacy extended-metadata-ergonomics
 * deployments/summary.md is OUT OF SCOPE (JSON snapshot only this slice).
 *
 * Single-fetch style (match cue src/sync/deployments-summary.ts + provider
 * listDeployments per_page: 100):
 *   fetchDeployments() → buildDeploymentsSummary (aggregate by environment) → write JSON.
 * No Stream.paginate (cue/provider use one list page, not full history pagination).
 * Optional Stream.succeed for a uniform stream() surface (mirrors sync-activity-summary /
 * sync-security-summary / sync-interaction-limits).
 *
 * Pattern mirrors landed sync-activity-summary Context.Service + Layer + FileSystem
 * snapshot (tip 74c178f / #221 SyncActivitySummary).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { DeploymentInput, GitHubError } from "../domain"
import {
  buildDeploymentsSummary,
  DeploymentsSummary,
  FileSystemError,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const DEPLOYMENTS_SUMMARY_DIR_NAME = "deployments-summary"
const DEPLOYMENTS_SUMMARY_FILE_NAME = "deployments-summary.json"

/** Additive surface expected on GitHubClient (see sync-deployments-summary.md). */
type GitHubClientDeploymentsSummary = {
  readonly fetchDeployments: (params?: {
    readonly perPage?: number
  }) => Effect.Effect<Array<DeploymentInput>, GitHubError>
}

export interface SyncDeploymentsSummarySummary {
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

/** Cue catches fetch failure → null / skip; keep summary resilient with empty list. */
function emptyOnFailure(
  effect: Effect.Effect<Array<DeploymentInput>, SyncError>
): Effect.Effect<Array<DeploymentInput>, never> {
  return effect.pipe(
    Effect.catchAll(() => Effect.succeed([] as Array<DeploymentInput>))
  )
}

export class SyncDeploymentsSummary extends Context.Service<
  SyncDeploymentsSummary,
  {
    readonly sync: () => Effect.Effect<SyncDeploymentsSummarySummary, SyncError>
    readonly stream: () => Stream.Stream<DeploymentsSummary, SyncError>
  }
>()("ghfs/services/SyncDeploymentsSummary") {
  static readonly layer = Layer.effect(
    SyncDeploymentsSummary,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchDeployments lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientDeploymentsSummary
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchSnapshot = (): Effect.Effect<DeploymentsSummary, SyncError> =>
        Effect.gen(function* () {
          const deployments = yield* emptyOnFailure(
            mapGitHub(github.fetchDeployments({ perPage: 100 }))
          )
          const now = yield* DateTime.now
          return buildDeploymentsSummary({
            deployments,
            syncedAt: DateTime.formatIso(now)
          })
        })

      const stream = (): Stream.Stream<DeploymentsSummary, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const summary = yield* fetchSnapshot()
            return Stream.succeed(summary)
          })
        )

      const sync = Effect.fn("SyncDeploymentsSummary.sync")(function* (): Effect.fn.Return<
        SyncDeploymentsSummarySummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing deployments summary via single listDeployments page (per_page 100) then aggregate by environment"
          )
          yield* mapFs(mirror.ensureDirectory())

          const summaryDir = path.join(
            config.directory,
            DEPLOYMENTS_SUMMARY_DIR_NAME
          )
          yield* mapFs(
            fs
              .makeDirectory(summaryDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(summaryDir)))
          )

          const summary = yield* fetchSnapshot()

          const filePath = path.join(summaryDir, DEPLOYMENTS_SUMMARY_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; no full history dump)
          const encoded = Schema.encodeSync(DeploymentsSummary)(summary)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeDeploymentsSummary — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeDeploymentsSummary(summary) → deployments-summary/deployments-summary.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Deployments summary synced", {
            synced: 1,
            environments: Object.keys(summary.environments).length,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncDeploymentsSummary.of({ sync, stream })
    })
  )
}
