/**
 * Watch Mode Example
 *
 * Shows Schedule-based daemon sync that runs continuously.
 * Demonstrates Effect.repeat with Schedule.spaced.
 */

import { Effect, Layer, Schedule } from "effect"
import { NodeContext } from "@effect/platform-node"
import {
  GhfsConfig,
  GitHubClient,
  MirrorFs,
  SyncEngineStreaming
} from "../services"

const program = Effect.gen(function* () {
  yield* Effect.log("Starting watch mode")
  yield* Effect.log("Press Ctrl+C to stop")

  const syncEngine = yield* SyncEngineStreaming

  const syncOnce = Effect.gen(function* () {
    yield* Effect.log("Running sync...")
    const summary = yield* syncEngine.sync({ full: false })
    yield* Effect.log("Sync done", summary)
    return summary
  })

  yield* syncOnce.pipe(
    Effect.repeat(Schedule.spaced("1 minute")),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Sync failed, will retry", error)
      })
    )
  )
})

const AppLayer = Layer.mergeAll(
  GhfsConfig.layer,
  GitHubClient.layer,
  MirrorFs.layer,
  SyncEngineStreaming.layer
).pipe(Layer.provide(NodeContext.layer))

const runnable = program.pipe(Effect.provide(AppLayer))

export { runnable as watchModeExample }

if (import.meta.url === `file://${process.argv[1]}`) {
  import("@effect/platform-node").then(({ NodeRuntime }) => {
    NodeRuntime.runMain(runnable)
  })
}
