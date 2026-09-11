/**
 * Stream.paginate sync for pending repo invitations → invitations.json
 *
 * Copy to: src-effect/services/sync-invitations.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchRepoInvitations — see sync-invitations.md / snippet.
 * MirrorFs has no writeInvitations yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/invitations?page=&per_page=
 *
 * Distinct from SyncCollaborators / SyncPeople (accepted members).
 * Cue: src/sync/extended-metadata.ts writeRepoInvitations → invitations.json
 * (lean JSON array; no kitchen-sink wrapper, no markdown).
 *
 * Pattern mirrors landed SyncCommitComments / SyncAutolinks Stream + FileSystem
 * snapshot (tip 8d3873e / #236). Uses Stream.paginate (legacy octokit.paginate).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, RepoInvitation, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue REPO_INVITATIONS_FILE_NAME at mirror root. */
const INVITATIONS_FILE_NAME = "invitations.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

/** Additive surface expected on GitHubClient (see sync-invitations.md). */
type GitHubClientRepoInvitations = {
  readonly fetchRepoInvitations: (params?: {
    readonly page?: number
    readonly perPage?: number
  }) => Effect.Effect<Array<RepoInvitation>, GitHubError>
}

export interface SyncInvitationsSummary {
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

export class SyncInvitations extends Context.Service<
  SyncInvitations,
  {
    readonly sync: () => Effect.Effect<SyncInvitationsSummary, SyncError>
    readonly stream: () => Stream.Stream<RepoInvitation, SyncError>
  }
>()("ghfs/services/SyncInvitations") {
  static readonly layer = Layer.effect(
    SyncInvitations,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchRepoInvitations lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientRepoInvitations
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<RepoInvitation, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const invitations = yield* mapGitHub(
              github.fetchRepoInvitations({
                page: state.page,
                perPage: PER_PAGE
              })
            )

            if (invitations.length === 0) {
              return [invitations, Option.none()] as const
            }

            const next =
              invitations.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [invitations, next] as const
          })
        )

      const sync = Effect.fn("SyncInvitations.sync")(function* (): Effect.fn.Return<
        SyncInvitationsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing repo invitations via Stream.paginate"
          )
          yield* mapFs(mirror.ensureDirectory())

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<RepoInvitation>, (acc, row) => {
              acc.push(row)
              return acc
            })
          )

          collected.sort((a, b) => a.id - b.id)

          const filePath = path.join(config.directory, INVITATIONS_FILE_NAME)
          // Schema-first lean array (wrapper / markdown OOS)
          const encoded = Schema.encodeSync(Schema.Array(RepoInvitation))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeInvitations — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeInvitations(rows) → invitations.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Repo invitations synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncInvitations.of({ sync, stream })
    })
  )
}
