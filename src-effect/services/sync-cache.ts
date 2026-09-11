import { Cache, Context, DateTime, Duration, Effect, Layer, Schema } from "effect"
import type { GitHubError, Repo } from "../domain"
import { GitHubClient } from "./github-client"

/** GitHub rate-limit snapshot — Schema-first (no hand-rolled readonly interface). */
export class RateLimit extends Schema.Class<RateLimit>("RateLimit")({
  remaining: Schema.Int,
  limit: Schema.Int,
  reset: Schema.DateTimeUtc
}) {}

export class SyncCache extends Context.Service<
  SyncCache,
  {
    readonly getRepo: Effect.Effect<Repo, GitHubError>
    readonly getRateLimit: Effect.Effect<RateLimit, GitHubError>
  }
>()("ghfs/services/SyncCache") {
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
          Effect.succeed(
            new RateLimit({
              remaining: 5000,
              limit: 5000,
              reset: DateTime.add(DateTime.nowUnsafe(), { hours: 1 })
            })
          )
      })

      const getRepo = Cache.get(repoCache, "repo")
      const getRateLimit = Cache.get(rateLimitCache, "rate")

      return SyncCache.of({ getRepo, getRateLimit })
    })
  )
}
