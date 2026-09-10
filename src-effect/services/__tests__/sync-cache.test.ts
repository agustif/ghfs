import { Effect, Layer } from "effect"
import { describe, it } from "@effect/vitest"
import { SyncCache } from "../sync-cache"
import { GitHubClient } from "../github-client"
import type { Repo } from "../../domain"

const mockRepo: Repo = {
  owner: "test",
  name: "repo",
  fullName: "test/repo",
  description: "Test repo",
  defaultBranch: "main",
  labels: [],
  milestones: []
}

const MockGitHubClient = Layer.succeed(
  GitHubClient,
  GitHubClient.of({
    fetchRepo: () => Effect.succeed(mockRepo),
    fetchIssues: () => Effect.succeed([]),
    fetchIssue: () => Effect.fail({ _tag: "GitHubError" } as any),
    fetchPullRequests: () => Effect.succeed([]),
    fetchPullRequest: () => Effect.fail({ _tag: "GitHubError" } as any),
    fetchPatch: () => Effect.succeed(""),
    closeIssue: () => Effect.void,
    reopenIssue: () => Effect.void,
    updateIssue: () => Effect.void,
    addComment: () => Effect.void,
    addLabels: () => Effect.void,
    removeLabels: () => Effect.void,
    setLabels: () => Effect.void,
    addAssignees: () => Effect.void,
    removeAssignees: () => Effect.void,
    setMilestone: () => Effect.void,
    clearMilestone: () => Effect.void,
    lockIssue: () => Effect.void,
    unlockIssue: () => Effect.void,
    requestReviewers: () => Effect.void,
    removeReviewers: () => Effect.void,
    markReadyForReview: () => Effect.void,
    convertToDraft: () => Effect.void
  })
)

describe("SyncCache", () => {
  const TestLayer = SyncCache.layer.pipe(Layer.provide(MockGitHubClient))

  it.effect("should cache repo metadata", () =>
    Effect.gen(function* () {
      const cache = yield* SyncCache

      const repo1 = yield* cache.getRepo
      const repo2 = yield* cache.getRepo

      expect(repo1).toEqual(mockRepo)
      expect(repo2).toEqual(mockRepo)
      expect(repo1).toBe(repo2)
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("should provide rate limit info", () =>
    Effect.gen(function* () {
      const cache = yield* SyncCache

      const rateLimit = yield* cache.getRateLimit

      expect(rateLimit.remaining).toBeGreaterThan(0)
      expect(rateLimit.limit).toBeGreaterThan(0)
      expect(rateLimit.reset).toBeInstanceOf(Date)
    }).pipe(Effect.provide(TestLayer))
  )
})
