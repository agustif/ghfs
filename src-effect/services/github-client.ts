import { Context, Effect, Layer, Redacted, Schema } from "effect"
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
  HttpBody
} from "@effect/platform"
import type { Issue, PullRequest, Repo } from "../domain"
import { GitHubError } from "../domain"
import { GhfsConfig } from "./config"

export class GitHubClient extends Context.Service<
  GitHubClient,
  {
    fetchRepo(): Effect.Effect<Repo, GitHubError>
    fetchIssues(params: {
      state?: "open" | "closed" | "all"
      since?: string
      page?: number
    }): Effect.Effect<Array<Issue>, GitHubError>
    fetchIssue(number: number): Effect.Effect<Issue, GitHubError>
    fetchPullRequests(params: {
      state?: "open" | "closed" | "all"
      page?: number
    }): Effect.Effect<Array<PullRequest>, GitHubError>
    fetchPullRequest(number: number): Effect.Effect<PullRequest, GitHubError>
    fetchPatch(number: number): Effect.Effect<string, GitHubError>
    closeIssue(number: number): Effect.Effect<void, GitHubError>
    reopenIssue(number: number): Effect.Effect<void, GitHubError>
    updateIssue(
      number: number,
      data: { title?: string; body?: string; state?: "open" | "closed" }
    ): Effect.Effect<void, GitHubError>
    addComment(number: number, body: string): Effect.Effect<void, GitHubError>
    addLabels(number: number, labels: Array<string>): Effect.Effect<void, GitHubError>
    removeLabels(number: number, labels: Array<string>): Effect.Effect<void, GitHubError>
    setLabels(number: number, labels: Array<string>): Effect.Effect<void, GitHubError>
    addAssignees(number: number, assignees: Array<string>): Effect.Effect<void, GitHubError>
    removeAssignees(number: number, assignees: Array<string>): Effect.Effect<void, GitHubError>
    setMilestone(number: number, milestone: string): Effect.Effect<void, GitHubError>
    clearMilestone(number: number): Effect.Effect<void, GitHubError>
    lockIssue(number: number, reason?: string): Effect.Effect<void, GitHubError>
    unlockIssue(number: number): Effect.Effect<void, GitHubError>
    requestReviewers(number: number, reviewers: Array<string>): Effect.Effect<void, GitHubError>
    removeReviewers(number: number, reviewers: Array<string>): Effect.Effect<void, GitHubError>
    markReadyForReview(number: number): Effect.Effect<void, GitHubError>
    convertToDraft(number: number): Effect.Effect<void, GitHubError>
  }
>()(
  "ghfs/services/GitHubClient"
) {
  static readonly layer = Layer.effect(
    GitHubClient,
    Effect.gen(function* () {
      const config = yield* GhfsConfig
      const httpClient = yield* HttpClient.HttpClient

      const baseUrl = "https://api.github.com"
      const [owner, name] = config.repo.split("/")

      const client = httpClient.pipe(
        HttpClient.mapRequest(
          HttpClientRequest.prependUrl(baseUrl),
          HttpClientRequest.setHeader("Authorization", `Bearer ${Redacted.value(config.token)}`),
          HttpClientRequest.setHeader("Accept", "application/vnd.github+json"),
          HttpClientRequest.setHeader("X-GitHub-Api-Version", "2022-11-28")
        ),
        HttpClient.retry({
          times: 3,
          schedule: Effect.Schedule.exponential("1 second")
        })
      )

      const handleError = (error: HttpClientError.HttpClientError) =>
        Effect.gen(function* () {
          if (HttpClientError.isResponseError(error)) {
            const status = error.response.status
            const body = yield* HttpClientResponse.text(error.response)
            return yield* new GitHubError({
              status,
              message: `GitHub API error: ${status}`,
              details: body
            })
          }
          return yield* new GitHubError({
            status: 0,
            message: "Network error",
            details: String(error)
          })
        })

      const fetchRepo = Effect.fn("GitHubClient.fetchRepo")(function* () {
        const response = yield* client.get(`/repos/${owner}/${name}`)
        const json = yield* HttpClientResponse.json(response)
        return yield* Schema.decodeUnknown(Repo)(json)
      }).pipe(Effect.catchAll(handleError))

      const fetchIssues = Effect.fn("GitHubClient.fetchIssues")(function* (params: {
        state?: "open" | "closed" | "all"
        since?: string
        page?: number
      }) {
        const searchParams = new URLSearchParams()
        if (params.state) searchParams.set("state", params.state)
        if (params.since) searchParams.set("since", params.since)
        if (params.page) searchParams.set("page", String(params.page))
        searchParams.set("per_page", "100")

        const response = yield* client.get(
          `/repos/${owner}/${name}/issues?${searchParams.toString()}`
        )
        const json = yield* HttpClientResponse.json(response)
        return yield* Schema.decodeUnknown(Schema.Array(Issue))(json)
      }).pipe(Effect.catchAll(handleError))

      const fetchIssue = Effect.fn("GitHubClient.fetchIssue")(function* (number: number) {
        const response = yield* client.get(`/repos/${owner}/${name}/issues/${number}`)
        const json = yield* HttpClientResponse.json(response)
        return yield* Schema.decodeUnknown(Issue)(json)
      }).pipe(Effect.catchAll(handleError))

      const fetchPullRequests = Effect.fn("GitHubClient.fetchPullRequests")(function* (params: {
        state?: "open" | "closed" | "all"
        page?: number
      }) {
        const searchParams = new URLSearchParams()
        if (params.state) searchParams.set("state", params.state)
        if (params.page) searchParams.set("page", String(params.page))
        searchParams.set("per_page", "100")

        const response = yield* client.get(
          `/repos/${owner}/${name}/pulls?${searchParams.toString()}`
        )
        const json = yield* HttpClientResponse.json(response)
        return yield* Schema.decodeUnknown(Schema.Array(PullRequest))(json)
      }).pipe(Effect.catchAll(handleError))

      const fetchPullRequest = Effect.fn("GitHubClient.fetchPullRequest")(
        function* (number: number) {
          const response = yield* client.get(`/repos/${owner}/${name}/pulls/${number}`)
          const json = yield* HttpClientResponse.json(response)
          return yield* Schema.decodeUnknown(PullRequest)(json)
        }
      ).pipe(Effect.catchAll(handleError))

      const fetchPatch = Effect.fn("GitHubClient.fetchPatch")(function* (number: number) {
        const response = yield* client.get(`/repos/${owner}/${name}/pulls/${number}`, {
          headers: { Accept: "application/vnd.github.v3.patch" }
        })
        return yield* HttpClientResponse.text(response)
      }).pipe(Effect.catchAll(handleError))

      const closeIssue = Effect.fn("GitHubClient.closeIssue")(function* (number: number) {
        yield* client.patch(`/repos/${owner}/${name}/issues/${number}`, {
          body: HttpBody.json({ state: "closed" })
        })
      }).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const reopenIssue = Effect.fn("GitHubClient.reopenIssue")(function* (number: number) {
        yield* client.patch(`/repos/${owner}/${name}/issues/${number}`, {
          body: HttpBody.json({ state: "open" })
        })
      }).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const updateIssue = Effect.fn("GitHubClient.updateIssue")(
        function* (
          number: number,
          data: { title?: string; body?: string; state?: "open" | "closed" }
        ) {
          yield* client.patch(`/repos/${owner}/${name}/issues/${number}`, {
            body: HttpBody.json(data)
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const addComment = Effect.fn("GitHubClient.addComment")(
        function* (number: number, commentBody: string) {
          yield* client.post(`/repos/${owner}/${name}/issues/${number}/comments`, {
            body: HttpBody.json({ body: commentBody })
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const addLabels = Effect.fn("GitHubClient.addLabels")(
        function* (number: number, labels: Array<string>) {
          yield* client.post(`/repos/${owner}/${name}/issues/${number}/labels`, {
            body: HttpBody.json({ labels })
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const removeLabels = Effect.fn("GitHubClient.removeLabels")(
        function* (number: number, labels: Array<string>) {
          yield* Effect.forEach(labels, (label) =>
            client.delete(`/repos/${owner}/${name}/issues/${number}/labels/${label}`)
          )
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const setLabels = Effect.fn("GitHubClient.setLabels")(
        function* (number: number, labels: Array<string>) {
          yield* client.put(`/repos/${owner}/${name}/issues/${number}/labels`, {
            body: HttpBody.json({ labels })
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const addAssignees = Effect.fn("GitHubClient.addAssignees")(
        function* (number: number, assignees: Array<string>) {
          yield* client.post(`/repos/${owner}/${name}/issues/${number}/assignees`, {
            body: HttpBody.json({ assignees })
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const removeAssignees = Effect.fn("GitHubClient.removeAssignees")(
        function* (number: number, assignees: Array<string>) {
          yield* client.delete(`/repos/${owner}/${name}/issues/${number}/assignees`, {
            body: HttpBody.json({ assignees })
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const setMilestone = Effect.fn("GitHubClient.setMilestone")(
        function* (number: number, milestone: string) {
          yield* client.patch(`/repos/${owner}/${name}/issues/${number}`, {
            body: HttpBody.json({ milestone })
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const clearMilestone = Effect.fn("GitHubClient.clearMilestone")(function* (number: number) {
        yield* client.patch(`/repos/${owner}/${name}/issues/${number}`, {
          body: HttpBody.json({ milestone: null })
        })
      }).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const lockIssue = Effect.fn("GitHubClient.lockIssue")(
        function* (number: number, reason?: string) {
          yield* client.put(`/repos/${owner}/${name}/issues/${number}/lock`, {
            body: HttpBody.json({ lock_reason: reason })
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const unlockIssue = Effect.fn("GitHubClient.unlockIssue")(function* (number: number) {
        yield* client.delete(`/repos/${owner}/${name}/issues/${number}/lock`)
      }).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const requestReviewers = Effect.fn("GitHubClient.requestReviewers")(
        function* (number: number, reviewers: Array<string>) {
          yield* client.post(`/repos/${owner}/${name}/pulls/${number}/requested_reviewers`, {
            body: HttpBody.json({ reviewers })
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const removeReviewers = Effect.fn("GitHubClient.removeReviewers")(
        function* (number: number, reviewers: Array<string>) {
          yield* client.delete(`/repos/${owner}/${name}/pulls/${number}/requested_reviewers`, {
            body: HttpBody.json({ reviewers })
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const markReadyForReview = Effect.fn("GitHubClient.markReadyForReview")(
        function* (number: number) {
          yield* client.patch(`/repos/${owner}/${name}/pulls/${number}`, {
            body: HttpBody.json({ draft: false })
          })
        }
      ).pipe(Effect.catchAll(handleError), Effect.asVoid)

      const convertToDraft = Effect.fn("GitHubClient.convertToDraft")(function* (number: number) {
        yield* client.post(`/repos/${owner}/${name}/pulls/${number}/convert-to-draft`)
      }).pipe(Effect.catchAll(handleError), Effect.asVoid)

      return GitHubClient.of({
        fetchRepo,
        fetchIssues,
        fetchIssue,
        fetchPullRequests,
        fetchPullRequest,
        fetchPatch,
        closeIssue,
        reopenIssue,
        updateIssue,
        addComment,
        addLabels,
        removeLabels,
        setLabels,
        addAssignees,
        removeAssignees,
        setMilestone,
        clearMilestone,
        lockIssue,
        unlockIssue,
        requestReviewers,
        removeReviewers,
        markReadyForReview,
        convertToDraft
      })
    })
  )
}
