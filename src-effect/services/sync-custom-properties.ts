/**
 * Single-fetch sync for repository custom property values →
 * custom-properties/custom-properties.json
 *
 * Copy to: src-effect/services/sync-custom-properties.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchCustomProperties — see sync-custom-properties.md / snippet.
 * MirrorFs has no writeCustomProperties yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/properties/values (single fetch — no page/per_page).
 *
 * Cue: src/sync/sync-repository-kitchen-sink.ts writeKitchenSinkData →
 * kitchen-sink/custom-properties.json via provider.fetchCustomProperties.
 * This slice: lean JSON array under custom-properties/ (sibling autolinks/).
 * Kitchen-sink README / enabledFeatures markdown OOS.
 *
 * Single-fetch list — no Stream.paginate. Optional Stream.fromIterable
 * (mirrors sync-autolinks / sync-issue-fields). Pattern mirrors landed
 * sync-autolinks (tip 4f7d514 / #246). Do NOT rewrite SyncIssueFields /
 * SyncIssueTypes / SyncAutolinks / SyncSatellites bodies.
 *
 * Other kitchen-sink leftovers (commit activity, participation, tags, git refs,
 * assignee suggestions, vuln reporting, traffic) stay OOS this peel.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { CustomPropertyValue, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean sibling of kitchen-sink cue path under config.directory. */
const CUSTOM_PROPERTIES_DIR_NAME = "custom-properties"
const CUSTOM_PROPERTIES_FILE_NAME = "custom-properties.json"

/** Additive surface expected on GitHubClient (see sync-custom-properties.md). */
type GitHubClientCustomProperties = {
  readonly fetchCustomProperties: () => Effect.Effect<
    Array<CustomPropertyValue>,
    GitHubError
  >
}

export interface SyncCustomPropertiesSummary {
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

function compareCustomProperties(
  a: CustomPropertyValue,
  b: CustomPropertyValue
): number {
  return a.propertyName.localeCompare(b.propertyName)
}

export class SyncCustomProperties extends Context.Service<
  SyncCustomProperties,
  {
    readonly sync: () => Effect.Effect<SyncCustomPropertiesSummary, SyncError>
    readonly stream: () => Stream.Stream<CustomPropertyValue, SyncError>
  }
>()("ghfs/services/SyncCustomProperties") {
  static readonly layer = Layer.effect(
    SyncCustomProperties,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchCustomProperties lands (snippet only).
      const github = githubBase as unknown as GitHubClientCustomProperties
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchAll = (): Effect.Effect<
        Array<CustomPropertyValue>,
        SyncError
      > => mapGitHub(github.fetchCustomProperties())

      const stream = (): Stream.Stream<CustomPropertyValue, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const rows = yield* fetchAll()
            return Stream.fromIterable(rows)
          })
        )

      const sync = Effect.fn("SyncCustomProperties.sync")(function* (): Effect.fn.Return<
        SyncCustomPropertiesSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing repository custom properties via single-fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, CUSTOM_PROPERTIES_DIR_NAME)
          const filePath = path.join(dir, CUSTOM_PROPERTIES_FILE_NAME)

          const collected = yield* fetchAll()
          collected.sort(compareCustomProperties)

          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const encoded = Schema.encodeSync(Schema.Array(CustomPropertyValue))(
            collected
          )
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeCustomProperties — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeCustomProperties(rows) → custom-properties/custom-properties.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Repository custom properties synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncCustomProperties.of({ sync, stream })
    })
  )
}
