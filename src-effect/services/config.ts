import { Config, Context, Effect, Layer, Redacted } from "effect"

export class GhfsConfig extends Context.Service<
  GhfsConfig,
  {
    readonly directory: string
    readonly token: Redacted.Redacted
    readonly repo: string
    readonly syncIssues: boolean
    readonly syncPulls: boolean
    readonly syncClosed: "existing" | "all" | false
    readonly syncPatches: "open" | "all" | false
  }
>()(
  "ghfs/services/GhfsConfig"
) {
  static readonly layer = Layer.effect(
    GhfsConfig,
    Effect.gen(function* () {
      const directory = yield* Config.string("GHFS_DIRECTORY").pipe(Config.withDefault(".ghfs"))

      const token = yield* Config.redacted("GITHUB_TOKEN").pipe(
        Config.orElse(() => Config.redacted("GH_TOKEN"))
      )

      const repo = yield* Config.string("GHFS_REPO")

      const syncIssues = yield* Config.boolean("GHFS_SYNC_ISSUES").pipe(Config.withDefault(true))

      const syncPulls = yield* Config.boolean("GHFS_SYNC_PULLS").pipe(Config.withDefault(true))

      const syncClosed = yield* Config.string("GHFS_SYNC_CLOSED").pipe(
        Config.withDefault("existing"),
        Config.validate({
          message: "GHFS_SYNC_CLOSED must be 'existing', 'all', or 'false'",
          validation: (s) => s === "existing" || s === "all" || s === "false"
        }),
        Config.map((s) => (s === "false" ? false : (s as "existing" | "all")))
      )

      const syncPatches = yield* Config.string("GHFS_SYNC_PATCHES").pipe(
        Config.withDefault("open"),
        Config.validate({
          message: "GHFS_SYNC_PATCHES must be 'open', 'all', or 'false'",
          validation: (s) => s === "open" || s === "all" || s === "false"
        }),
        Config.map((s) => (s === "false" ? false : (s as "open" | "all")))
      )

      return GhfsConfig.of({
        directory,
        token,
        repo,
        syncIssues,
        syncPulls,
        syncClosed,
        syncPatches
      })
    })
  )
}
