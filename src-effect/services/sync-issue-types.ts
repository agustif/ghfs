/**
 * Single-fetch sync for repository issue types → .metadata/issue-types.json
 *
 * Copy to: src-effect/services/sync-issue-types.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchRepositoryIssueTypes — see sync-issue-types.md / snippet.
 * MirrorFs has no writeIssueTypes yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/issue-types
 *
 * Cue: src/sync/graph-metadata.ts writeRepositoryGraphMetadata →
 * `.metadata/issue-types.json` when list non-empty. Skip write when empty.
 * Org issue-fields peel OOS this slice.
 *
 * Single-fetch list — no Stream.paginate. Optional Stream.fromIterable
 * (mirrors sync-autolinks). Pattern mirrors landed sync-autolinks /
 * sync-recent-workflow-runs (tip a20952a / #244).
 * Do NOT rewrite SyncRecentWorkflowRuns / SyncRulesets / SyncWorkflows.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, IssueType, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue `.metadata/issue-types.json` under config.directory. */
const METADATA_DIR_NAME = ".metadata"
const ISSUE_TYPES_FILE_NAME = "issue-types.json"

/** Additive surface expected on GitHubClient (see sync-issue-types.md). */
type GitHubClientIssueTypes = {
  readonly fetchRepositoryIssueTypes: () => Effect.Effect<
    Array<IssueType>,
    GitHubError
  >
}

export interface SyncIssueTypesSummary {
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

export class SyncIssueTypes extends Context.Service<
  SyncIssueTypes,
  {
    readonly sync: () => Effect.Effect<SyncIssueTypesSummary, SyncError>
    readonly stream: () => Stream.Stream<IssueType, SyncError>
  }
>()("ghfs/services/SyncIssueTypes") {
  static readonly layer = Layer.effect(
    SyncIssueTypes,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchRepositoryIssueTypes lands (snippet only).
      const github = githubBase as unknown as GitHubClientIssueTypes
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchTypes = (): Effect.Effect<Array<IssueType>, SyncError> =>
        mapGitHub(github.fetchRepositoryIssueTypes())

      const stream = (): Stream.Stream<IssueType, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const types = yield* fetchTypes()
            return Stream.fromIterable(types)
          })
        )

      const sync = Effect.fn("SyncIssueTypes.sync")(function* (): Effect.fn.Return<
        SyncIssueTypesSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing repository issue types via single-fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const metadataDir = path.join(config.directory, METADATA_DIR_NAME)
          const filePath = path.join(metadataDir, ISSUE_TYPES_FILE_NAME)

          const types = yield* fetchTypes()
          const sorted = [...types].sort((a, b) => a.id - b.id)

          // Cue: only write when length > 0
          if (sorted.length === 0) {
            yield* Effect.logInfo("No issue types; skipping write", {
              synced: 0,
              path: filePath
            })
            return { synced: 0, path: filePath }
          }

          yield* mapFs(
            fs
              .makeDirectory(metadataDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(metadataDir)))
          )

          const encoded = Schema.encodeSync(Schema.Array(IssueType))(sorted)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeIssueTypes — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeIssueTypes(rows) → .metadata/issue-types.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Repository issue types synced", {
            synced: sorted.length,
            path: filePath
          })

          return { synced: sorted.length, path: filePath }
        })
      })

      return SyncIssueTypes.of({ sync, stream })
    })
  )
}
