/**
 * Single-fetch sync for organization issue fields → .metadata/issue-fields.json
 *
 * Copy to: src-effect/services/sync-issue-fields.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchOrganizationIssueFields — see sync-issue-fields.md / snippet.
 * MirrorFs has no writeIssueFields yet → writes via FileSystem under config.directory.
 * API: GET /orgs/{org}/issue-fields (org = repo owner from config.repo).
 *
 * Cue: src/sync/graph-metadata.ts writeRepositoryGraphMetadata →
 * `.metadata/issue-fields.json` when list non-empty. Skip write when empty.
 * Distinct from SyncIssueTypes.
 *
 * Single-fetch list — no Stream.paginate. Optional Stream.fromIterable
 * (mirrors sync-issue-types). Pattern mirrors landed sync-issue-types
 * (tip 75ff5d7 / #245). Do NOT rewrite SyncIssueTypes / SyncRecentWorkflowRuns.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, IssueField, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue `.metadata/issue-fields.json` under config.directory. */
const METADATA_DIR_NAME = ".metadata"
const ISSUE_FIELDS_FILE_NAME = "issue-fields.json"

/** Additive surface expected on GitHubClient (see sync-issue-fields.md). */
type GitHubClientIssueFields = {
  readonly fetchOrganizationIssueFields: (params?: {
    readonly org?: string
  }) => Effect.Effect<Array<IssueField>, GitHubError>
}

export interface SyncIssueFieldsSummary {
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

export class SyncIssueFields extends Context.Service<
  SyncIssueFields,
  {
    readonly sync: () => Effect.Effect<SyncIssueFieldsSummary, SyncError>
    readonly stream: () => Stream.Stream<IssueField, SyncError>
  }
>()("ghfs/services/SyncIssueFields") {
  static readonly layer = Layer.effect(
    SyncIssueFields,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchOrganizationIssueFields lands (snippet only).
      const github = githubBase as unknown as GitHubClientIssueFields
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchFields = (): Effect.Effect<Array<IssueField>, SyncError> =>
        mapGitHub(github.fetchOrganizationIssueFields())

      const stream = (): Stream.Stream<IssueField, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const fields = yield* fetchFields()
            return Stream.fromIterable(fields)
          })
        )

      const sync = Effect.fn("SyncIssueFields.sync")(function* (): Effect.fn.Return<
        SyncIssueFieldsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing organization issue fields via single-fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const metadataDir = path.join(config.directory, METADATA_DIR_NAME)
          const filePath = path.join(metadataDir, ISSUE_FIELDS_FILE_NAME)

          const fields = yield* fetchFields()
          const sorted = [...fields].sort((a, b) => a.id - b.id)

          // Cue: only write when length > 0
          if (sorted.length === 0) {
            yield* Effect.logInfo("No issue fields; skipping write", {
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

          const encoded = Schema.encodeSync(Schema.Array(IssueField))(sorted)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeIssueFields — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeIssueFields(rows) → .metadata/issue-fields.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Organization issue fields synced", {
            synced: sorted.length,
            path: filePath
          })

          return { synced: sorted.length, path: filePath }
        })
      })

      return SyncIssueFields.of({ sync, stream })
    })
  )
}
