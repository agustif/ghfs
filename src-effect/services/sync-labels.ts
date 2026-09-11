/**
 * Stream.paginate sync for repo labels → labels.json
 *
 * Copy to: src-effect/services/sync-labels.ts
 * Wire: export from services/index (barrels already #196 on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchLabels — see sync-labels.md snippet.
 * MirrorFs has no writeLabels yet → writes via FileSystem under config.directory.
 */
import { Context, Effect, Layer, Option, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError, Label } from "../domain"
import { FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const LABELS_FILE_NAME = "labels.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

/** Additive surface expected on GitHubClient (see sync-labels.md). */
type GitHubClientLabels = {
  readonly fetchLabels: (params?: {
    readonly page?: number
    readonly perPage?: number
  }) => Effect.Effect<Array<Label>, GitHubError>
}

export interface SyncLabelsSummary {
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

export class SyncLabels extends Context.Service<
  SyncLabels,
  {
    readonly sync: () => Effect.Effect<SyncLabelsSummary, SyncError>
    readonly stream: () => Stream.Stream<Label, SyncError>
  }
>()("ghfs/services/SyncLabels") {
  static readonly layer = Layer.effect(
    SyncLabels,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      const github = githubBase as unknown as GitHubClientLabels
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<Label, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const labels = yield* mapGitHub(
              github.fetchLabels({ page: state.page, perPage: PER_PAGE })
            )

            if (labels.length === 0) {
              return [labels, Option.none()] as const
            }

            const next =
              labels.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [labels, next] as const
          })
        )

      const sync = Effect.fn("SyncLabels.sync")(function* (): Effect.fn.Return<
        SyncLabelsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing labels via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<Label>, (acc, label) => {
              acc.push(label)
              return acc
            })
          )

          collected.sort((a, b) => a.name.localeCompare(b.name))

          const filePath = path.join(config.directory, LABELS_FILE_NAME)
          const body = `${JSON.stringify(
            collected.map((label) => ({
              name: label.name,
              color: label.color,
              description: label.description,
              default: label.default
            })),
            null,
            2
          )}\n`

          // NOTE: MirrorFs has no writeLabels — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeLabels(labels) → labels.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Labels synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncLabels.of({ sync, stream })
    })
  )
}
