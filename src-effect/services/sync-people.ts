/**
 * Stream.paginate sync for GitHub contributors list → people/people.json
 *
 * Copy to: src-effect/services/sync-people.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchContributors — see sync-people.md / snippet.
 * MirrorFs has no writePeople yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/contributors?page=&per_page=
 *
 * Schema models first; AuthoredPRs / reviews / codeowners + MirrorFs markdown
 * are OUT OF SCOPE (legacy kitchen-sink lives in src/sync/sync-people.ts —
 * lean contributors list only this slice). Collaborators follow-up.
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, Person, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const PEOPLE_DIR_NAME = "people"
const PEOPLE_FILE_NAME = "people.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

export interface SyncPeopleSummary {
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

function comparePeople(a: Person, b: Person): number {
  return a.login.localeCompare(b.login)
}

export class SyncPeople extends Context.Service<
  SyncPeople,
  {
    readonly sync: () => Effect.Effect<SyncPeopleSummary, SyncError>
    readonly stream: () => Stream.Stream<Person, SyncError>
  }
>()("ghfs/services/SyncPeople") {
  static readonly layer = Layer.effect(
    SyncPeople,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<Person, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const people = yield* mapGitHub(
              github.fetchContributors({ page: state.page, perPage: PER_PAGE })
            )

            if (people.length === 0) {
              return [people, Option.none()] as const
            }

            const next =
              people.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [people, next] as const
          })
        )

      const sync = Effect.fn("SyncPeople.sync")(function* (): Effect.fn.Return<
        SyncPeopleSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing people via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const peopleDir = path.join(config.directory, PEOPLE_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(peopleDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(peopleDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<Person>, (acc, person) => {
              acc.push(person)
              return acc
            })
          )

          collected.sort(comparePeople)

          const filePath = path.join(peopleDir, PEOPLE_FILE_NAME)
          // Schema-first encode (AuthoredPRs/reviews/codeowners/markdown OOS)
          const encoded = Schema.encodeSync(Schema.Array(Person))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writePeople — FileSystem write under config.directory.
          // Future additive: MirrorFs.writePeople(people) → people/people.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("People synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncPeople.of({ sync, stream })
    })
  )
}
