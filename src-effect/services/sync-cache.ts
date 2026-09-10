import { Cache, Context, Duration, Effect, Layer } from "effect"
import type { Repo, GitHubError } from "../domain"
import { GitHubClient } from "./github-client"

export interface RateLimit {
  readonly remaining: number
  readonly limit: number
  readonly reset: Date
}

export class SyncCache extends Context.Service<
  SyncCache,
  {
    readonly getRepo: Effect.Effect<Repo, GitHubError>
    readonly getRateLimit: Effect.Effect<RateLimit, GitHubError>
  }
>()(
  "ghfs/services/SyncCache"
) {
  static readonly layer = Layer.effect(
    SyncCache,
    Effect.gen(function* () {
      const github = yield* GitHubClient

      const repoCache = yield* Cache.make({
        capacity: 1,
        timeToLive: Duration.minutes(5),
        lookup: () => github.fetchRepo()
      })

      const rateLimitCache = yield* Cache.make({
        capacity: 1,
        timeToLive: Duration.seconds(30),
        lookup: () =>
          Effect.succeed({
            remaining: 5000,
            limit: 5000,
            reset: new Date(Date.now() + 3600000)
          } as RateLimit)
      })

      const getRepo = repoCache.get("repo")
      const getRateLimit = rateLimitCache.get("rate")

      return SyncCache.of({ getRepo, getRateLimit })
    })
  )
}
