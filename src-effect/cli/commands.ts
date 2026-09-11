import { Command, Options } from '@effect/cli'
import { Effect, Option } from 'effect'
import { ExecutionEngine, SyncEngine } from '../services'

export const syncCommand = Command.make(
  'sync',
  {
    full: Options.boolean('full').pipe(Options.withDefault(false)),
    since: Options.text('since').pipe(Options.optional),
    repo: Options.text('repo').pipe(Options.optional),
  },
  Effect.fn('syncCommand')(function* ({ full, since, repo }) {
    yield* Effect.log('Running sync command', { full, since, repo })

    const syncEngine = yield* SyncEngine
    const summary = yield* syncEngine.sync({ full, since: Option.getOrUndefined(since) })

    yield* Effect.log('Sync complete!', summary)
  }),
)

export const executeCommand = Command.make(
  'execute',
  {
    run: Options.boolean('run').pipe(Options.withDefault(false)),
    continueOnError: Options.boolean('continue-on-error').pipe(Options.withDefault(false)),
  },
  Effect.fn('executeCommand')(function* ({ run, continueOnError }) {
    yield* Effect.log('Running execute command', { run, continueOnError })

    const executionEngine = yield* ExecutionEngine
    const summary = yield* executionEngine.execute({ run, continueOnError })

    yield* Effect.log('Execute complete!', summary)
  }),
)

export const statusCommand = Command.make(
  'status',
  {},
  Effect.fn('statusCommand')(function* () {
    yield* Effect.log('Status command not yet implemented')
    yield* Effect.log('TODO: Show sync state, last sync time, etc.')
  }),
)

export const app = Command.make('ghfs', {}).pipe(
  Command.withDescription('GitHub issues/PRs as filesystem'),
  Command.withSubcommands([syncCommand, executeCommand, statusCommand]),
)
