/**
 * Basic Sync Example
 * 
 * Shows how to use the Effect-native sync engine programmatically.
 * Useful for integration into other Effect applications.
 */

import { Effect, Layer } from "effect"
import { NodeContext } from "@effect/platform-node"
import {
  GhfsConfig,
  GitHubClient,
  MirrorFs,
  SyncEngineStreaming
} from "../services"

const program = Effect.gen(function* () {
  yield* Effect.log("Starting sync example")

  const syncEngine = yield* SyncEngineStreaming

  const summary = yield* syncEngine.sync({
    full: false,
    since: undefined
  })

  yield* Effect.log("Sync complete!", summary)

  return summary
})

const AppLayer = Layer.mergeAll(
  GhfsConfig.layer,
  GitHubClient.layer,
  MirrorFs.layer,
  SyncEngineStreaming.layer
).pipe(Layer.provide(NodeContext.layer))

const runnable = program.pipe(Effect.provide(AppLayer))

export { runnable as basicSyncExample }

if (import.meta.url === `file://${process.argv[1]}`) {
  import("@effect/platform-node").then(({ NodeRuntime }) => {
    NodeRuntime.runMain(runnable)
  })
}
