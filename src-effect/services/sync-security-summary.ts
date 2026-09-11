/**
 * Single-resource sync for GitHub security summary →
 * security-summary/security-summary.json
 *
 * Copy to: src-effect/services/sync-security-summary.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchDependabotAlerts /
 * fetchCodeScanningAlerts / fetchSecretScanningAlerts — see sync-security-summary.md / snippet.
 * MirrorFs has no writeSecuritySummary yet → writes via FileSystem under config.directory.
 *
 * Schema models first; MirrorFs markdown from legacy sync-security /
 * security/summary.md is OUT OF SCOPE (JSON snapshot only this slice).
 *
 * Single-fetch style (match cue src/sync/security-summary.ts):
 *   Effect.all of three alert lists with { limit: 100 } → buildSecuritySummary → write JSON.
 * No Stream.paginate (cue uses limit, not full pagination). Optional Stream.succeed
 * for a uniform stream() surface (mirrors sync-interaction-limits / sync-metadata).
 *
 * Pattern mirrors landed sync-metadata / sync-interaction-limits Context.Service +
 * Layer + FileSystem snapshot (tip 9b722cc / #219 SyncItemAttachments).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import {
  buildSecuritySummary,
  CodeScanningAlertLean,
  DependabotAlertLean,
  FileSystemError,
  SecretScanningAlertLean,
  SecuritySummary,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const SECURITY_SUMMARY_DIR_NAME = "security-summary"
const SECURITY_SUMMARY_FILE_NAME = "security-summary.json"
const DEFAULT_ALERT_LIMIT = 100

/** Additive surface expected on GitHubClient (see sync-security-summary.md). */
type GitHubClientSecuritySummary = {
  readonly fetchDependabotAlerts: (params?: {
    readonly limit?: number
  }) => Effect.Effect<Array<DependabotAlertLean>, GitHubError>
  readonly fetchCodeScanningAlerts: (params?: {
    readonly limit?: number
  }) => Effect.Effect<Array<CodeScanningAlertLean>, GitHubError>
  readonly fetchSecretScanningAlerts: (params?: {
    readonly limit?: number
  }) => Effect.Effect<Array<SecretScanningAlertLean>, GitHubError>
}

export interface SyncSecuritySummarySummary {
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

/** Cue catches per-list failures → []; keep summary resilient when one API is disabled. */
function emptyOnFailure<A>(
  effect: Effect.Effect<Array<A>, SyncError>
): Effect.Effect<Array<A>, never> {
  return effect.pipe(Effect.catchAll(() => Effect.succeed([] as Array<A>)))
}

export class SyncSecuritySummary extends Context.Service<
  SyncSecuritySummary,
  {
    readonly sync: () => Effect.Effect<SyncSecuritySummarySummary, SyncError>
    readonly stream: () => Stream.Stream<SecuritySummary, SyncError>
  }
>()("ghfs/services/SyncSecuritySummary") {
  static readonly layer = Layer.effect(
    SyncSecuritySummary,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetch*Alerts land on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientSecuritySummary
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchSnapshot = (): Effect.Effect<SecuritySummary, SyncError> =>
        Effect.gen(function* () {
          const limit = DEFAULT_ALERT_LIMIT
          const [dependabotAlerts, codeScanningAlerts, secretScanningAlerts] =
            yield* Effect.all(
              [
                emptyOnFailure(
                  mapGitHub(github.fetchDependabotAlerts({ limit }))
                ),
                emptyOnFailure(
                  mapGitHub(github.fetchCodeScanningAlerts({ limit }))
                ),
                emptyOnFailure(
                  mapGitHub(github.fetchSecretScanningAlerts({ limit }))
                )
              ],
              { concurrency: "unbounded" }
            )

          const now = yield* DateTime.now
          return buildSecuritySummary({
            dependabotAlerts,
            codeScanningAlerts,
            secretScanningAlerts,
            syncedAt: DateTime.formatIso(now)
          })
        })

      const stream = (): Stream.Stream<SecuritySummary, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const summary = yield* fetchSnapshot()
            return Stream.succeed(summary)
          })
        )

      const sync = Effect.fn("SyncSecuritySummary.sync")(function* (): Effect.fn.Return<
        SyncSecuritySummarySummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing security summary via three limited alert fetches (limit 100)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const summaryDir = path.join(config.directory, SECURITY_SUMMARY_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(summaryDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(summaryDir)))
          )

          const summary = yield* fetchSnapshot()

          const filePath = path.join(summaryDir, SECURITY_SUMMARY_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; no full alert dumps)
          const encoded = Schema.encodeSync(SecuritySummary)(summary)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeSecuritySummary — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeSecuritySummary(summary) → security-summary/security-summary.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Security summary synced", {
            synced: 1,
            dependabotOpen: summary.dependabot.open,
            codeScanningOpen: summary.codeScanning.open,
            secretScanningOpen: summary.secretScanning.open,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncSecuritySummary.of({ sync, stream })
    })
  )
}
