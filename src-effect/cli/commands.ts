import { Effect, Option } from 'effect'
import { Command, Flag } from 'effect/unstable/cli'
import { ExecutionEngine, SyncEngineStreaming, SyncSatellites, SyncItemAttachments, SyncStatus } from '../services'
import { applyCommand, planCommand } from './apply-commands'

export const syncCommand = Command.make(
  'sync',
  {
    full: Flag.Boolean('full').pipe(Flag.withDefault(false)),
    since: Flag.String('since').pipe(Flag.optional),
    repo: Flag.String('repo').pipe(Flag.optional),
  },
  Effect.fn('syncCommand')(function* ({ full, since, repo }) {
    yield* Effect.log('Running sync command', { full, since, repo })

    const syncEngine = yield* SyncEngineStreaming
    const summary = yield* syncEngine.sync({
      full,
      since: Option.getOrUndefined(since),
    })

    yield* Effect.log('Sync complete!', summary)

    // Additive satellite stage wiring (labels, metadata, wiki, …)
    const satellites = yield* SyncSatellites
    const satelliteSummary = yield* satellites.sync()
    yield* Effect.log('Satellite sync complete!', satelliteSummary)

    // Item-scoped comments + timeline (subjects from MirrorFs SyncState)
    const itemAttachments = yield* SyncItemAttachments
    const itemAttachmentSummary = yield* itemAttachments.sync()
    yield* Effect.log('Item attachment sync complete!', itemAttachmentSummary)
  }),
)

export const executeCommand = Command.make(
  'execute',
  {
    run: Flag.Boolean('run').pipe(Flag.withDefault(false)),
    continueOnError: Flag.Boolean('continue-on-error').pipe(Flag.withDefault(false)),
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
    const status = yield* SyncStatus
    const result = yield* status.sync()
    // sync() builds StatusSummary from MirrorFs.readSyncState() and writes
    // status/status.json under config.directory for observe consistency.
    yield* Effect.log('Status', {
      path: result.path,
      synced: result.synced,
    })
  }),
)

export { applyCommand, planCommand }

export const app = Command.make('ghfs').pipe(
  Command.withDescription('GitHub issues/PRs as filesystem'),
  Command.withSubcommands([
    syncCommand,
    executeCommand,
    statusCommand,
    planCommand,
    applyCommand,
  ]),
)
