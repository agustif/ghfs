/**
 * ApplyEngine — ghfs-side plan/apply boundary for alchemy deploy.
 *
 * TODO(alchemy): wire real `alchemy deploy` / GitHub provider reconcile via
 * agustif/alchemy (package.json: `alchemy: github:agustif/alchemy#main&path:/packages/alchemy`).
 * Do NOT call real alchemy until the Alchemy Apply agent resources + ghfs.run.ts are ready.
 *
 * ApplyError lives in domain/errors.ts.
 */
import { Context, DateTime, Effect, Layer, Schema } from 'effect'
import {
  ApplyOpResult,
  ApplyOptions,
  ApplyPlan,
  ApplyPlanOptions,
  ApplyPlanSummary,
  ApplyResult,
  type ApplyOp,
} from '../domain/apply-plan'
import { ApplyError } from '../domain/errors'
import { GhfsConfig } from './config'

function summarize(ops: ReadonlyArray<ApplyOp>): ApplyPlanSummary {
  let creates = 0
  let updates = 0
  let deletes = 0
  for (const op of ops) {
    if (op.action === 'create')
      creates++
    else if (op.action === 'update')
      updates++
    else
      deletes++
  }
  return Schema.decodeUnknownSync(ApplyPlanSummary)({
    creates,
    updates,
    deletes,
    total: ops.length,
  })
}

/**
 * Sample / empty plan validated through Schema.decodeUnknownSync.
 * GO later: read `.ghfs/_desired/` + mirror observed state, diff → ops
 * (or delegate drift computation to `alchemy plan`).
 */
function decodeStubPlan(input: {
  id: string
  dryRun: boolean
  createdAt: DateTime.Utc
  repo?: string
  directory?: string
  ops?: ReadonlyArray<unknown>
}): ApplyPlan {
  const ops = input.ops ?? []
  return Schema.decodeUnknownSync(ApplyPlan)({
    id: input.id,
    dryRun: input.dryRun,
    createdAt: input.createdAt,
    repo: input.repo,
    directory: input.directory,
    ops,
    summary: summarize(ops as ReadonlyArray<ApplyOp>),
  })
}

export class ApplyEngine extends Context.Service<
  ApplyEngine,
  {
    plan: (options?: ApplyPlanOptions) => Effect.Effect<ApplyPlan, ApplyError>
    apply: (plan: ApplyPlan, options?: ApplyOptions) => Effect.Effect<ApplyResult, ApplyError>
  }
>()('ghfs/services/ApplyEngine') {
  static readonly layer = Layer.effect(
    ApplyEngine,
    Effect.gen(function* () {
      const config = yield* GhfsConfig
      // Optional later: yield* MirrorFs / GitHubClient for desired-vs-observed diff.

      const plan = Effect.fn('ApplyEngine.plan')(function* (
        options?: ApplyPlanOptions,
      ): Effect.fn.Return<ApplyPlan, ApplyError> {
        const now = yield* DateTime.now
        const dryRun = options?.dryRun ?? true
        const repo = options?.repo ?? config.repo
        const directory = options?.directory ?? config.directory

        yield* Effect.logInfo('ApplyEngine.plan (stub)', { repo, directory, dryRun })

        // Stub: empty plan. Sample op shape (commented) documents alchemy resource tags:
        // {
        //   action: 'create', kind: 'label', id: 'bug', uri: 'ghfs:label:bug',
        //   alchemyType: 'GitHub.Label',
        //   props: { name: 'bug', color: 'd73a4a' },
        // }
        try {
          return decodeStubPlan({
            id: `plan-${now.epochMilliseconds}`,
            dryRun,
            createdAt: now,
            repo,
            directory,
            ops: [],
          })
        }
        catch (cause) {
          return yield* new ApplyError({
            message: 'Failed to decode ApplyPlan',
            cause,
          })
        }
      })

      const apply = Effect.fn('ApplyEngine.apply')(function* (
        applyPlan: ApplyPlan,
        options?: ApplyOptions,
      ): Effect.fn.Return<ApplyResult, ApplyError> {
        const dryRun = options?.dryRun ?? applyPlan.dryRun

        yield* Effect.logInfo('ApplyEngine.apply (stub)', {
          planId: applyPlan.id,
          dryRun,
          opCount: applyPlan.ops.length,
        })

        // TODO(alchemy): map ops → agustif/alchemy deploy boundary.
        // Prefer: invoke alchemy Stack deploy / resource reconcile for GitHub.* types
        // rather than calling Octokit directly from ghfs (ExecutionEngine remains the
        // imperative execute.yml path; ApplyEngine is declarative desired-state).
        //
        //   import { Alchemy } from 'alchemy'
        //   // await alchemy.deploy(...)  — NOT wired in this stub

        const results: Array<ApplyOpResult> = []
        let applied = 0
        let failed = 0
        let skipped = 0

        for (const op of applyPlan.ops) {
          if (dryRun) {
            skipped++
            results.push(
              Schema.decodeUnknownSync(ApplyOpResult)({
                uri: op.uri,
                action: op.action,
                kind: op.kind,
                status: 'dry-run',
                message: `Would ${op.action} ${op.kind} via alchemy deploy (${op.alchemyType ?? `GitHub.${op.kind}`})`,
              }),
            )
            continue
          }

          // Stub success path until alchemy is wired.
          applied++
          results.push(
            Schema.decodeUnknownSync(ApplyOpResult)({
              uri: op.uri,
              action: op.action,
              kind: op.kind,
              status: 'applied',
              message: `Stub-applied ${op.action} ${op.kind} (alchemy deploy not wired)`,
            }),
          )
        }

        if (applyPlan.ops.length === 0) {
          yield* Effect.logInfo('No apply ops in plan', { planId: applyPlan.id })
        }

        try {
          return Schema.decodeUnknownSync(ApplyResult)({
            planId: applyPlan.id,
            dryRun,
            applied,
            failed,
            skipped,
            results,
          })
        }
        catch (cause) {
          return yield* new ApplyError({
            message: 'Failed to decode ApplyResult',
            planId: applyPlan.id,
            cause,
          })
        }
      })

      return ApplyEngine.of({
        plan,
        apply,
      })
    }),
  )
}
