/**
 * Stream.paginate sync for assignable users →
 * assignee-suggestions/assignee-suggestions.json
 *
 * Copy to: src-effect/services/sync-assignee-suggestions.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchAssigneeSuggestions — see sync-assignee-suggestions.md / snippet.
 * MirrorFs has no writeAssigneeSuggestions yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/assignees?page=&per_page=
 *
 * Cue: src/sync/sync-repository-kitchen-sink.ts writeKitchenSinkData →
 * kitchen-sink/assignee-suggestions.json via provider.fetchAssigneeSuggestions.
 * This slice: lean JSON **array** under assignee-suggestions/ (not kitchen-sink/).
 * Kitchen-sink README / enabledFeatures markdown OOS.
 *
 * Paginated list — Stream.paginate (mirrors sync-tags / sync-git-refs).
 * Always write, including empty []. Distinct from SyncCollaborators / SyncPeople.
 * Pattern mirrors landed sync-git-refs (tip b671e16 / #251).
 * Do NOT rewrite SyncGitRefs / SyncTags / SyncCollaborators / SyncPeople /
 * SyncSatellites bodies.
 *
 * Remaining kitchen-sink leftovers (vuln reporting, traffic) stay OOS this peel.
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { AssigneeSuggestion, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean sibling of kitchen-sink cue path under config.directory. */
const ASSIGNEE_SUGGESTIONS_DIR_NAME = "assignee-suggestions"
const ASSIGNEE_SUGGESTIONS_FILE_NAME = "assignee-suggestions.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

/** Additive surface expected on GitHubClient (see sync-assignee-suggestions.md). */
type GitHubClientAssigneeSuggestions = {
  readonly fetchAssigneeSuggestions: (params?: {
    readonly page?: number
    readonly perPage?: number
  }) => Effect.Effect<Array<AssigneeSuggestion>, GitHubError>
}

export interface SyncAssigneeSuggestionsSummary {
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

export class SyncAssigneeSuggestions extends Context.Service<
  SyncAssigneeSuggestions,
  {
    readonly sync: () => Effect.Effect<SyncAssigneeSuggestionsSummary, SyncError>
    readonly stream: () => Stream.Stream<AssigneeSuggestion, SyncError>
  }
>()("ghfs/services/SyncAssigneeSuggestions") {
  static readonly layer = Layer.effect(
    SyncAssigneeSuggestions,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchAssigneeSuggestions lands (snippet only).
      const github = githubBase as unknown as GitHubClientAssigneeSuggestions
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<AssigneeSuggestion, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const rows = yield* mapGitHub(
              github.fetchAssigneeSuggestions({
                page: state.page,
                perPage: PER_PAGE
              })
            )

            if (rows.length === 0) {
              return [rows, Option.none()] as const
            }

            const next =
              rows.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [rows, next] as const
          })
        )

      const sync = Effect.fn("SyncAssigneeSuggestions.sync")(function* (): Effect.fn.Return<
        SyncAssigneeSuggestionsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing assignee suggestions via Stream.paginate"
          )
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(
            config.directory,
            ASSIGNEE_SUGGESTIONS_DIR_NAME
          )
          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(
              () => [] as Array<AssigneeSuggestion>,
              (acc, row) => {
                acc.push(row)
                return acc
              }
            )
          )

          collected.sort((a, b) => a.login.localeCompare(b.login))

          const filePath = path.join(dir, ASSIGNEE_SUGGESTIONS_FILE_NAME)
          const encoded = Schema.encodeSync(Schema.Array(AssigneeSuggestion))(
            collected
          )
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeAssigneeSuggestions — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeAssigneeSuggestions(rows) → assignee-suggestions/assignee-suggestions.json
          // Always write, including empty [].
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Assignee suggestions synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncAssigneeSuggestions.of({ sync, stream })
    })
  )
}
