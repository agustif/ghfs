/**
 * Stream.paginate sync for GitHub Pages builds → pages-builds/pages-builds.json
 *
 * Copy to: src-effect/services/sync-pages-builds.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchPagesBuilds — see sync-pages-builds.md / snippet.
 * MirrorFs has no writePagesBuilds yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/pages/builds?page=&per_page=
 *
 * Schema models first; MirrorFs markdown + latest-build-only helpers from legacy
 * sync-pages-builds.ts / actions-snapshot are OUT OF SCOPE (lean builds list only).
 *
 * Pattern mirrors landed sync-collaborators / sync-packages Stream.paginate + FileSystem
 * snapshot (tip 4203b47 / #212 projects-v2; REST page siblings collaborators/packages).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, PagesBuild, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const PAGES_BUILDS_DIR_NAME = "pages-builds"
const PAGES_BUILDS_FILE_NAME = "pages-builds.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

export interface SyncPagesBuildsSummary {
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

function comparePagesBuilds(a: PagesBuild, b: PagesBuild): number {
  return a.url.localeCompare(b.url)
}

export class SyncPagesBuilds extends Context.Service<
  SyncPagesBuilds,
  {
    readonly sync: () => Effect.Effect<SyncPagesBuildsSummary, SyncError>
    readonly stream: () => Stream.Stream<PagesBuild, SyncError>
  }
>()("ghfs/services/SyncPagesBuilds") {
  static readonly layer = Layer.effect(
    SyncPagesBuilds,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<PagesBuild, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const builds = yield* mapGitHub(
              github.fetchPagesBuilds({ page: state.page, perPage: PER_PAGE })
            )

            if (builds.length === 0) {
              return [builds, Option.none()] as const
            }

            const next =
              builds.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [builds, next] as const
          })
        )

      const sync = Effect.fn("SyncPagesBuilds.sync")(function* (): Effect.fn.Return<
        SyncPagesBuildsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing pages builds via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const pagesBuildsDir = path.join(config.directory, PAGES_BUILDS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(pagesBuildsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(pagesBuildsDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<PagesBuild>, (acc, build) => {
              acc.push(build)
              return acc
            })
          )

          collected.sort(comparePagesBuilds)

          const filePath = path.join(pagesBuildsDir, PAGES_BUILDS_FILE_NAME)
          // Schema-first encode (MirrorFs markdown / latest-build OOS)
          const encoded = Schema.encodeSync(Schema.Array(PagesBuild))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writePagesBuilds — FileSystem write under config.directory.
          // Future additive: MirrorFs.writePagesBuilds(builds) → pages-builds/pages-builds.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Pages builds synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncPagesBuilds.of({ sync, stream })
    })
  )
}
