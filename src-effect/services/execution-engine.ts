import { Context, Effect, Layer } from "effect"
import { FileSystem } from "@effect/platform"
import type { ExecuteOp, ExecuteError } from "../domain"
import { GitHubClient } from "./github-client"
import { GhfsConfig } from "./config"

export interface ExecuteOptions {
  readonly run?: boolean
  readonly continueOnError?: boolean
}

export interface ExecuteSummary {
  readonly executed: number
  readonly failed: number
  readonly skipped: number
}

export class ExecutionEngine extends Context.Service<
  ExecutionEngine,
  {
    execute(options?: ExecuteOptions): Effect.Effect<ExecuteSummary, ExecuteError>
    parseExecuteFile(): Effect.Effect<Array<ExecuteOp>, ExecuteError>
  }
>()(
  "ghfs/services/ExecutionEngine"
) {
  static readonly layer = Layer.effect(
    ExecutionEngine,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem

      const parseExecuteFile = Effect.fn("ExecutionEngine.parseExecuteFile")(function* (): Effect.fn.Return<
        Array<ExecuteOp>,
        ExecuteError
      > {
        const filePath = `${config.directory}/execute.yml`
        const exists = yield* fs.exists(filePath)

        if (!exists) {
          return []
        }

        const content = yield* fs.readFileString(filePath)

        const YAML = await import("yaml")
        const yaml = yield* Effect.try({
          try: () => YAML.parse(content),
          catch: (error) =>
            new ExecuteError({
              message: "Failed to parse execute.yml",
              cause: error
            })
        })

        if (!Array.isArray(yaml)) {
          return yield* new ExecuteError({
            message: "execute.yml must be an array of operations"
          })
        }

        const ops: Array<ExecuteOp> = []

        for (const item of yaml) {
          ops.push(item as ExecuteOp)
        }

        return ops
      })

      const executeOp = Effect.fn("ExecutionEngine.executeOp")(
        function* (op: ExecuteOp): Effect.fn.Return<void, ExecuteError> {
          yield* Effect.log("Executing operation", op.action, "on", op.number)

          const action = op.action
          
          if (action === "close") {
            yield* github.closeIssue(op.number)
          } else if (action === "close-with-comment") {
            yield* github.addComment(op.number, op.body)
            yield* github.closeIssue(op.number)
          } else if (action === "reopen") {
            yield* github.reopenIssue(op.number)
          } else if (action === "set-title") {
            yield* github.updateIssue(op.number, { title: op.title })
          } else if (action === "set-body") {
            yield* github.updateIssue(op.number, { body: op.body })
          } else if (action === "add-comment") {
            yield* github.addComment(op.number, op.body)
          } else if (action === "add-labels") {
            yield* github.addLabels(op.number, op.labels)
          } else if (action === "remove-labels") {
            yield* github.removeLabels(op.number, op.labels)
          } else if (action === "set-labels") {
            yield* github.setLabels(op.number, op.labels)
          } else if (action === "add-assignees") {
            yield* github.addAssignees(op.number, op.assignees)
          } else if (action === "remove-assignees") {
            yield* github.removeAssignees(op.number, op.assignees)
          } else if (action === "set-assignees") {
            yield* github.setLabels(op.number, op.assignees)
          } else if (action === "set-milestone") {
            yield* github.setMilestone(op.number, op.milestone)
          } else if (action === "clear-milestone") {
            yield* github.clearMilestone(op.number)
          } else if (action === "lock") {
            yield* github.lockIssue(op.number, op.reason)
          } else if (action === "unlock") {
            yield* github.unlockIssue(op.number)
          } else if (action === "request-reviewers") {
            yield* github.requestReviewers(op.number, op.reviewers)
          } else if (action === "remove-reviewers") {
            yield* github.removeReviewers(op.number, op.reviewers)
          } else if (action === "mark-ready-for-review") {
            yield* github.markReadyForReview(op.number)
          } else if (action === "convert-to-draft") {
            yield* github.convertToDraft(op.number)
          } else {
            const exhaustive: never = op
            return yield* new ExecuteError({
              message: `Unknown operation: ${(exhaustive as any).action}`
            })
          }
        }
      )

      const execute = Effect.fn("ExecutionEngine.execute")(
        function* (options: ExecuteOptions = {}): Effect.fn.Return<ExecuteSummary, ExecuteError> {
          const ops = yield* parseExecuteFile()

          if (ops.length === 0) {
            yield* Effect.log("No operations to execute")
            return { executed: 0, failed: 0, skipped: 0 }
          }

          yield* Effect.log(`Found ${ops.length} operations`)

          if (!options.run) {
            yield* Effect.log("Dry run mode (use --run to execute)")
            return { executed: 0, failed: 0, skipped: ops.length }
          }

          let executed = 0
          let failed = 0

          for (const op of ops) {
            const result = yield* Effect.either(executeOp(op))

            if (result._tag === "Left") {
              yield* Effect.logError("Operation failed", op, result.left)
              failed++

              if (!options.continueOnError) {
                return yield* Effect.fail(result.left)
              }
            } else {
              executed++
            }
          }

          yield* Effect.log("Execution complete", { executed, failed })

          return { executed, failed, skipped: 0 }
        }
      )

      return ExecutionEngine.of({
        execute,
        parseExecuteFile
      })
    })
  )
}
