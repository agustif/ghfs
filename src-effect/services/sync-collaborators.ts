/**
 * Stream.paginate sync for GitHub collaborators list → collaborators/collaborators.json
 *
 * Copy to: src-effect/services/sync-collaborators.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchCollaborators — see sync-collaborators.md / snippet.
 * MirrorFs has no writeCollaborators yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/collaborators?page=&per_page=
 *
 * Schema models first; teams / apps bundling + MirrorFs markdown from legacy
 * sync-collaborators.ts are OUT OF SCOPE (lean collaborators list only this slice).
 *
 * Pattern mirrors landed sync-people / sync-teams Stream.paginate + FileSystem
 * snapshot (tip 2c48163 / #209 teams).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { Collaborator, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const COLLABORATORS_DIR_NAME = "collaborators"
const COLLABORATORS_FILE_NAME = "collaborators.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

export interface SyncCollaboratorsSummary {
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

function compareCollaborators(a: Collaborator, b: Collaborator): number {
  return a.login.localeCompare(b.login)
}

export class SyncCollaborators extends Context.Service<
  SyncCollaborators,
  {
    readonly sync: () => Effect.Effect<SyncCollaboratorsSummary, SyncError>
    readonly stream: () => Stream.Stream<Collaborator, SyncError>
  }
>()("ghfs/services/SyncCollaborators") {
  static readonly layer = Layer.effect(
    SyncCollaborators,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<Collaborator, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const collaborators = yield* mapGitHub(
              github.fetchCollaborators({ page: state.page, perPage: PER_PAGE })
            )

            if (collaborators.length === 0) {
              return [collaborators, Option.none()] as const
            }

            const next =
              collaborators.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [collaborators, next] as const
          })
        )

      const sync = Effect.fn("SyncCollaborators.sync")(function* (): Effect.fn.Return<
        SyncCollaboratorsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing collaborators via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const collaboratorsDir = path.join(config.directory, COLLABORATORS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(collaboratorsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(collaboratorsDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<Collaborator>, (acc, collaborator) => {
              acc.push(collaborator)
              return acc
            })
          )

          collected.sort(compareCollaborators)

          const filePath = path.join(collaboratorsDir, COLLABORATORS_FILE_NAME)
          // Schema-first encode (teams/apps bundling / MirrorFs markdown OOS)
          const encoded = Schema.encodeSync(Schema.Array(Collaborator))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeCollaborators — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeCollaborators(collaborators) → collaborators/collaborators.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Collaborators synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncCollaborators.of({ sync, stream })
    })
  )
}
