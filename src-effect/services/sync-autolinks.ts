/**
 * Single-fetch sync for GitHub autolink references → autolinks/autolinks.json
 *
 * Copy to: src-effect/services/sync-autolinks.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchAutolinks — see sync-autolinks.md / snippet.
 * MirrorFs has no writeAutolinks yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/autolinks (NOT paginated — no page/per_page).
 *
 * Schema models first; MirrorFs markdown + actions-snapshot wrapper
 * ({ repo, synced_at, count, autolinks }) are OUT OF SCOPE (lean array only).
 *
 * Single-fetch list — no Stream.paginate. Optional Stream.fromIterable for a
 * uniform stream() surface (mirrors sync-codeowners rules stream).
 * Pattern mirrors landed sync-codeowners / sync-interaction-limits
 * Context.Service + Layer + FileSystem snapshot (tip 3af2695 / #223 me-summary).
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { Autolink, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const AUTOLINKS_DIR_NAME = "autolinks"
const AUTOLINKS_FILE_NAME = "autolinks.json"

/** Additive surface expected on GitHubClient (see sync-autolinks.md). */
type GitHubClientAutolinks = {
  readonly fetchAutolinks: () => Effect.Effect<Array<Autolink>, GitHubError>
}

export interface SyncAutolinksSummary {
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

function compareAutolinks(a: Autolink, b: Autolink): number {
  const byPrefix = a.keyPrefix.localeCompare(b.keyPrefix)
  return byPrefix !== 0 ? byPrefix : a.id - b.id
}

export class SyncAutolinks extends Context.Service<
  SyncAutolinks,
  {
    readonly sync: () => Effect.Effect<SyncAutolinksSummary, SyncError>
    readonly stream: () => Stream.Stream<Autolink, SyncError>
  }
>()("ghfs/services/SyncAutolinks") {
  static readonly layer = Layer.effect(
    SyncAutolinks,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchAutolinks lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientAutolinks
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchAll = (): Effect.Effect<Array<Autolink>, SyncError> =>
        mapGitHub(github.fetchAutolinks())

      const stream = (): Stream.Stream<Autolink, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const rows = yield* fetchAll()
            return Stream.fromIterable(rows)
          })
        )

      const sync = Effect.fn("SyncAutolinks.sync")(function* (): Effect.fn.Return<
        SyncAutolinksSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing autolinks via single-fetch")
          yield* mapFs(mirror.ensureDirectory())

          const autolinksDir = path.join(config.directory, AUTOLINKS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(autolinksDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(autolinksDir)))
          )

          const collected = yield* fetchAll()
          collected.sort(compareAutolinks)

          const filePath = path.join(autolinksDir, AUTOLINKS_FILE_NAME)
          // Schema-first encode (wrapper / MirrorFs markdown OOS)
          const encoded = Schema.encodeSync(Schema.Array(Autolink))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeAutolinks — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeAutolinks(autolinks) → autolinks/autolinks.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Autolinks synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncAutolinks.of({ sync, stream })
    })
  )
}
