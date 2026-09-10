import { Context, Effect, Layer, Semaphore } from "effect"
import type { Issue, PullRequest, SyncError } from "../domain"
import { SyncItemState } from "../domain"
import { MirrorFs } from "./mirror-fs"

export class SyncConcurrency extends Context.Service<
  SyncConcurrency,
  {
    syncIssues(
      issues: Array<Issue>,
      existingItems: Record<string, SyncItemState>,
      concurrency?: number
    ): Effect.Effect<
      { synced: number; skipped: number; errors: number; items: Record<string, SyncItemState> },
      SyncError
    >
    syncPullRequests(
      prs: Array<PullRequest>,
      existingItems: Record<string, SyncItemState>,
      concurrency?: number,
      patchPolicy?: "open" | "all" | false
    ): Effect.Effect<
      { synced: number; skipped: number; errors: number; items: Record<string, SyncItemState> },
      SyncError
    >
  }
>()(
  "ghfs/services/SyncConcurrency"
) {
  static readonly layer = Layer.effect(
    SyncConcurrency,
    Effect.gen(function* () {
      const mirror = yield* MirrorFs

      const syncIssues = Effect.fn("SyncConcurrency.syncIssues")(
        function* (
          issues: Array<Issue>,
          existingItems: Record<string, SyncItemState>,
          concurrency: number = 5
        ): Effect.fn.Return<
          {
            synced: number
            skipped: number
            errors: number
            items: Record<string, SyncItemState>
          },
          SyncError
        > {
          const semaphore = yield* Semaphore.make(concurrency)

          const items = { ...existingItems }
          let synced = 0
          let skipped = 0
          let errors = 0

          yield* Effect.forEach(
            issues,
            (issue) =>
              semaphore.withPermits(1)(
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
              ),
            { concurrency: "unbounded" }
          )

          return { synced, skipped, errors, items }
        }
      )

      const syncPullRequests = Effect.fn("SyncConcurrency.syncPullRequests")(
        function* (
          prs: Array<PullRequest>,
          existingItems: Record<string, SyncItemState>,
          concurrency: number = 5,
          patchPolicy: "open" | "all" | false = "open"
        ): Effect.fn.Return<
          {
            synced: number
            skipped: number
            errors: number
            items: Record<string, SyncItemState>
          },
          SyncError
        > {
          const semaphore = yield* Semaphore.make(concurrency)

          const items = { ...existingItems }
          let synced = 0
          let skipped = 0
          let errors = 0

          yield* Effect.forEach(
            prs,
            (pr) =>
              semaphore.withPermits(1)(
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

                  if (patchPolicy === "all" || (patchPolicy === "open" && pr.state === "open")) {
                    yield* Effect.logDebug("Fetching patch for PR", pr.number)
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
              ),
            { concurrency: "unbounded" }
          )

          return { synced, skipped, errors, items }
        }
      )

      return SyncConcurrency.of({ syncIssues, syncPullRequests })
    })
  )
}
