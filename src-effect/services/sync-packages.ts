/**
 * Stream.paginate sync for GitHub Packages list → packages/packages.json
 *
 * Copy to: src-effect/services/sync-packages.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Uses GitHubClient.fetchPackages — see sync-packages.md / snippet.
 * MirrorFs has no writePackages yet → writes via FileSystem under config.directory.
 * API: GET /orgs/{org}/packages?package_type=&page=&per_page= (org = repo owner)
 *      (user-scoped GET /users/{username}/packages documented in snippet as alternate)
 *
 * Schema models first; package *versions* + MirrorFs markdown/layout are OUT OF SCOPE
 * (legacy kitchen-sink lives in src/sync/sync-packages.ts — list only this slice).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, RepoPackage, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const PACKAGES_DIR_NAME = "packages"
const PACKAGES_FILE_NAME = "packages.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

export interface SyncPackagesSummary {
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

function comparePackages(a: RepoPackage, b: RepoPackage): number {
  const byName = a.name.localeCompare(b.name)
  if (byName !== 0) return byName
  return String(a.packageType).localeCompare(String(b.packageType))
}

export class SyncPackages extends Context.Service<
  SyncPackages,
  {
    readonly sync: () => Effect.Effect<SyncPackagesSummary, SyncError>
    readonly stream: () => Stream.Stream<RepoPackage, SyncError>
  }
>()("ghfs/services/SyncPackages") {
  static readonly layer = Layer.effect(
    SyncPackages,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<RepoPackage, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const packages = yield* mapGitHub(
              github.fetchPackages({ page: state.page, perPage: PER_PAGE })
            )

            if (packages.length === 0) {
              return [packages, Option.none()] as const
            }

            const next =
              packages.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [packages, next] as const
          })
        )

      const sync = Effect.fn("SyncPackages.sync")(function* (): Effect.fn.Return<
        SyncPackagesSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing packages via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const packagesDir = path.join(config.directory, PACKAGES_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(packagesDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(packagesDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<RepoPackage>, (acc, pkg) => {
              acc.push(pkg)
              return acc
            })
          )

          collected.sort(comparePackages)

          const filePath = path.join(packagesDir, PACKAGES_FILE_NAME)
          // Schema-first: DateTimeUtc → ISO strings (versions/markdown layout OOS)
          const encoded = Schema.encodeSync(Schema.Array(RepoPackage))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writePackages — FileSystem write under config.directory.
          // Future additive: MirrorFs.writePackages(packages) → packages/packages.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Packages synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncPackages.of({ sync, stream })
    })
  )
}
