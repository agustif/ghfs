/**
 * Single-resource sync for GitHub interaction limits →
 * interaction-limits/interaction-limits.json
 *
 * Copy to: src-effect/services/sync-interaction-limits.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchInteractionLimits — see sync-interaction-limits.md / snippet.
 * MirrorFs has no writeInteractionLimits yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/interaction-limits
 *
 * Schema models first; MirrorFs markdown from legacy sync-interaction-limits.ts
 * is OUT OF SCOPE (JSON snapshot only this slice).
 *
 * Single-resource fetch — no Stream.paginate (not a list). Optional
 * Stream.succeed for a uniform stream() surface (mirrors sync-codeowners).
 * Pattern mirrors landed sync-codeowners Context.Service + Layer + FileSystem
 * snapshot (tip b36e3db / #215 actions-webhooks landed; codeowners single-fetch).
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import {
  FileSystemError,
  InteractionLimits,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const INTERACTION_LIMITS_DIR_NAME = "interaction-limits"
const INTERACTION_LIMITS_FILE_NAME = "interaction-limits.json"

export interface SyncInteractionLimitsSummary {
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

export class SyncInteractionLimits extends Context.Service<
  SyncInteractionLimits,
  {
    readonly sync: () => Effect.Effect<SyncInteractionLimitsSummary, SyncError>
    readonly stream: () => Stream.Stream<InteractionLimits, SyncError>
  }
>()("ghfs/services/SyncInteractionLimits") {
  static readonly layer = Layer.effect(
    SyncInteractionLimits,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchLimits = (): Effect.Effect<InteractionLimits, SyncError> =>
        mapGitHub(github.fetchInteractionLimits())

      const stream = (): Stream.Stream<InteractionLimits, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const limits = yield* fetchLimits()
            return Stream.succeed(limits)
          })
        )

      const sync = Effect.fn("SyncInteractionLimits.sync")(function* (): Effect.fn.Return<
        SyncInteractionLimitsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing interaction limits via single-resource fetch")
          yield* mapFs(mirror.ensureDirectory())

          const limitsDir = path.join(config.directory, INTERACTION_LIMITS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(limitsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(limitsDir)))
          )

          const limits = yield* fetchLimits()

          const filePath = path.join(limitsDir, INTERACTION_LIMITS_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; no repo/synced_at wrapper)
          const encoded = Schema.encodeSync(InteractionLimits)(limits)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeInteractionLimits — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeInteractionLimits(limits) → interaction-limits/interaction-limits.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Interaction limits synced", {
            synced: 1,
            limit: limits.limit,
            origin: limits.origin,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncInteractionLimits.of({ sync, stream })
    })
  )
}
