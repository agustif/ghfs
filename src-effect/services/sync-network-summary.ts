/**
 * Single-resource sync for repo network counts → network-summary.json
 *
 * Copy to: src-effect/services/sync-network-summary.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchNetworkSummary — see sync-network-summary.md / snippet.
 * MirrorFs has no writeNetworkSummary yet → writes via FileSystem under config.directory.
 *
 * Cue: src/sync/extended-metadata.ts writeNetworkSummary → NETWORK_SUMMARY_FILE_NAME
 * (`network-summary.json` at mirror root). Lean object only (no wrapper).
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed for a
 * uniform stream() surface (mirrors sync-fork-status / sync-template).
 * Pattern mirrors landed sync-fork-status (tip c51197c / #239).
 * Do NOT rewrite SyncMetadata / SyncForkStatus.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, NetworkSummary, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue NETWORK_SUMMARY_FILE_NAME at mirror root. */
const NETWORK_SUMMARY_FILE_NAME = "network-summary.json"

/** Additive surface expected on GitHubClient (see sync-network-summary.md). */
type GitHubClientNetworkSummary = {
  readonly fetchNetworkSummary: () => Effect.Effect<NetworkSummary, GitHubError>
}

export interface SyncNetworkSummarySummary {
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

export class SyncNetworkSummary extends Context.Service<
  SyncNetworkSummary,
  {
    readonly sync: () => Effect.Effect<SyncNetworkSummarySummary, SyncError>
    readonly stream: () => Stream.Stream<NetworkSummary, SyncError>
  }
>()("ghfs/services/SyncNetworkSummary") {
  static readonly layer = Layer.effect(
    SyncNetworkSummary,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchNetworkSummary lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientNetworkSummary
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchSummary = (): Effect.Effect<NetworkSummary, SyncError> =>
        mapGitHub(github.fetchNetworkSummary())

      const stream = (): Stream.Stream<NetworkSummary, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const summary = yield* fetchSummary()
            return Stream.succeed(summary)
          })
        )

      const sync = Effect.fn("SyncNetworkSummary.sync")(function* (): Effect.fn.Return<
        SyncNetworkSummarySummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing network summary via single-resource fetch")
          yield* mapFs(mirror.ensureDirectory())

          const summary = yield* fetchSummary()

          const filePath = path.join(config.directory, NETWORK_SUMMARY_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; cue root network-summary.json)
          const encoded = Schema.encodeSync(NetworkSummary)(summary)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeNetworkSummary — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeNetworkSummary(summary) → network-summary.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Network summary synced", {
            synced: 1,
            forks: summary.forks,
            subscribers: summary.subscribers,
            watchers: summary.watchers,
            networkCount: summary.networkCount,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncNetworkSummary.of({ sync, stream })
    })
  )
}
