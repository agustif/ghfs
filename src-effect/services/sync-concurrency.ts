import { Context, DateTime, Effect, Layer, Schema, Semaphore } from "effect"
import type { Issue, PullRequest, SyncError } from "../domain"
import { SyncItemState } from "../domain"
import { MirrorFs } from "./mirror-fs"

/** Batch sync counters + updated item map — Schema-first (no hand-rolled readonly bag). */
export class SyncBatchResult extends Schema.Class<SyncBatchResult>("SyncBatchResult")({
  synced: Schema.Int,
  skipped: Schema.Int,
  errors: Schema.Int,
  items: Schema.Record(Schema.String, SyncItemState)
}) {}

export class SyncConcurrency extends Context.Service<
  SyncConcurrency,
  {
    syncIssues(
      issues: Array<Issue>,
      existingItems: Record<string, SyncItemState>,
      concurrency?: number
    ): Effect.Effect<SyncBatchResult, SyncError>
    syncPullRequests(
      prs: Array<PullRequest>,
      existingItems: Record<string, SyncItemState>,
      concurrency?: number,
      patchPolicy?: "open" | "all" | false
    ): Effect.Effect<SyncBatchResult, SyncError>
  }
>()("ghfs/services/SyncConcurrency") {
  static readonly layer = Layer.effect(
    SyncConcurrency,
    Effect.gen(function* () {
      const mirror = yield* MirrorFs

      const syncIssues = Effect.fn("SyncConcurrency.syncIssues")(function* (
        issues: Array<Issue>,
        existingItems: Record<string, SyncItemState>,
        concurrency: number = 5
      ): Effect.fn.Return<SyncBatchResult, SyncError> {
        const semaphore = yield* Semaphore.make(concurrency)

        const items: Record<string, SyncItemState> = { ...existingItems }
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
                  existingItem.lastUpdatedAt.epochMilliseconds ===
                    issue.updatedAt.epochMilliseconds
                ) {
                  skipped++
                  return
                }

                const filePath = yield* mirror.writeIssue(issue, issue.state)

                if (existingItem && existingItem.filePath !== filePath) {
                  yield* mirror.deletePath(existingItem.filePath)
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
                yield* Effect.logDebug("Synced issue", issue.number)
              }).pipe(
                Effect.catch((error) =>
                  Effect.gen(function* () {
                    yield* Effect.logError("Failed to sync issue", issue.number, error)
                    errors++
                  })
                )
              )
            ),
          { concurrency: "unbounded" }
        )

        return new SyncBatchResult({ synced, skipped, errors, items })
      })

      const syncPullRequests = Effect.fn("SyncConcurrency.syncPullRequests")(function* (
        prs: Array<PullRequest>,
        existingItems: Record<string, SyncItemState>,
        concurrency: number = 5,
        patchPolicy: "open" | "all" | false = "open"
      ): Effect.fn.Return<SyncBatchResult, SyncError> {
        const semaphore = yield* Semaphore.make(concurrency)

        const items: Record<string, SyncItemState> = { ...existingItems }
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
                  existingItem.lastUpdatedAt.epochMilliseconds ===
                    pr.updatedAt.epochMilliseconds
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
                yield* Effect.logDebug("Synced PR", pr.number)
              }).pipe(
                Effect.catch((error) =>
                  Effect.gen(function* () {
                    yield* Effect.logError("Failed to sync PR", pr.number, error)
                    errors++
                  })
                )
              )
            ),
          { concurrency: "unbounded" }
        )

        return new SyncBatchResult({ synced, skipped, errors, items })
      })

      return SyncConcurrency.of({ syncIssues, syncPullRequests })
    })
  )
}
