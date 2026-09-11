/**
 * Single-fetch sync for recent Actions workflow runs →
 * actions/recent-runs.json
 *
 * Copy to: src-effect/services/sync-recent-workflow-runs.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchRecentWorkflowRuns — see sync-recent-workflow-runs.md / snippet.
 * MirrorFs has no writeRecentWorkflowRuns yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/actions/runs?per_page= (cue limit 20).
 *
 * DISTINCT from SyncWorkflows (definitions) and SyncWorkflowPermissions
 * (actions/workflows.json detail). Cue: src/sync/enhanced-snapshot.ts
 * writeActionsFile → ACTIONS_FILE_NAME `recent-runs.json`.
 * Legacy `{ synced_at, runs }` wrapper OOS — lean JSON **array** only.
 *
 * Single-fetch list — no Stream.paginate (cue fixed limit 20). Optional
 * Stream.fromIterable (mirrors sync-commit-comments / sync-autolinks).
 * Pattern mirrors landed sync-commit-comments (tip 4ef9162 / #243).
 * Do NOT rewrite SyncWorkflows / SyncWorkflowPermissions / SyncRulesets.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, WorkflowRun } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue ACTIONS_DIR_NAME / ACTIONS_FILE_NAME under config.directory. */
const ACTIONS_DIR_NAME = "actions"
const ACTIONS_FILE_NAME = "recent-runs.json"
/** Match cue writeActionsFile → fetchRecentWorkflowRuns(20). */
const DEFAULT_LIMIT = 20

/** Additive surface expected on GitHubClient (see sync-recent-workflow-runs.md). */
type GitHubClientRecentWorkflowRuns = {
  readonly fetchRecentWorkflowRuns: (params?: {
    readonly limit?: number
  }) => Effect.Effect<Array<WorkflowRun>, GitHubError>
}

export interface SyncRecentWorkflowRunsSummary {
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

export class SyncRecentWorkflowRuns extends Context.Service<
  SyncRecentWorkflowRuns,
  {
    readonly sync: () => Effect.Effect<SyncRecentWorkflowRunsSummary, SyncError>
    readonly stream: () => Stream.Stream<WorkflowRun, SyncError>
  }
>()("ghfs/services/SyncRecentWorkflowRuns") {
  static readonly layer = Layer.effect(
    SyncRecentWorkflowRuns,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchRecentWorkflowRuns lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientRecentWorkflowRuns
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchRuns = (): Effect.Effect<Array<WorkflowRun>, SyncError> =>
        mapGitHub(github.fetchRecentWorkflowRuns({ limit: DEFAULT_LIMIT }))

      const stream = (): Stream.Stream<WorkflowRun, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const runs = yield* fetchRuns()
            return Stream.fromIterable(runs)
          })
        )

      const sync = Effect.fn("SyncRecentWorkflowRuns.sync")(function* (): Effect.fn.Return<
        SyncRecentWorkflowRunsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing recent workflow runs via single-fetch (limit 20)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const actionsDir = path.join(config.directory, ACTIONS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(actionsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(actionsDir)))
          )

          const runs = yield* fetchRuns()
          // Stable: id desc (newest first — API already newest-first; keep explicit)
          const sorted = [...runs].sort((a, b) => b.id - a.id)

          const filePath = path.join(actionsDir, ACTIONS_FILE_NAME)
          // Schema-first lean array (synced_at wrapper OOS)
          const encoded = Schema.encodeSync(Schema.Array(WorkflowRun))(sorted)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeRecentWorkflowRuns — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeRecentWorkflowRuns(runs) → actions/recent-runs.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Recent workflow runs synced", {
            synced: sorted.length,
            path: filePath
          })

          return { synced: sorted.length, path: filePath }
        })
      })

      return SyncRecentWorkflowRuns.of({ sync, stream })
    })
  )
}
