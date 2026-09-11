/**
 * Stream.paginate sync for issue/PR conversation comments → comments/{kind}-{N}.json
 *
 * Copy to: src-effect/services/sync-comments.ts
 * Wire: export from services/index (barrels already #196 on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchIssueComments / fetchPullComments — see sync-comments.md snippet.
 * MirrorFs has no writeComments yet → writes via FileSystem under config.directory.
 * Prefer issues comments API for both issue + PR conversation comments (match markdown.ts).
 * Review comments (`/pulls/{n}/comments`) are out of scope / optional later.
 *
 * Schema models first; markdown embed into issue/PR files is OUT OF SCOPE
 * (legacy lives in src/sync/markdown.ts MarkdownComment).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { Comment, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const COMMENTS_DIR_NAME = "comments"
const PER_PAGE = 100

export type CommentSubject = {
  readonly kind: "issue" | "pull"
  readonly number: number
}

type PageState = { readonly page: number }

export interface SyncCommentsSummary {
  readonly synced: number
  readonly path: string
  readonly subject: CommentSubject
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

export class SyncComments extends Context.Service<
  SyncComments,
  {
    readonly sync: (
      subject: CommentSubject
    ) => Effect.Effect<SyncCommentsSummary, SyncError>
    readonly stream: (
      subject: CommentSubject
    ) => Stream.Stream<Comment, SyncError>
  }
>()("ghfs/services/SyncComments") {
  static readonly layer = Layer.effect(
    SyncComments,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (
        subject: CommentSubject
      ): Stream.Stream<Comment, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const fetch =
              subject.kind === "pull"
                ? github.fetchPullComments(subject.number, {
                    page: state.page,
                    perPage: PER_PAGE
                  })
                : github.fetchIssueComments(subject.number, {
                    page: state.page,
                    perPage: PER_PAGE
                  })

            const comments = yield* mapGitHub(fetch)

            if (comments.length === 0) {
              return [comments, Option.none()] as const
            }

            const next =
              comments.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [comments, next] as const
          })
        )

      const sync = Effect.fn("SyncComments.sync")(function* (
        subject: CommentSubject
      ): Effect.fn.Return<SyncCommentsSummary, SyncError> {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing comments via Stream.paginate", {
            kind: subject.kind,
            number: subject.number
          })
          yield* mapFs(mirror.ensureDirectory())

          const commentsDir = path.join(config.directory, COMMENTS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(commentsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(commentsDir)))
          )

          const collected = yield* stream(subject).pipe(
            Stream.runFold(() => [] as Array<Comment>, (acc, comment) => {
              acc.push(comment)
              return acc
            })
          )

          collected.sort((a, b) => a.id - b.id)

          const fileName = `${subject.kind}-${subject.number}.json`
          const filePath = path.join(commentsDir, fileName)
          // Schema-first: DateTimeUtc → ISO strings (leave issue.ts markdown embed OOS)
          const encoded = Schema.encodeSync(Schema.Array(Comment))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeComments — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeComments(subject, comments) → comments/{kind}-{N}.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Comments synced", {
            synced: collected.length,
            path: filePath,
            kind: subject.kind,
            number: subject.number
          })

          return { synced: collected.length, path: filePath, subject }
        })
      })

      return SyncComments.of({ sync, stream })
    })
  )
}
