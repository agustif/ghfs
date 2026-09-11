/**
 * Stream.paginate sync for repo Projects V2 → projects-v2/projects-v2.json
 *
 * Copy to: src-effect/services/sync-projects-v2.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchProjectsV2 — see sync-projects-v2.md / snippet.
 * MirrorFs has no writeProjectsV2 yet → writes via FileSystem under config.directory.
 * Transport: GraphQL `repository.projectsV2(first, after)` (REST has no Projects V2 list).
 *
 * Schema models first; MirrorFs markdown/layout (`projects/<slug>/*.md`, fields.json,
 * items.md) is OUT OF SCOPE (legacy lives in src/sync/sync-projects-v2.ts).
 * Project items/fields sync is a follow-up.
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, ProjectV2, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const PROJECTS_V2_DIR_NAME = "projects-v2"
const PROJECTS_V2_FILE_NAME = "projects-v2.json"
const FIRST = 100

/** Cursor page state for GraphQL `after` pagination. */
type PageState = { readonly cursor: string | null }

/** One GraphQL projectsV2 page (additive client surface). */
export type ProjectsV2Page = {
  readonly projects: Array<ProjectV2>
  readonly pageInfo: {
    readonly hasNextPage: boolean
    readonly endCursor: string | null
  }
}

export interface SyncProjectsV2Summary {
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

export class SyncProjectsV2 extends Context.Service<
  SyncProjectsV2,
  {
    readonly sync: () => Effect.Effect<SyncProjectsV2Summary, SyncError>
    readonly stream: () => Stream.Stream<ProjectV2, SyncError>
  }
>()("ghfs/services/SyncProjectsV2") {
  static readonly layer = Layer.effect(
    SyncProjectsV2,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<ProjectV2, SyncError> =>
        Stream.paginate({ cursor: null } as PageState, (state) =>
          Effect.gen(function* () {
            const page = yield* mapGitHub(
              github.fetchProjectsV2({
                after: state.cursor,
                first: FIRST
              })
            )

            const projects = page.projects

            if (projects.length === 0) {
              return [projects, Option.none()] as const
            }

            const next =
              page.pageInfo.hasNextPage && page.pageInfo.endCursor
                ? Option.some({ cursor: page.pageInfo.endCursor })
                : Option.none<PageState>()

            return [projects, next] as const
          })
        )

      const sync = Effect.fn("SyncProjectsV2.sync")(function* (): Effect.fn.Return<
        SyncProjectsV2Summary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing projects v2 via Stream.paginate (GraphQL cursor)")
          yield* mapFs(mirror.ensureDirectory())

          const projectsDir = path.join(config.directory, PROJECTS_V2_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(projectsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(projectsDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<ProjectV2>, (acc, project) => {
              acc.push(project)
              return acc
            })
          )

          // GraphQL id is opaque String — sort by public number for stable snapshots.
          collected.sort((a, b) => a.number - b.number)

          const filePath = path.join(projectsDir, PROJECTS_V2_FILE_NAME)
          // Schema-first: DateTimeUtc → ISO strings (markdown layout OOS)
          const encoded = Schema.encodeSync(Schema.Array(ProjectV2))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeProjectsV2 — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeProjectsV2(projects) → projects-v2/projects-v2.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Projects V2 synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncProjectsV2.of({ sync, stream })
    })
  )
}
