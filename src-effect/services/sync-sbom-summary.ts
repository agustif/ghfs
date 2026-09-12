/**
 * Single-resource sync for SBOM summary → security/sbom-summary.json
 *
 * Copy to: src-effect/services/sync-sbom-summary.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchSbomSummary — see sync-sbom-summary.md / snippet.
 * MirrorFs has no writeSbomSummary yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/dependency-graph/sbom (single fetch — not paginated).
 * Map sbom.name / sbom.spdxVersion / sbom.packages.length → SbomSummary.
 * 403/404 → { name: null, spdxVersion: null, packageCount: 0 } in client.
 *
 * Cue: src/sync/write-dependency-intelligence.ts → security/sbom.json (full SPDX).
 * This slice: lean JSON **object** at security/sbom-summary.json (no packages dump).
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed
 * (mirrors sync-traffic-clones / sync-vulnerability-reporting). Always write.
 * Distinct from SyncSecuritySummary. Pattern mirrors landed sync-traffic-clones
 * (tip 671bcc6 / #257). Do NOT rewrite SyncTrafficClones / SyncSecuritySummary /
 * SyncSatellites bodies.
 *
 * Attestations / dep-graph / dep-reviews / full Dependabot alerts stay OOS.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SbomSummary, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue security/ dir under config.directory; lean summary filename. */
const SECURITY_DIR_NAME = "security"
const SBOM_SUMMARY_FILE_NAME = "sbom-summary.json"

/** Additive surface expected on GitHubClient (see sync-sbom-summary.md). */
type GitHubClientSbomSummary = {
  readonly fetchSbomSummary: () => Effect.Effect<SbomSummary, GitHubError>
}

export interface SyncSbomSummarySummary {
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

export class SyncSbomSummary extends Context.Service<
  SyncSbomSummary,
  {
    readonly sync: () => Effect.Effect<SyncSbomSummarySummary, SyncError>
    readonly stream: () => Stream.Stream<SbomSummary, SyncError>
  }
>()("ghfs/services/SyncSbomSummary") {
  static readonly layer = Layer.effect(
    SyncSbomSummary,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchSbomSummary lands (snippet only).
      const github = githubBase as unknown as GitHubClientSbomSummary
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchOne = (): Effect.Effect<SbomSummary, SyncError> =>
        mapGitHub(github.fetchSbomSummary())

      const stream = (): Stream.Stream<SbomSummary, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const row = yield* fetchOne()
            return Stream.succeed(row)
          })
        )

      const sync = Effect.fn("SyncSbomSummary.sync")(function* (): Effect.fn.Return<
        SyncSbomSummarySummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing SBOM summary via single-resource fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, SECURITY_DIR_NAME)
          const filePath = path.join(dir, SBOM_SUMMARY_FILE_NAME)

          const summary = yield* fetchOne()

          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const encoded = Schema.encodeSync(SbomSummary)(summary)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeSbomSummary — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeSbomSummary(summary) → security/sbom-summary.json
          // Always write lean object (including empty / unavailable shape).
          // Full SPDX packages dump OOS (legacy security/sbom.json).
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("SBOM summary synced", {
            synced: 1,
            packageCount: summary.packageCount,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncSbomSummary.of({ sync, stream })
    })
  )
}
