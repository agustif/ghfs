import { Context, Effect, Layer, Schedule, Stream } from "effect"
import type { SyncError } from "../domain"
import { SyncState, SyncItemState } from "../domain"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"
import { GhfsConfig } from "./config"

export interface SyncOptions {
  readonly full?: boolean
  readonly since?: string
  readonly numbers?: Array<number>
  readonly watch?: boolean
  readonly watchInterval?: string
}

export interface SyncSummary {
  readonly synced: number
  readonly skipped: number
  readonly errors: number
}

export class SyncEngineStreaming extends Context.Service<
  SyncEngineStreaming,
  {
    sync(options?: SyncOptions): Effect.Effect<SyncSummary, SyncError>
    syncStream(options?: SyncOptions): Stream.Stream<SyncSummary, SyncError>
  }
>()(
  "ghfs/services/SyncEngineStreaming"
) {
  static readonly layer = Layer.effect(
    SyncEngineStreaming,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig

      const syncOnce = Effect.fn("SyncEngineStreaming.syncOnce")(
        function* (options: SyncOptions = {}): Effect.fn.Return<SyncSummary, SyncError> {
          yield* Effect.logInfo("Starting sync", { options })
          yield* Effect.withSpan("sync.run")

          yield* mirror.ensureDirectory()

          const existingState = yield* mirror.readSyncState()
          const repo = yield* github.fetchRepo()
          yield* mirror.writeRepo(repo)

          let synced = 0
          let skipped = 0
          let errors = 0

          const items: Record<string, SyncItemState> = existingState?.items ?? {}

          if (config.syncIssues) {
            yield* Effect.logInfo("Syncing issues via Stream.paginate")

            const issueStream = Stream.paginate(
              { page: 1, done: false },
              (state) =>
                Effect.gen(function* () {
                  if (state.done) {
                    return [[], undefined] as const
                  }

                  const since = options.since ?? (options.full ? undefined : existingState?.lastSince)

                  const issues = yield* github.fetchIssues({
                    state: config.syncClosed === false ? "open" : "all",
                    since,
                    page: state.page
                  })

                  if (issues.length === 0) {
                    return [issues, undefined] as const
                  }

                  return [issues, { page: state.page + 1, done: issues.length < 100 }] as const
                })
            )

            yield* issueStream.pipe(
              Stream.runForEach((issue) =>
                Effect.gen(function* () {
                  const existingItem = items[`issue-${issue.number}`]

                  if (
                    existingItem &&
                    existingItem.lastUpdatedAt.getTime() === issue.updatedAt.getTime()
                  ) {
                    skipped++
                    return
                  }

                  const filePath = yield* mirror.writeIssue(issue, issue.state)

                  if (existingItem && existingItem.filePath !== filePath) {
                    yield* mirror.deletePath(existingItem.filePath)
                  }

                  items[`issue-${issue.number}`] = new SyncItemState({
                    number: issue.number,
                    kind: "issue",
                    state: issue.state,
                    lastUpdatedAt: issue.updatedAt,
                    lastSyncedAt: new Date(),
                    filePath
                  })

                  synced++
                  yield* Effect.logDebug("Synced issue", issue.number)
                }).pipe(
                  Effect.catchAll((error) =>
                    Effect.gen(function* () {
                      yield* Effect.logError("Failed to sync issue", issue.number, error)
                      errors++
                    })
                  )
                )
              )
            )

            const allIssues = Object.values(items)
              .filter((item) => item.kind === "issue")
              .map((item) => ({
                number: item.number,
                title: "",
                state: item.state,
                labels: [],
                updatedAt: item.lastUpdatedAt
              }))

            yield* mirror.writeIssuesIndex(allIssues as any)
          }

          if (config.syncPulls) {
            yield* Effect.logInfo("Syncing pull requests via Stream.paginate")

            const prStream = Stream.paginate(
              { page: 1, done: false },
              (state) =>
                Effect.gen(function* () {
                  if (state.done) {
                    return [[], undefined] as const
                  }

                  const prs = yield* github.fetchPullRequests({
                    state: config.syncClosed === false ? "open" : "all",
                    page: state.page
                  })

                  if (prs.length === 0) {
                    return [prs, undefined] as const
                  }

                  return [prs, { page: state.page + 1, done: prs.length < 100 }] as const
                })
            )

            yield* prStream.pipe(
              Stream.runForEach((pr) =>
                Effect.gen(function* () {
                  const existingItem = items[`pull-${pr.number}`]

                  if (
                    existingItem &&
                    existingItem.lastUpdatedAt.getTime() === pr.updatedAt.getTime()
                  ) {
                    skipped++
                    return
                  }

                  const filePath = yield* mirror.writePullRequest(pr, pr.state)

                  if (existingItem && existingItem.filePath !== filePath) {
                    yield* mirror.deletePath(existingItem.filePath)
                  }

                  let patchPath: string | undefined

                  if (
                    config.syncPatches === "all" ||
                    (config.syncPatches === "open" && pr.state === "open")
                  ) {
                    const patch = yield* github.fetchPatch(pr.number)
                    patchPath = yield* mirror.writePatch(pr.number, patch)
                  } else if (existingItem?.patchPath) {
                    yield* mirror.deletePath(existingItem.patchPath)
                  }

                  items[`pull-${pr.number}`] = new SyncItemState({
                    number: pr.number,
                    kind: "pull",
                    state: pr.state,
                    lastUpdatedAt: pr.updatedAt,
                    lastSyncedAt: new Date(),
                    filePath,
                    patchPath
                  })

                  synced++
                  yield* Effect.logDebug("Synced PR", pr.number)
                }).pipe(
                  Effect.catchAll((error) =>
                    Effect.gen(function* () {
                      yield* Effect.logError("Failed to sync PR", pr.number, error)
                      errors++
                    })
                  )
                )
              )
            )

            const allPulls = Object.values(items)
              .filter((item) => item.kind === "pull")
              .map((item) => ({
                number: item.number,
                title: "",
                state: item.state,
                labels: [],
                updatedAt: item.lastUpdatedAt
              }))

            yield* mirror.writePullsIndex(allPulls as any)
          }

          const newState = new SyncState({
            version: 1,
            repo: config.repo,
            lastSyncedAt: new Date(),
            lastSince: new Date(),
            items
          })

          yield* mirror.writeSyncState(newState)

          yield* Effect.logInfo("Sync complete", { synced, skipped, errors })

          return { synced, skipped, errors }
        }
      )

      const sync = Effect.fn("SyncEngineStreaming.sync")(
        function* (options: SyncOptions = {}): Effect.fn.Return<SyncSummary, SyncError> {
          if (options.watch) {
            const interval = options.watchInterval ?? "5 minutes"
            const schedule = Schedule.spaced(interval)

            yield* Effect.logInfo("Starting watch mode", { interval })

            yield* syncOnce(options).pipe(
              Effect.repeat(schedule),
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  yield* Effect.logError("Sync failed, will retry", error)
                  return { synced: 0, skipped: 0, errors: 1 }
                })
              )
            )

            return { synced: 0, skipped: 0, errors: 0 }
          }

          return yield* syncOnce(options)
        }
      )

      const syncStream = Effect.fn("SyncEngineStreaming.syncStream")(
        function* (options: SyncOptions = {}): Effect.fn.Return<
          Stream.Stream<SyncSummary, SyncError>
        > {
          if (options.watch) {
            const interval = options.watchInterval ?? "5 minutes"

            return Stream.fromSchedule(Schedule.spaced(interval)).pipe(
              Stream.mapEffect(() => syncOnce(options))
            )
          }

          return Stream.fromEffect(syncOnce(options))
        }
      )

      return SyncEngineStreaming.of({ sync, syncStream })
    })
  )
}
