import type { Redacted } from 'effect'
import { Config, Context, Effect, Layer } from 'effect'

export class GhfsConfig extends Context.Service<
  GhfsConfig,
  {
    readonly directory: string
    readonly token: Redacted.Redacted
    readonly repo: string
    readonly syncIssues: boolean
    readonly syncPulls: boolean
    readonly syncClosed: 'existing' | 'all' | false
    readonly syncPatches: 'open' | 'all' | false
  }
>()(
  'ghfs/services/GhfsConfig',
) {
  static readonly layer = Layer.effect(
    GhfsConfig,
    Effect.gen(function* () {
      const directory = yield* Config.String('GHFS_DIRECTORY').pipe(Config.withDefault('.ghfs'))

      const token = yield* Config.Redacted('GITHUB_TOKEN').pipe(
        Config.orElse(() => Config.Redacted('GH_TOKEN')),
      )

      const repo = yield* Config.String('GHFS_REPO')

      const syncIssues = yield* Config.Boolean('GHFS_SYNC_ISSUES').pipe(Config.withDefault(true))

      const syncPulls = yield* Config.Boolean('GHFS_SYNC_PULLS').pipe(Config.withDefault(true))

      const syncClosed = yield* Config.Literals(['existing', 'all', 'false'], 'GHFS_SYNC_CLOSED').pipe(
        Config.withDefault('existing' as const),
        Config.map(s => (s === 'false' ? false : s)),
      )

      const syncPatches = yield* Config.Literals(['open', 'all', 'false'], 'GHFS_SYNC_PATCHES').pipe(
        Config.withDefault('open' as const),
        Config.map(s => (s === 'false' ? false : s)),
      )

      return GhfsConfig.of({
        directory,
        token,
        repo,
        syncIssues,
        syncPulls,
        syncClosed,
        syncPatches,
      })
    }),
  )
}
