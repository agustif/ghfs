/**
 * Stream.paginate sync for repo milestones → milestones.json
 *
 * Copy to: src-effect/services/sync-milestones.ts
 * Wire: export from services/index (barrels already #196 on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchMilestones — see sync-labels.md snippet.
 * MirrorFs has no writeMilestones yet → writes via FileSystem under config.directory.
 */
import { Context, Effect, Layer, Option, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError, Milestone } from "../domain"
import { FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const MILESTONES_FILE_NAME = "milestones.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

/** Additive surface expected on GitHubClient (see sync-labels.md). */
type GitHubClientMilestones = {
  readonly fetchMilestones: (params?: {
    readonly state?: "open" | "closed" | "all"
    readonly page?: number
    readonly perPage?: number
  }) => Effect.Effect<Array<Milestone>, GitHubError>
}

export interface SyncMilestonesSummary {
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

export class SyncMilestones extends Context.Service<
  SyncMilestones,
  {
    readonly sync: () => Effect.Effect<SyncMilestonesSummary, SyncError>
    readonly stream: () => Stream.Stream<Milestone, SyncError>
  }
>()("ghfs/services/SyncMilestones") {
  static readonly layer = Layer.effect(
    SyncMilestones,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      const github = githubBase as unknown as GitHubClientMilestones
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<Milestone, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const milestones = yield* mapGitHub(
              github.fetchMilestones({
                state: "all",
                page: state.page,
                perPage: PER_PAGE
              })
            )

            if (milestones.length === 0) {
              return [milestones, Option.none()] as const
            }

            const next =
              milestones.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [milestones, next] as const
          })
        )

      const sync = Effect.fn("SyncMilestones.sync")(function* (): Effect.fn.Return<
        SyncMilestonesSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing milestones via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const collected = yield* stream().pipe(
            Stream.runFold([] as Array<Milestone>, (acc, milestone) => {
              acc.push(milestone)
              return acc
            })
          )

          collected.sort((a, b) => a.number - b.number)

          const filePath = path.join(config.directory, MILESTONES_FILE_NAME)
          const body = `${JSON.stringify(
            collected.map((milestone) => ({
              number: milestone.number,
              title: milestone.title,
              state: milestone.state,
              description: milestone.description,
              due_on: milestone.dueOn,
              open_issues: milestone.openIssues,
              closed_issues: milestone.closedIssues
            })),
            null,
            2
          )}\n`

          // NOTE: MirrorFs has no writeMilestones — FileSystem write under config.directory.
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Milestones synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncMilestones.of({ sync, stream })
    })
  )
}
