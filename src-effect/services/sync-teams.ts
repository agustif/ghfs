/**
 * Stream.paginate sync for GitHub org teams → teams/teams.json
 *
 * Copy to: src-effect/services/sync-teams.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchTeams — see sync-teams.md / snippet.
 * MirrorFs has no writeTeams yet → writes via FileSystem under config.directory.
 *
 * Prefer GraphQL cursor: organization.teams(first, after) with members/repositories
 * totalCount only (member list OOS). REST alternate:
 *   GET /orgs/{org}/teams?page=&per_page= (org = repo owner)
 * is documented in the snippet; SyncTeams drives the GraphQL cursor path.
 *
 * Schema models first; MirrorFs markdown (`teams/index.md`, `teams/<slug>.md`)
 * OUT OF SCOPE (legacy kitchen-sink lives in src/sync/sync-teams.ts).
 *
 * Pattern mirrors landed sync-people Stream.paginate + FileSystem snapshot
 * (tip 9fada7a / #208), with cursor page state like sync-discussions.
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, Team } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const TEAMS_DIR_NAME = "teams"
const TEAMS_FILE_NAME = "teams.json"
const FIRST = 100

/** Cursor page state for GraphQL `after` pagination. */
type PageState = { readonly cursor: string | null }

/** One GraphQL (or synthesized REST) teams page (additive client surface). */
export type TeamsPage = {
  readonly teams: Array<Team>
  readonly pageInfo: {
    readonly hasNextPage: boolean
    readonly endCursor: string | null
  }
}

export interface SyncTeamsSummary {
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

function compareTeams(a: Team, b: Team): number {
  return a.slug.localeCompare(b.slug)
}

export class SyncTeams extends Context.Service<
  SyncTeams,
  {
    readonly sync: () => Effect.Effect<SyncTeamsSummary, SyncError>
    readonly stream: () => Stream.Stream<Team, SyncError>
  }
>()("ghfs/services/SyncTeams") {
  static readonly layer = Layer.effect(
    SyncTeams,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<Team, SyncError> =>
        Stream.paginate({ cursor: null } as PageState, (state) =>
          Effect.gen(function* () {
            const page = yield* mapGitHub(
              github.fetchTeams({
                after: state.cursor,
                first: FIRST
              })
            )

            const teams = page.teams

            if (teams.length === 0) {
              return [teams, Option.none()] as const
            }

            const next =
              page.pageInfo.hasNextPage && page.pageInfo.endCursor
                ? Option.some({ cursor: page.pageInfo.endCursor })
                : Option.none<PageState>()

            return [teams, next] as const
          })
        )

      const sync = Effect.fn("SyncTeams.sync")(function* (): Effect.fn.Return<
        SyncTeamsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing teams via Stream.paginate (GraphQL cursor)")
          yield* mapFs(mirror.ensureDirectory())

          const teamsDir = path.join(config.directory, TEAMS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(teamsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(teamsDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<Team>, (acc, team) => {
              acc.push(team)
              return acc
            })
          )

          collected.sort(compareTeams)

          const filePath = path.join(teamsDir, TEAMS_FILE_NAME)
          // Schema-first encode (members list / MirrorFs markdown OOS)
          const encoded = Schema.encodeSync(Schema.Array(Team))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeTeams — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeTeams(teams) → teams/teams.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Teams synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncTeams.of({ sync, stream })
    })
  )
}
