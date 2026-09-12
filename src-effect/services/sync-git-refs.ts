/**
 * Stream.paginate sync for repository git refs → git/refs.json
 *
 * Copy to: src-effect/services/sync-git-refs.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchGitRefs — see sync-git-refs.md / snippet.
 * MirrorFs has no writeGitRefs yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/git/refs?page=&per_page=
 *
 * Cue: src/sync/sync-repository-kitchen-sink.ts writeKitchenSinkData →
 * kitchen-sink/git-refs.json via provider.fetchGitRefs().
 * This slice: lean object `{ refs: GitRef[] }` at git/refs.json.
 * Kitchen-sink README / enabledFeatures markdown OOS.
 *
 * Paginated list — Stream.paginate (mirrors sync-tags). Always write,
 * including empty []. Distinct from SyncTags / SyncSearchCommitRefs.
 * Pattern mirrors landed sync-tags (tip 5db1655 / #250).
 * Do NOT rewrite SyncTags / SyncParticipation / SyncSatellites bodies.
 *
 * Remaining kitchen-sink leftovers (assignee suggestions, vuln reporting,
 * traffic) stay OOS this peel.
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, GitRef, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean sibling of kitchen-sink cue path under config.directory. */
const GIT_REFS_DIR_NAME = "git"
const GIT_REFS_FILE_NAME = "refs.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

/** Additive surface expected on GitHubClient (see sync-git-refs.md). */
type GitHubClientGitRefs = {
  readonly fetchGitRefs: (params?: {
    readonly page?: number
    readonly perPage?: number
  }) => Effect.Effect<Array<GitRef>, GitHubError>
}

export interface SyncGitRefsSummary {
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

export class SyncGitRefs extends Context.Service<
  SyncGitRefs,
  {
    readonly sync: () => Effect.Effect<SyncGitRefsSummary, SyncError>
    readonly stream: () => Stream.Stream<GitRef, SyncError>
  }
>()("ghfs/services/SyncGitRefs") {
  static readonly layer = Layer.effect(
    SyncGitRefs,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchGitRefs lands (snippet only).
      const github = githubBase as unknown as GitHubClientGitRefs
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<GitRef, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const refs = yield* mapGitHub(
              github.fetchGitRefs({ page: state.page, perPage: PER_PAGE })
            )

            if (refs.length === 0) {
              return [refs, Option.none()] as const
            }

            const next =
              refs.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [refs, next] as const
          })
        )

      const sync = Effect.fn("SyncGitRefs.sync")(function* (): Effect.fn.Return<
        SyncGitRefsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing repository git refs via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, GIT_REFS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<GitRef>, (acc, ref) => {
              acc.push(ref)
              return acc
            })
          )

          collected.sort((a, b) => a.ref.localeCompare(b.ref))

          const filePath = path.join(dir, GIT_REFS_FILE_NAME)
          // Snapshot shape: { refs: GitRef[] } — always write, including empty.
          const encoded = Schema.encodeSync(Schema.Struct({ refs: Schema.Array(GitRef) }))({
            refs: collected
          })
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeGitRefs — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeGitRefs(refs) → git/refs.json
          // Always write, including empty { refs: [] }.
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Repository git refs synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncGitRefs.of({ sync, stream })
    })
  )
}
