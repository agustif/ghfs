/**
 * Stream.paginate sync for repository git tags → tags/tags.json
 *
 * Copy to: src-effect/services/sync-tags.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchTags — see sync-tags.md / snippet.
 * MirrorFs has no writeTags yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/tags?page=&per_page=
 *
 * Cue: src/sync/sync-repository-kitchen-sink.ts writeKitchenSinkData →
 * kitchen-sink/tags.json via provider.fetchRepositoryTags.
 * This slice: lean JSON array under tags/ (sibling participation/).
 * Kitchen-sink README / enabledFeatures markdown OOS.
 *
 * Paginated list — Stream.paginate (mirrors sync-releases). Distinct from
 * SyncReleases. Pattern mirrors landed sync-participation (tip fa9e44f / #249)
 * kitchen-sink peel style for path/docs; pagination mirrors SyncReleases.
 * Do NOT rewrite SyncParticipation / SyncCommitActivity / SyncReleases /
 * SyncSatellites bodies.
 *
 * Remaining kitchen-sink leftovers (git refs, assignee suggestions,
 * vuln reporting, traffic) stay OOS this peel.
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, RepoTag, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean sibling of kitchen-sink cue path under config.directory. */
const TAGS_DIR_NAME = "tags"
const TAGS_FILE_NAME = "tags.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

/** Additive surface expected on GitHubClient (see sync-tags.md). */
type GitHubClientTags = {
  readonly fetchTags: (params?: {
    readonly page?: number
    readonly perPage?: number
  }) => Effect.Effect<Array<RepoTag>, GitHubError>
}

export interface SyncTagsSummary {
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

export class SyncTags extends Context.Service<
  SyncTags,
  {
    readonly sync: () => Effect.Effect<SyncTagsSummary, SyncError>
    readonly stream: () => Stream.Stream<RepoTag, SyncError>
  }
>()("ghfs/services/SyncTags") {
  static readonly layer = Layer.effect(
    SyncTags,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchTags lands (snippet only).
      const github = githubBase as unknown as GitHubClientTags
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<RepoTag, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const tags = yield* mapGitHub(
              github.fetchTags({ page: state.page, perPage: PER_PAGE })
            )

            if (tags.length === 0) {
              return [tags, Option.none()] as const
            }

            const next =
              tags.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [tags, next] as const
          })
        )

      const sync = Effect.fn("SyncTags.sync")(function* (): Effect.fn.Return<
        SyncTagsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing repository tags via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, TAGS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<RepoTag>, (acc, tag) => {
              acc.push(tag)
              return acc
            })
          )

          collected.sort((a, b) => a.name.localeCompare(b.name))

          const filePath = path.join(dir, TAGS_FILE_NAME)
          const encoded = Schema.encodeSync(Schema.Array(RepoTag))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeTags — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeTags(tags) → tags/tags.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Repository tags synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncTags.of({ sync, stream })
    })
  )
}
