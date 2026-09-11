import { Context, DateTime, Effect, Layer } from "effect"
import type { FileSystemError, GitHubError } from "../domain"
import { SyncError, SyncItemState, SyncState } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

export interface SyncOptions {
  readonly full?: boolean
  readonly since?: string
  readonly numbers?: Array<number>
}

export interface SyncSummary {
  readonly synced: number
  readonly skipped: number
  readonly errors: number
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

/** options.since is ISO string; SyncState.lastSince is DateTime.Utc */
function resolveSince(
  options: SyncOptions,
  lastSince: DateTime.Utc | undefined
): string | undefined {
  if (options.since !== undefined) {
    return options.since
  }
  if (options.full || lastSince === undefined) {
    return undefined
  }
  return DateTime.formatIso(lastSince)
}

export class SyncEngine extends Context.Service<
  SyncEngine,
  {
    sync(options?: SyncOptions): Effect.Effect<SyncSummary, SyncError>
  }
>()("ghfs/services/SyncEngine") {
  static readonly layer = Layer.effect(
    SyncEngine,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig

      const sync = Effect.fn("SyncEngine.sync")(function* (
        options: SyncOptions = {}
      ): Effect.fn.Return<SyncSummary, SyncError> {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Starting sync", { options })

          yield* mapFs(mirror.ensureDirectory())

          const existingState = yield* mapFs(mirror.readSyncState())

          const repo = yield* mapGitHub(github.fetchRepo())
          yield* mapFs(mirror.writeRepo(repo))

          let synced = 0
          let skipped = 0
          let errors = 0

          const items: Record<string, SyncItemState> = {
            ...(existingState?.items ?? {})
          }

          if (config.syncIssues) {
            yield* Effect.logInfo("Syncing issues...")

            const since = resolveSince(options, existingState?.lastSince)

            const issues = yield* mapGitHub(
              github.fetchIssues({
                state: config.syncClosed === false ? "open" : "all",
                since
              })
            )

            for (const issue of issues) {
              yield* Effect.gen(function* () {
                const existingItem = items[`issue-${issue.number}`]

                if (
                  existingItem &&
                  existingItem.lastUpdatedAt.epochMilliseconds ===
                    issue.updatedAt.epochMilliseconds
                ) {
                  skipped++
                  return
                }

                const filePath = yield* mapFs(
                  mirror.writeIssue(issue, issue.state)
                )

                if (existingItem && existingItem.filePath !== filePath) {
                  yield* mapFs(mirror.deletePath(existingItem.filePath))
                }

                const now = yield* DateTime.now

                items[`issue-${issue.number}`] = new SyncItemState({
                  number: issue.number,
                  kind: "issue",
                  state: issue.state,
                  lastUpdatedAt: issue.updatedAt,
                  lastSyncedAt: now,
                  filePath
                })

                synced++
              }).pipe(
                Effect.catch((error) =>
                  Effect.gen(function* () {
                    yield* Effect.logError(
                      "Failed to sync issue",
                      issue.number,
                      error
                    )
                    errors++
                  })
                )
              )
            }

            const allIssues = Object.values(items)
              .filter((item) => item.kind === "issue")
              .map((item) => ({
                number: item.number,
                title: "",
                state: item.state,
                labels: [],
                updatedAt: item.lastUpdatedAt
              }))

            yield* mapFs(mirror.writeIssuesIndex(allIssues as any))
          }

          if (config.syncPulls) {
            yield* Effect.logInfo("Syncing pull requests...")

            const prs = yield* mapGitHub(
              github.fetchPullRequests({
                state: config.syncClosed === false ? "open" : "all"
              })
            )

            for (const pr of prs) {
              yield* Effect.gen(function* () {
                const existingItem = items[`pull-${pr.number}`]

                if (
                  existingItem &&
                  existingItem.lastUpdatedAt.epochMilliseconds ===
                    pr.updatedAt.epochMilliseconds
                ) {
                  skipped++
                  return
                }

                const filePath = yield* mapFs(
                  mirror.writePullRequest(pr, pr.state)
                )

                if (existingItem && existingItem.filePath !== filePath) {
                  yield* mapFs(mirror.deletePath(existingItem.filePath))
                }

                let patchPath: string | undefined

                if (
                  config.syncPatches === "all" ||
                  (config.syncPatches === "open" && pr.state === "open")
                ) {
                  const patch = yield* mapGitHub(github.fetchPatch(pr.number))
                  patchPath = yield* mapFs(mirror.writePatch(pr.number, patch))
                } else if (existingItem?.patchPath) {
                  yield* mapFs(mirror.deletePath(existingItem.patchPath))
                }

                const now = yield* DateTime.now

                items[`pull-${pr.number}`] = new SyncItemState({
                  number: pr.number,
                  kind: "pull",
                  state: pr.state,
                  lastUpdatedAt: pr.updatedAt,
                  lastSyncedAt: now,
                  filePath,
                  patchPath
                })

                synced++
              }).pipe(
                Effect.catch((error) =>
                  Effect.gen(function* () {
                    yield* Effect.logError(
                      "Failed to sync pull request",
                      pr.number,
                      error
                    )
                    errors++
                  })
                )
              )
            }

            const allPulls = Object.values(items)
              .filter((item) => item.kind === "pull")
              .map((item) => ({
                number: item.number,
                title: "",
                state: item.state,
                labels: [],
                updatedAt: item.lastUpdatedAt
              }))

            yield* mapFs(mirror.writePullsIndex(allPulls as any))
          }

          const now = yield* DateTime.now

          const newState = new SyncState({
            version: 1,
            repo: config.repo,
            lastSyncedAt: now,
            lastSince: now,
            items
          })

          yield* mapFs(mirror.writeSyncState(newState))

          yield* Effect.logInfo("Sync complete", { synced, skipped, errors })

          return { synced, skipped, errors }
        }).pipe(Effect.withSpan("sync.run"))
      })

      return SyncEngine.of({ sync })
    })
  )
}
