import { Context, Effect, Layer } from "effect"
import type { SyncError } from "../domain"
import { SyncState, SyncItemState } from "../domain"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"
import { GhfsConfig } from "./config"

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

export class SyncEngine extends Context.Service<
  SyncEngine,
  {
    sync(options?: SyncOptions): Effect.Effect<SyncSummary, SyncError>
  }
>()(
  "ghfs/services/SyncEngine"
) {
  static readonly layer = Layer.effect(
    SyncEngine,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig

      const sync = Effect.fn("SyncEngine.sync")(
        function* (options: SyncOptions = {}): Effect.fn.Return<SyncSummary, SyncError> {
          yield* Effect.log("Starting sync", { options })

          yield* mirror.ensureDirectory()

          const existingState = yield* mirror.readSyncState()

          const repo = yield* github.fetchRepo()
          yield* mirror.writeRepo(repo)

          let synced = 0
          let skipped = 0
          let errors = 0

          const items: Record<string, SyncItemState> = existingState?.items ?? {}

          if (config.syncIssues) {
            yield* Effect.log("Syncing issues...")

            const since = options.since ?? (options.full ? undefined : existingState?.lastSince)

            const issues = yield* github.fetchIssues({
              state: config.syncClosed === false ? "open" : "all",
              since
            })

            for (const issue of issues) {
              try {
                const existingItem = items[`issue-${issue.number}`]

                if (
                  existingItem &&
                  existingItem.lastUpdatedAt.getTime() === issue.updatedAt.getTime()
                ) {
                  skipped++
                  continue
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
              } catch (error) {
                yield* Effect.logError("Failed to sync issue", issue.number, error)
                errors++
              }
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

            yield* mirror.writeIssuesIndex(allIssues as any)
          }

          if (config.syncPulls) {
            yield* Effect.log("Syncing pull requests...")

            const prs = yield* github.fetchPullRequests({
              state: config.syncClosed === false ? "open" : "all"
            })

            for (const pr of prs) {
              try {
                const existingItem = items[`pull-${pr.number}`]

                if (
                  existingItem &&
                  existingItem.lastUpdatedAt.getTime() === pr.updatedAt.getTime()
                ) {
                  skipped++
                  continue
                }

                const filePath = yield* mirror.writePullRequest(pr, pr.state)

                if (existingItem && existingItem.filePath !== filePath) {
                  yield* mirror.deletePath(existingItem.filePath)
                }

                let patchPath: string | undefined

                if (config.syncPatches === "all" || (config.syncPatches === "open" && pr.state === "open")) {
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
              } catch (error) {
                yield* Effect.logError("Failed to sync pull request", pr.number, error)
                errors++
              }
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

          yield* Effect.log("Sync complete", { synced, skipped, errors })

          return { synced, skipped, errors }
        }
      )

      return SyncEngine.of({ sync })
    })
  )
}
