import { Effect } from "effect"
import { Command } from "effect/unstable/cli"
import { app } from "./commands"
import { AppLayer } from "./layer"

/**
 * Main Effect program (value). Command.run reads argv from Stdio via NodeContext.
 * Do not run this except from main.ts via NodeRuntime.runMain.
 */
export const program = app.pipe(
  Command.run({ version: "0.3.0-effect" }),
  Effect.provide(AppLayer)
) as Effect.Effect<void, unknown, never>
