import { Context, Effect, Layer, Request, RequestResolver } from "effect"
import type { GitHubError, Issue, PullRequest } from "../domain"
import { GitHubClient } from "./github-client"

export interface FetchIssue extends Request.Request<Issue, GitHubError> {
  readonly _tag: "FetchIssue"
  readonly number: number
}
export const FetchIssue = Request.tagged<FetchIssue>("FetchIssue")

export interface FetchPullRequest extends Request.Request<PullRequest, GitHubError> {
  readonly _tag: "FetchPullRequest"
  readonly number: number
}
export const FetchPullRequest = Request.tagged<FetchPullRequest>("FetchPullRequest")

export class GitHubResolver extends Context.Service<
  GitHubResolver,
  {
    readonly issueResolver: RequestResolver.RequestResolver<FetchIssue>
    readonly prResolver: RequestResolver.RequestResolver<FetchPullRequest>
  }
>()("ghfs/services/GitHubResolver") {
  static readonly layer = Layer.effect(
    GitHubResolver,
    Effect.gen(function* () {
      const github = yield* GitHubClient

      const issueResolver = RequestResolver.make<FetchIssue>((entries) =>
        Effect.forEach(
          entries,
          (entry) =>
            Request.completeEffect(entry, github.fetchIssue(entry.request.number)),
          { concurrency: 3 }
        ).pipe(Effect.asVoid)
      )

      const prResolver = RequestResolver.make<FetchPullRequest>((entries) =>
        Effect.forEach(
          entries,
          (entry) =>
            Request.completeEffect(
              entry,
              github.fetchPullRequest(entry.request.number)
            ),
          { concurrency: 3 }
        ).pipe(Effect.asVoid)
      )

      return GitHubResolver.of({ issueResolver, prResolver })
    })
  )
}
