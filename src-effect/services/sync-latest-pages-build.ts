/**
 * Single-resource sync for GitHub Pages *latest* build →
 * pages/latest-build.json
 *
 * Copy to: src-effect/services/sync-latest-pages-build.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchLatestPagesBuild — see sync-latest-pages-build.md / snippet.
 * MirrorFs has no writeLatestPagesBuild yet → writes via FileSystem under config.directory.
 *
 * Domain: reuses tip PagesBuild (src-effect/domain/pages-build.ts) — NO new domain /
 * LatestPagesBuildSnapshot wrapper this slice (repo/synced_at wrapper OOS; MirrorFs markdown OOS).
 *
 * Single-resource fetch — no Stream.paginate (not a list). Optional Stream.succeed /
 * Stream.empty for a uniform stream() surface (mirrors sync-interaction-limits / sync-codeowners).
 * Pattern mirrors landed sync-interaction-limits Context.Service + Layer + FileSystem
 * snapshot (tip 3b2a002 / #229 search issue queries; PagesBuild + SyncPagesBuilds already on tip).
 *
 * Cue: src/sync/actions-snapshot.ts writePagesFile → pages/latest-build.json via
 * provider.fetchLatestPagesBuild (list[0] ?? null). Skip write when null.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, PagesBuild, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue `.ghfs/pages/latest-build.json` (sibling under config.directory). */
const PAGES_DIR_NAME = "pages"
const LATEST_BUILD_FILE_NAME = "latest-build.json"

/** Additive surface expected on GitHubClient (see sync-latest-pages-build.md). */
type GitHubClientLatestPagesBuild = {
  readonly fetchLatestPagesBuild: () => Effect.Effect<
    PagesBuild | null,
    GitHubError
  >
}

export interface SyncLatestPagesBuildSummary {
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

export class SyncLatestPagesBuild extends Context.Service<
  SyncLatestPagesBuild,
  {
    readonly sync: () => Effect.Effect<SyncLatestPagesBuildSummary, SyncError>
    readonly stream: () => Stream.Stream<PagesBuild, SyncError>
  }
>()("ghfs/services/SyncLatestPagesBuild") {
  static readonly layer = Layer.effect(
    SyncLatestPagesBuild,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchLatestPagesBuild lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientLatestPagesBuild
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchLatest = (): Effect.Effect<PagesBuild | null, SyncError> =>
        mapGitHub(github.fetchLatestPagesBuild())

      const stream = (): Stream.Stream<PagesBuild, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const latest = yield* fetchLatest()
            return latest === null
              ? Stream.empty
              : Stream.succeed(latest)
          })
        )

      const sync = Effect.fn("SyncLatestPagesBuild.sync")(function* (): Effect.fn.Return<
        SyncLatestPagesBuildSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing latest pages build via single-resource fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const pagesDir = path.join(config.directory, PAGES_DIR_NAME)
          const filePath = path.join(pagesDir, LATEST_BUILD_FILE_NAME)

          const latest = yield* fetchLatest()

          // Cue writePagesFile: skip write entirely when fetch returns null
          // (Pages not enabled / no builds).
          if (latest === null) {
            yield* Effect.logInfo("No latest pages build; skipping write", {
              synced: 0,
              path: filePath
            })
            return { synced: 0, path: filePath }
          }

          yield* mapFs(
            fs
              .makeDirectory(pagesDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(pagesDir)))
          )

          // Schema-first encode lean PagesBuild (no repo/synced_at wrapper; MirrorFs markdown OOS)
          const encoded = Schema.encodeSync(PagesBuild)(latest)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeLatestPagesBuild — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeLatestPagesBuild(build) → pages/latest-build.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Latest pages build synced", {
            synced: 1,
            status: latest.status,
            commit: latest.commit,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncLatestPagesBuild.of({ sync, stream })
    })
  )
}
