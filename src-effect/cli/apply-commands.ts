/**
 * Effect unstable/cli Command shapes for `ghfs plan` / `ghfs apply`.
 *
 * Copy to: src-effect/cli/apply-commands.ts
 * (or inline the two Command.make blocks into commands.ts — see INTEGRATION below)
 *
 * Does NOT rewrite cli/program.ts or main.ts — only compose under `app`.
 */
import { Effect, Option } from 'effect'
import { Command, Flag } from 'effect/unstable/cli'
import { ApplyOptions, ApplyPlanOptions } from '../domain/apply-plan'
import { ApplyEngine } from '../services/apply-engine'

/**
 * `ghfs plan` — compute desired-vs-observed ApplyPlan (stub → empty Schema plan).
 * Flags: optional repo/directory overrides.
 */
export const planCommand = Command.make(
  'plan',
  {
    repo: Flag.String('repo').pipe(Flag.optional),
    directory: Flag.String('directory').pipe(Flag.optional),
  },
  Effect.fn('planCommand')(function* ({ repo, directory }) {
    yield* Effect.logInfo('Running plan command', { repo, directory })

    const engine = yield* ApplyEngine
    const plan = yield* engine.plan(
      new ApplyPlanOptions({
        repo: Option.getOrUndefined(repo),
        directory: Option.getOrUndefined(directory),
        dryRun: true,
      }),
    )

    yield* Effect.logInfo('Plan ready', {
      id: plan.id,
      summary: plan.summary,
      ops: plan.ops.length,
    })
  }),
)

/**
 * `ghfs apply` — execute an ApplyPlan via ApplyEngine → alchemy deploy boundary.
 * `--dry-run` defaults true (safe until alchemy deploy wired); optional `--plan` path reserved for serialized plans.
 */
export const applyCommand = Command.make(
  'apply',
  {
    dryRun: Flag.Boolean('dry-run').pipe(Flag.withDefault(true)),
    plan: Flag.String('plan').pipe(Flag.optional),
    repo: Flag.String('repo').pipe(Flag.optional),
    directory: Flag.String('directory').pipe(Flag.optional),
  },
  Effect.fn('applyCommand')(function* ({ dryRun, plan: planPath, repo, directory }) {
    yield* Effect.logInfo('Running apply command', { dryRun, planPath, repo, directory })

    const engine = yield* ApplyEngine

    // Optional plan path reserved for GO: load Schema-validated ApplyPlan from disk.
    // Stub: always compute a fresh plan, then apply with dryRun flag.
    if (Option.isSome(planPath)) {
      yield* Effect.logInfo('plan path provided (stub ignores load)', {
        path: planPath.value,
      })
    }

    const applyPlan = yield* engine.plan(
      new ApplyPlanOptions({
        repo: Option.getOrUndefined(repo),
        directory: Option.getOrUndefined(directory),
        dryRun,
      }),
    )

    const result = yield* engine.apply(
      applyPlan,
      new ApplyOptions({ dryRun }),
    )

    yield* Effect.logInfo('Apply complete!', {
      planId: result.planId,
      dryRun: result.dryRun,
      applied: result.applied,
      failed: result.failed,
      skipped: result.skipped,
    })
  }),
)

/*
 * =============================================================================
 * INTEGRATION into existing commands.ts (do NOT rewrite whole CLI / program.ts)
 * =============================================================================
 *
 * 1) Import the new commands (or paste Command.make bodies above):
 *
 *      import { applyCommand, planCommand } from './apply-commands'
 *
 * 2) Extend `app` subcommands (closed heals: leave program.ts / main.ts alone):
 *
 *      export const app = Command.make('ghfs').pipe(
 *        Command.withDescription('GitHub issues/PRs as filesystem'),
 *        Command.withSubcommands([
 *          syncCommand,
 *          executeCommand,
 *          statusCommand,
 *          planCommand,   // ← add
 *          applyCommand,  // ← add
 *        ]),
 *      )
 *
 * 3) Wire Layer in cli/layer.ts:
 *
 *      import { ApplyEngine, ExecutionEngine, GhfsConfig, ... } from '../services'
 *      export const AppLayer = Layer.mergeAll(
 *        ...,
 *        ExecutionEngine.layer,
 *        ApplyEngine.layer,  // ← add
 *        NodeContext.layer,
 *      )
 *
 * 4) services/index.ts: `export * from "./apply-engine"`
 * 5) domain/index.ts: `export * from "./apply-plan"`
 *    (+ move ApplyError into domain/errors.ts when convenient)
 */
