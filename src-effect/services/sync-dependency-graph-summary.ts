/**
 * Single-resource sync for dependency-graph summary →
 * security/dependency-graph-summary.json
 *
 * Copy to: src-effect/services/sync-dependency-graph-summary.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchDependencyGraphSummary — see
 * sync-dependency-graph-summary.md / snippet (GraphQL, not REST paginate).
 * MirrorFs has no writeDependencyGraphSummary yet → writes via FileSystem under config.directory.
 * GraphQL: repository.dependencyGraphManifests(first: 100) { totalCount nodes { dependenciesCount } }.
 * Map: manifestCount = totalCount, dependencyCount = sum(dependenciesCount),
 * submissionCount = manifestCount, hasSubmissions = manifestCount > 0,
 * latestSubmissionDate = null. Do not write lastUpdated.
 * 403/404 → zeros / false / null in client.
 *
 * Cue: src/sync/write-dependency-intelligence.ts → security/dependency-graph-summary.json.
 * This slice: lean JSON **object** only.
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed
 * (mirrors sync-sbom-summary / sync-attestations-summary stream surface).
 * Pattern mirrors landed sync-attestations-summary (tip 07f3a74 / #259).
 * Do NOT rewrite SyncAttestationsSummary / SyncSbomSummary / SyncSatellites.
 *
 * Dep-reviews / full Dependabot alerts stay OOS.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { DependencyGraphSummary, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue security/dependency-graph-summary.json under config.directory. */
const SECURITY_DIR_NAME = "security"
const DEPENDENCY_GRAPH_SUMMARY_FILE_NAME = "dependency-graph-summary.json"

/** Additive surface expected on GitHubClient (see sync-dependency-graph-summary.md). */
type GitHubClientDependencyGraphSummary = {
  readonly fetchDependencyGraphSummary: () => Effect.Effect<
    DependencyGraphSummary,
    GitHubError
  >
}

export interface SyncDependencyGraphSummarySummary {
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

export class SyncDependencyGraphSummary extends Context.Service<
  SyncDependencyGraphSummary,
  {
    readonly sync: () => Effect.Effect<
      SyncDependencyGraphSummarySummary,
      SyncError
    >
    readonly stream: () => Stream.Stream<DependencyGraphSummary, SyncError>
  }
>()("ghfs/services/SyncDependencyGraphSummary") {
  static readonly layer = Layer.effect(
    SyncDependencyGraphSummary,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchDependencyGraphSummary lands (snippet only).
      const github = githubBase as unknown as GitHubClientDependencyGraphSummary
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchOne = (): Effect.Effect<DependencyGraphSummary, SyncError> =>
        mapGitHub(github.fetchDependencyGraphSummary())

      const stream = (): Stream.Stream<DependencyGraphSummary, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const row = yield* fetchOne()
            return Stream.succeed(row)
          })
        )

      const sync = Effect.fn("SyncDependencyGraphSummary.sync")(function* (): Effect.fn.Return<
        SyncDependencyGraphSummarySummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing dependency-graph summary via GraphQL single-fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, SECURITY_DIR_NAME)
          const filePath = path.join(dir, DEPENDENCY_GRAPH_SUMMARY_FILE_NAME)

          const summary = yield* fetchOne()

          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const encoded = Schema.encodeSync(DependencyGraphSummary)(summary)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeDependencyGraphSummary — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeDependencyGraphSummary(summary) → security/dependency-graph-summary.json
          // Always write lean object. Do not stamp lastUpdated.
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Dependency-graph summary synced", {
            synced: 1,
            manifestCount: summary.manifestCount,
            dependencyCount: summary.dependencyCount,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncDependencyGraphSummary.of({ sync, stream })
    })
  )
}
