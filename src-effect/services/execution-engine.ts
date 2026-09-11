import type { ExecuteOp, GitHubError } from '../domain'
import { FileSystem } from '@effect/platform'
import { Context, Effect, Layer } from 'effect'
import { ExecuteError } from '../domain'
import { GhfsConfig } from './config'
import { GitHubClient } from './github-client'

function mapGitHub<A, R>(effect: Effect.Effect<A, GitHubError, R>): Effect.Effect<A, ExecuteError, R> {
  return Effect.mapError(
    effect,
    error =>
      new ExecuteError({
        message: error.message,
        cause: error,
      }),
  )
}

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
    execute: (options?: ExecuteOptions) => Effect.Effect<ExecuteSummary, ExecuteError>
    parseExecuteFile: () => Effect.Effect<Array<ExecuteOp>, ExecuteError>
  }
>()(
  'ghfs/services/ExecutionEngine',
) {
  static readonly layer = Layer.effect(
    ExecutionEngine,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem

      const parseExecuteFile = Effect.fn('ExecutionEngine.parseExecuteFile')(function* (): Effect.fn.Return<
        Array<ExecuteOp>,
        ExecuteError
      > {
        const filePath = `${config.directory}/execute.yml`
        const exists = yield* fs.exists(filePath)

        if (!exists) {
          return []
        }

        const content = yield* fs.readFileString(filePath)

        const yaml = yield* Effect.tryPromise({
          try: async () => {
            const YAML = await import('yaml')
            return YAML.parse(content)
          },
          catch: error =>
            new ExecuteError({
              message: 'Failed to parse execute.yml',
              cause: error,
            }),
        })

        if (!Array.isArray(yaml)) {
          return yield* new ExecuteError({
            message: 'execute.yml must be an array of operations',
          })
        }

        const ops: Array<ExecuteOp> = []

        for (const item of yaml) {
          ops.push(item as ExecuteOp)
        }

        return ops
      })

      const executeOp = Effect.fn('ExecutionEngine.executeOp')(
        function* (op: ExecuteOp): Effect.fn.Return<void, ExecuteError> {
          yield* Effect.log('Executing operation', op.action, 'on', op.number)

          const action = op.action

          if (action === 'close') {
            yield* mapGitHub(github.closeIssue(op.number))
          }
          else if (action === 'close-with-comment') {
            yield* mapGitHub(github.addComment(op.number, op.body))
            yield* mapGitHub(github.closeIssue(op.number))
          }
          else if (action === 'reopen') {
            yield* mapGitHub(github.reopenIssue(op.number))
          }
          else if (action === 'set-title') {
            yield* mapGitHub(github.updateIssue(op.number, { title: op.title }))
          }
          else if (action === 'set-body') {
            yield* mapGitHub(github.updateIssue(op.number, { body: op.body }))
          }
          else if (action === 'add-comment') {
            yield* mapGitHub(github.addComment(op.number, op.body))
          }
          else if (action === 'add-labels') {
            yield* mapGitHub(github.addLabels(op.number, [...op.labels]))
          }
          else if (action === 'remove-labels') {
            yield* mapGitHub(github.removeLabels(op.number, [...op.labels]))
          }
          else if (action === 'set-labels') {
            yield* mapGitHub(github.setLabels(op.number, [...op.labels]))
          }
          else if (action === 'add-assignees') {
            yield* mapGitHub(github.addAssignees(op.number, [...op.assignees]))
          }
          else if (action === 'remove-assignees') {
            yield* mapGitHub(github.removeAssignees(op.number, [...op.assignees]))
          }
          else if (action === 'set-assignees') {
            yield* mapGitHub(github.setLabels(op.number, [...op.assignees]))
          }
          else if (action === 'set-milestone') {
            yield* mapGitHub(github.setMilestone(op.number, op.milestone))
          }
          else if (action === 'clear-milestone') {
            yield* mapGitHub(github.clearMilestone(op.number))
          }
          else if (action === 'lock') {
            yield* mapGitHub(github.lockIssue(op.number, op.reason))
          }
          else if (action === 'unlock') {
            yield* mapGitHub(github.unlockIssue(op.number))
          }
          else if (action === 'request-reviewers') {
            yield* mapGitHub(github.requestReviewers(op.number, [...op.reviewers]))
          }
          else if (action === 'remove-reviewers') {
            yield* mapGitHub(github.removeReviewers(op.number, [...op.reviewers]))
          }
          else if (action === 'mark-ready-for-review') {
            yield* mapGitHub(github.markReadyForReview(op.number))
          }
          else if (action === 'convert-to-draft') {
            yield* mapGitHub(github.convertToDraft(op.number))
          }
          else {
            const exhaustive: never = op
            return yield* new ExecuteError({
              message: `Unknown operation: ${(exhaustive as any).action}`,
            })
          }
        },
      )

      const execute = Effect.fn('ExecutionEngine.execute')(
        function* (options: ExecuteOptions = {}): Effect.fn.Return<ExecuteSummary, ExecuteError> {
          const ops = yield* parseExecuteFile()

          if (ops.length === 0) {
            yield* Effect.log('No operations to execute')
            return { executed: 0, failed: 0, skipped: 0 }
          }

          yield* Effect.log(`Found ${ops.length} operations`)

          if (!options.run) {
            yield* Effect.log('Dry run mode (use --run to execute)')
            return { executed: 0, failed: 0, skipped: ops.length }
          }

          let executed = 0
          let failed = 0

          for (const op of ops) {
            const result = yield* Effect.result(executeOp(op))

            if (result._tag === 'Failure') {
              yield* Effect.logError('Operation failed', op, result.failure)
              failed++

              if (!options.continueOnError) {
                return yield* Effect.fail(result.failure)
              }
            }
            else {
              executed++
            }
          }

          yield* Effect.log('Execution complete', { executed, failed })

          return { executed, failed, skipped: 0 }
        },
      )

      return ExecutionEngine.of({
        execute,
        parseExecuteFile,
      })
    }),
  )
}
