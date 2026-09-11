/**
 * Single-fetch sync for repo commit comments → commit-comments.json
 *
 * Copy to: src-effect/services/sync-commit-comments.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchCommitComments — see sync-commit-comments.md / snippet.
 * MirrorFs has no writeCommitComments yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/comments?per_page= (cue limit 30).
 *
 * Distinct from SyncComments (issue/PR conversation comments under comments/).
 * Cue: src/sync/extended-metadata.ts writeCommitComments → COMMIT_COMMENTS_FILE_NAME
 * (legacy NDJSON `.jsonl`). This peel writes a lean JSON **array** at
 * `commit-comments.json` (no kitchen-sink wrapper, no markdown).
 *
 * Single-fetch list — no Stream.paginate (cue uses fixed limit, not full crawl).
 * Optional Stream.fromIterable for a uniform stream() surface
 * (mirrors sync-autolinks / sync-codeowners).
 * Pattern mirrors landed sync-autolinks / sync-viewer-status (tip 93e59ed / #235).
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { CommitComment, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Lean JSON array at mirror root (legacy cue was commit-comments.jsonl NDJSON). */
const COMMIT_COMMENTS_FILE_NAME = "commit-comments.json"
const DEFAULT_LIMIT = 30

/** Additive surface expected on GitHubClient (see sync-commit-comments.md). */
type GitHubClientCommitComments = {
  readonly fetchCommitComments: (params?: {
    readonly limit?: number
  }) => Effect.Effect<Array<CommitComment>, GitHubError>
}

export interface SyncCommitCommentsSummary {
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

function compareCommitComments(a: CommitComment, b: CommitComment): number {
  const byCommit = a.commitId.localeCompare(b.commitId)
  return byCommit !== 0 ? byCommit : a.id - b.id
}

export class SyncCommitComments extends Context.Service<
  SyncCommitComments,
  {
    readonly sync: () => Effect.Effect<SyncCommitCommentsSummary, SyncError>
    readonly stream: () => Stream.Stream<CommitComment, SyncError>
  }
>()("ghfs/services/SyncCommitComments") {
  static readonly layer = Layer.effect(
    SyncCommitComments,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchCommitComments lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientCommitComments
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchComments = (): Effect.Effect<Array<CommitComment>, SyncError> =>
        mapGitHub(github.fetchCommitComments({ limit: DEFAULT_LIMIT }))

      const stream = (): Stream.Stream<CommitComment, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const comments = yield* fetchComments()
            return Stream.fromIterable(comments)
          })
        )

      const sync = Effect.fn("SyncCommitComments.sync")(function* (): Effect.fn.Return<
        SyncCommitCommentsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing repo commit comments via single-fetch (limit 30)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const comments = yield* fetchComments()
          const sorted = [...comments].sort(compareCommitComments)

          const filePath = path.join(config.directory, COMMIT_COMMENTS_FILE_NAME)
          // Schema-first lean array (NDJSON / repo wrapper / markdown OOS)
          const encoded = Schema.encodeSync(Schema.Array(CommitComment))(sorted)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeCommitComments — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeCommitComments(rows) → commit-comments.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Repo commit comments synced", {
            synced: sorted.length,
            path: filePath
          })

          return { synced: sorted.length, path: filePath }
        })
      })

      return SyncCommitComments.of({ sync, stream })
    })
  )
}
