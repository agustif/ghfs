/**
 * Stream.paginate sync for issue/PR timeline → timeline/{kind}-{N}.json
 *
 * Copy to: src-effect/services/sync-timeline.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchTimeline — see sync-timeline.md / snippet.
 * MirrorFs has no writeTimeline yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/issues/{number}/timeline (works for both issue + PR numbers).
 *
 * Schema models first; markdown embed / `.timeline.jsonl` beside markdown is OUT OF SCOPE
 * (legacy lives in getItemTimelinePath / ProviderTimelineEvent).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, TimelineEvent } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const TIMELINE_DIR_NAME = "timeline"
const PER_PAGE = 100

export type TimelineSubject = {
  readonly kind: "issue" | "pull"
  readonly number: number
}

type PageState = { readonly page: number }


export interface SyncTimelineSummary {
  readonly synced: number
  readonly path: string
  readonly subject: TimelineSubject
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

export class SyncTimeline extends Context.Service<
  SyncTimeline,
  {
    readonly sync: (
      subject: TimelineSubject
    ) => Effect.Effect<SyncTimelineSummary, SyncError>
    readonly stream: (
      subject: TimelineSubject
    ) => Stream.Stream<TimelineEvent, SyncError>
  }
>()("ghfs/services/SyncTimeline") {
  static readonly layer = Layer.effect(
    SyncTimeline,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (
        subject: TimelineSubject
      ): Stream.Stream<TimelineEvent, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            // Timeline API is always /issues/{n}/timeline (PR numbers share the issue namespace).
            const events = yield* mapGitHub(
              github.fetchTimeline(subject.number, {
                page: state.page,
                perPage: PER_PAGE,
                subjectKind: subject.kind
              })
            )

            if (events.length === 0) {
              return [events, Option.none()] as const
            }

            const next =
              events.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [events, next] as const
          })
        )

      const sync = Effect.fn("SyncTimeline.sync")(function* (
        subject: TimelineSubject
      ): Effect.fn.Return<SyncTimelineSummary, SyncError> {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing timeline via Stream.paginate", {
            kind: subject.kind,
            number: subject.number
          })
          yield* mapFs(mirror.ensureDirectory())

          const timelineDir = path.join(config.directory, TIMELINE_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(timelineDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(timelineDir)))
          )

          const collected = yield* stream(subject).pipe(
            Stream.runFold(() => [] as Array<TimelineEvent>, (acc, event) => {
              acc.push(event)
              return acc
            })
          )

          collected.sort((a, b) => a.id.localeCompare(b.id))

          const fileName = `${subject.kind}-${subject.number}.json`
          const filePath = path.join(timelineDir, fileName)
          // Schema-first: DateTimeUtc → ISO strings (markdown embed OOS)
          const encoded = Schema.encodeSync(Schema.Array(TimelineEvent))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeTimeline — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeTimeline(subject, events) → timeline/{kind}-{N}.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Timeline synced", {
            synced: collected.length,
            path: filePath,
            kind: subject.kind,
            number: subject.number
          })

          return { synced: collected.length, path: filePath, subject }
        })
      })

      return SyncTimeline.of({ sync, stream })
    })
  )
}
