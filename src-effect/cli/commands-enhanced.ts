import { Args, Command, Options } from "@effect/cli"
import { Effect } from "effect"
import { SyncEngineStreaming, ExecutionEngine } from "../services"

export const syncCommand = Command.make(
  "sync",
  {
    full: Options.boolean("full").pipe(
      Options.withDescription("Full sync (ignore lastSince cursor)"),
      Options.withDefault(false)
    ),
    since: Options.text("since").pipe(
      Options.withDescription("ISO datetime to sync from"),
      Options.optional
    ),
    watch: Options.boolean("watch").pipe(
      Options.withDescription("Watch mode: poll GitHub on interval"),
      Options.withDefault(false)
    ),
    watchInterval: Options.text("watch-interval").pipe(
      Options.withDescription("Watch interval (e.g. '5 minutes', '30 seconds')"),
      Options.withDefault("5 minutes")
    ),
    trace: Options.boolean("trace").pipe(
      Options.withDescription("Enable tracing spans"),
      Options.withDefault(false)
    )
  },
  Effect.fn("syncCommand")(function* ({ full, since, watch, watchInterval, trace }) {
    if (trace) {
      yield* Effect.logInfo("Tracing enabled")
    }

    yield* Effect.logInfo("Running sync command", { full, since, watch, watchInterval })

    const syncEngine = yield* SyncEngineStreaming
    const summary = yield* syncEngine.sync({ full, since, watch, watchInterval })

    yield* Effect.logInfo("Sync complete!", summary)
  })
)

export const executeCommand = Command.make(
  "execute",
  {
    run: Options.boolean("run").pipe(
      Options.withDescription("Execute operations (default: dry-run)"),
      Options.withDefault(false)
    ),
    continueOnError: Options.boolean("continue-on-error").pipe(
      Options.withDescription("Continue executing after errors"),
      Options.withDefault(false)
    ),
    trace: Options.boolean("trace").pipe(
      Options.withDescription("Enable tracing spans"),
      Options.withDefault(false)
    )
  },
  Effect.fn("executeCommand")(function* ({ run, continueOnError, trace }) {
    if (trace) {
      yield* Effect.logInfo("Tracing enabled")
    }

    yield* Effect.logInfo("Running execute command", { run, continueOnError })

    const executionEngine = yield* ExecutionEngine
    const summary = yield* executionEngine.execute({ run, continueOnError })

    yield* Effect.logInfo("Execute complete!", summary)
  })
)

export const statusCommand = Command.make(
  "status",
  {},
  Effect.fn("statusCommand")(function* () {
    yield* Effect.logInfo("Status command")
    yield* Effect.log("TODO: Show sync state, last sync time, item counts")
  })
)

export const watchCommand = Command.make(
  "watch",
  {
    interval: Options.text("interval").pipe(
      Options.withDescription("Poll interval (e.g. '5 minutes', '30 seconds')"),
      Options.withDefault("5 minutes")
    )
  },
  Effect.fn("watchCommand")(function* ({ interval }) {
    yield* Effect.logInfo("Watch mode", { interval })

    const syncEngine = yield* SyncEngineStreaming
    yield* syncEngine.sync({ watch: true, watchInterval: interval })
  })
)

export const doctorCommand = Command.make(
  "doctor",
  {},
  Effect.fn("doctorCommand")(function* () {
    yield* Effect.logInfo("Doctor: Validating .ghfs/ mirror")
    yield* Effect.log("TODO: Load sync state, validate Schema, check file consistency")
  })
)

export const app = Command.make("ghfs", {}).pipe(
  Command.withDescription("GitHub issues/PRs as filesystem (Effect-native)"),
  Command.withSubcommands([
    syncCommand,
    executeCommand,
    statusCommand,
    watchCommand,
    doctorCommand
  ])
)
