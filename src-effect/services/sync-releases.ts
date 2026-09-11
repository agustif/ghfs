/**
 * Stream.paginate sync for repo releases → releases/releases.json
 *
 * Copy to: src-effect/services/sync-releases.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Uses GitHubClient.fetchReleases (additive on github-client).
 * MirrorFs has no writeReleases yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/releases?page=&per_page=
 *
 * Schema models first; MirrorFs markdown/layout (`releases/*.md`, `releases.md`) is OUT OF SCOPE
 * (legacy lives in src/sync/sync-releases.ts).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, Release, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const RELEASES_DIR_NAME = "releases"
const RELEASES_FILE_NAME = "releases.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

export interface SyncReleasesSummary {
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

export class SyncReleases extends Context.Service<
  SyncReleases,
  {
    readonly sync: () => Effect.Effect<SyncReleasesSummary, SyncError>
    readonly stream: () => Stream.Stream<Release, SyncError>
  }
>()("ghfs/services/SyncReleases") {
  static readonly layer = Layer.effect(
    SyncReleases,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<Release, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const releases = yield* mapGitHub(
              github.fetchReleases({ page: state.page, perPage: PER_PAGE })
            )

            if (releases.length === 0) {
              return [releases, Option.none()] as const
            }

            const next =
              releases.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [releases, next] as const
          })
        )

      const sync = Effect.fn("SyncReleases.sync")(function* (): Effect.fn.Return<
        SyncReleasesSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing releases via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const releasesDir = path.join(config.directory, RELEASES_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(releasesDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(releasesDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<Release>, (acc, release) => {
              acc.push(release)
              return acc
            })
          )

          collected.sort((a, b) => a.id - b.id)

          const filePath = path.join(releasesDir, RELEASES_FILE_NAME)
          // Schema-first: DateTimeUtc → ISO strings (markdown layout OOS)
          const encoded = Schema.encodeSync(Schema.Array(Release))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeReleases — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeReleases(releases) → releases/releases.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Releases synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncReleases.of({ sync, stream })
    })
  )
}
