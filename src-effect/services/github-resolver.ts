import { Context, Effect, Layer, Request, RequestResolver } from "effect"
import type { Issue, PullRequest, GitHubError } from "../domain"
import { GitHubClient } from "./github-client"

export class FetchIssue extends Request.TaggedClass("FetchIssue")<
  Issue,
  GitHubError,
  { readonly number: number }
>() {}

export class FetchPullRequest extends Request.TaggedClass("FetchPullRequest")<
  PullRequest,
  GitHubError,
  { readonly number: number }
>() {}

export class GitHubResolver extends Context.Service<
  GitHubResolver,
  {
    readonly issueResolver: RequestResolver.RequestResolver<FetchIssue>
    readonly prResolver: RequestResolver.RequestResolver<FetchPullRequest>
  }
>()(
  "ghfs/services/GitHubResolver"
) {
  static readonly layer = Layer.effect(
    GitHubResolver,
    Effect.gen(function* () {
      const github = yield* GitHubClient

      const issueResolver = RequestResolver.makeBatched(
        (requests: Array<FetchIssue>) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("Batching", requests.length, "issue fetches")

            yield* Effect.forEach(
              requests,
              (req) =>
                Effect.gen(function* () {
                  const issue = yield* github.fetchIssue(req.number)
                  return Request.succeed(req, issue)
                }).pipe(
                  Effect.catchAll((error) => Request.fail(req, error))
                ),
              { concurrency: 3 }
            )
          })
      )

      const prResolver = RequestResolver.makeBatched(
        (requests: Array<FetchPullRequest>) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("Batching", requests.length, "PR fetches")

            yield* Effect.forEach(
              requests,
              (req) =>
                Effect.gen(function* () {
                  const pr = yield* github.fetchPullRequest(req.number)
                  return Request.succeed(req, pr)
                }).pipe(
                  Effect.catchAll((error) => Request.fail(req, error))
                ),
              { concurrency: 3 }
            )
          })
      )

      return GitHubResolver.of({ issueResolver, prResolver })
    })
  )
}
