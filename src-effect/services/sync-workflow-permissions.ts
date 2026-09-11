/**
 * Stream.paginate Actions workflows + N+1 getWorkflow detail →
 * actions/workflows.json
 *
 * Copy to: src-effect/services/sync-workflow-permissions.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires tip GitHubClient.fetchWorkflows + additive fetchWorkflowPermissions
 * (see sync-workflow-permissions.md / snippet).
 * MirrorFs has no writeActionsWorkflows yet → writes via FileSystem under config.directory.
 *
 * Cue: src/sync/actions-snapshot.ts writeWorkflowsFile — list workflows, then
 * fetchWorkflowPermissions(id) per row → merge as `permissions`. Lean array only
 * (no { repo, synced_at, count } kitchen-sink wrapper).
 *
 * Does NOT rewrite SyncWorkflows (workflows/workflows.json list-only) or Workflow domain.
 * Pattern mirrors SyncWorkflows Stream.paginate + FileSystem encode (tip 01d2eb0 / #233).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import {
  FileSystemError,
  SyncError,
  Workflow,
  WorkflowWithPermissions
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue `.ghfs/actions/workflows.json` (sibling under config.directory). */
const ACTIONS_DIR_NAME = "actions"
const ACTIONS_WORKFLOWS_FILE_NAME = "workflows.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

/** Additive surface expected on GitHubClient (see sync-workflow-permissions.md). */
type GitHubClientWorkflowPermissions = {
  readonly fetchWorkflows: (params?: {
    page?: number
    perPage?: number
  }) => Effect.Effect<Array<Workflow>, GitHubError>
  readonly fetchWorkflowPermissions: (
    workflowId: number
  ) => Effect.Effect<unknown | null, GitHubError>
}

export interface SyncWorkflowPermissionsSummary {
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

function toWithPermissions(
  workflow: Workflow,
  permissions: unknown | null
): WorkflowWithPermissions {
  return new WorkflowWithPermissions({
    id: workflow.id,
    ...(workflow.nodeId !== undefined ? { nodeId: workflow.nodeId } : {}),
    name: workflow.name,
    path: workflow.path,
    state: workflow.state,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    ...(workflow.htmlUrl !== undefined ? { htmlUrl: workflow.htmlUrl } : {}),
    ...(workflow.badgeUrl !== undefined ? { badgeUrl: workflow.badgeUrl } : {}),
    ...(permissions != null ? { permissions } : {})
  })
}

export class SyncWorkflowPermissions extends Context.Service<
  SyncWorkflowPermissions,
  {
    readonly sync: () => Effect.Effect<SyncWorkflowPermissionsSummary, SyncError>
    readonly stream: () => Stream.Stream<WorkflowWithPermissions, SyncError>
  }
>()("ghfs/services/SyncWorkflowPermissions") {
  static readonly layer = Layer.effect(
    SyncWorkflowPermissions,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchWorkflowPermissions lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientWorkflowPermissions
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const enrich = (
        workflow: Workflow
      ): Effect.Effect<WorkflowWithPermissions, SyncError> =>
        Effect.gen(function* () {
          const detail = yield* mapGitHub(
            github.fetchWorkflowPermissions(workflow.id)
          )
          return toWithPermissions(workflow, detail)
        })

      const stream = (): Stream.Stream<WorkflowWithPermissions, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const workflows = yield* mapGitHub(
              github.fetchWorkflows({ page: state.page, perPage: PER_PAGE })
            )

            if (workflows.length === 0) {
              return [[] as Array<WorkflowWithPermissions>, Option.none()] as const
            }

            const enriched = yield* Effect.forEach(workflows, enrich, {
              concurrency: "unbounded"
            })

            const next =
              workflows.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [enriched, next] as const
          })
        )

      const sync = Effect.fn("SyncWorkflowPermissions.sync")(function* (): Effect.fn.Return<
        SyncWorkflowPermissionsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing Actions workflows with getWorkflow permissions via Stream.paginate"
          )
          yield* mapFs(mirror.ensureDirectory())

          const actionsDir = path.join(config.directory, ACTIONS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(actionsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(actionsDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(
              () => [] as Array<WorkflowWithPermissions>,
              (acc, row) => {
                acc.push(row)
                return acc
              }
            )
          )

          collected.sort((a, b) => a.id - b.id)

          const filePath = path.join(actionsDir, ACTIONS_WORKFLOWS_FILE_NAME)
          // Schema-first lean array (repo/synced_at/count kitchen-sink OOS)
          const encoded = Schema.encodeSync(Schema.Array(WorkflowWithPermissions))(
            collected
          )
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeActionsWorkflows — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeActionsWorkflows(rows) → actions/workflows.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Actions workflows (with permissions) synced", {
            synced: collected.length,
            withPermissions: collected.filter((r) => r.permissions !== undefined)
              .length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncWorkflowPermissions.of({ sync, stream })
    })
  )
}
