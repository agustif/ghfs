/**
 * Stream.paginate sync for Actions workflow *definitions* → workflows/workflows.json
 *
 * Copy to: src-effect/services/sync-workflows.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchWorkflows — see sync-workflows.md / snippet.
 * MirrorFs has no writeWorkflows yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/actions/workflows?page=&per_page=
 *      response shape: { total_count, workflows: [...] }
 *
 * Schema models first; workflow *runs* / jobs / logs / markdown layout are OUT OF SCOPE
 * (legacy kitchen-sink lives in src/sync/sync-workflows.ts — ignore that slice).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, Workflow } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const WORKFLOWS_DIR_NAME = "workflows"
const WORKFLOWS_FILE_NAME = "workflows.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

export interface SyncWorkflowsSummary {
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

export class SyncWorkflows extends Context.Service<
  SyncWorkflows,
  {
    readonly sync: () => Effect.Effect<SyncWorkflowsSummary, SyncError>
    readonly stream: () => Stream.Stream<Workflow, SyncError>
  }
>()("ghfs/services/SyncWorkflows") {
  static readonly layer = Layer.effect(
    SyncWorkflows,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<Workflow, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const workflows = yield* mapGitHub(
              github.fetchWorkflows({ page: state.page, perPage: PER_PAGE })
            )

            if (workflows.length === 0) {
              return [workflows, Option.none()] as const
            }

            const next =
              workflows.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [workflows, next] as const
          })
        )

      const sync = Effect.fn("SyncWorkflows.sync")(function* (): Effect.fn.Return<
        SyncWorkflowsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing Actions workflows via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const workflowsDir = path.join(config.directory, WORKFLOWS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(workflowsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(workflowsDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<Workflow>, (acc, workflow) => {
              acc.push(workflow)
              return acc
            })
          )

          collected.sort((a, b) => a.id - b.id)

          const filePath = path.join(workflowsDir, WORKFLOWS_FILE_NAME)
          // Schema-first: DateTimeUtc → ISO strings (runs/markdown layout OOS)
          const encoded = Schema.encodeSync(Schema.Array(Workflow))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeWorkflows — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeWorkflows(workflows) → workflows/workflows.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Actions workflows synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncWorkflows.of({ sync, stream })
    })
  )
}
