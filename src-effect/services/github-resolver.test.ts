import { expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Issue, PullRequest } from '../domain'
import { GitHubClient } from './github-client'
import { FetchIssue, FetchPullRequest, GitHubResolver } from './github-resolver'

const mockGitHubClient = Layer.succeed(
  GitHubClient,
  GitHubClient.of({
    fetchRepo: Effect.die('Not implemented'),
    fetchIssues: () => Effect.succeed([]),
    fetchIssue: (num: number) =>
      Effect.succeed(
        new Issue({
          number: num,
          title: `Issue ${num}`,
          state: 'open',
          body: 'Test',
          author: 'user',
          labels: [],
          assignees: [],
          milestone: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          closedAt: null,
          comments: [],
        }),
      ),
    fetchPullRequests: () => Effect.succeed([]),
    fetchPullRequest: (num: number) =>
      Effect.succeed(
        new PullRequest({
          number: num,
          title: `PR ${num}`,
          state: 'open',
          body: 'Test',
          author: 'user',
          labels: [],
          assignees: [],
          milestone: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          closedAt: null,
          mergedAt: null,
          merged: false,
          isDraft: false,
          baseRef: 'main',
          headRef: 'feature',
          reviewersRequested: [],
          comments: [],
        }),
      ),
    fetchPatch: () => Effect.die('Not implemented'),
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
    convertToDraft: () => Effect.void,
  }),
)

it.effect('resolves issue requests', () =>
  Effect.gen(function* () {
    const resolver = yield* GitHubResolver

    const request = new FetchIssue({ number: 1 })
    const issue = yield* Effect.request(request, resolver.issueResolver)

    expect(issue.number).toBe(1)
    expect(issue.title).toBe('Issue 1')
  }).pipe(
    Effect.provide(GitHubResolver.layer),
    Effect.provide(mockGitHubClient),
  ))

it.effect('resolves PR requests', () =>
  Effect.gen(function* () {
    const resolver = yield* GitHubResolver

    const request = new FetchPullRequest({ number: 2 })
    const pr = yield* Effect.request(request, resolver.prResolver)

    expect(pr.number).toBe(2)
    expect(pr.title).toBe('PR 2')
  }).pipe(
    Effect.provide(GitHubResolver.layer),
    Effect.provide(mockGitHubClient),
  ))

it.effect('batches multiple issue requests', () =>
  Effect.gen(function* () {
    const resolver = yield* GitHubResolver

    const requests = [
      new FetchIssue({ number: 1 }),
      new FetchIssue({ number: 2 }),
      new FetchIssue({ number: 3 }),
    ]

    const issues = yield* Effect.forEach(
      requests,
      req => Effect.request(req, resolver.issueResolver),
      { batching: true },
    )

    expect(issues).toHaveLength(3)
    expect(issues[0].number).toBe(1)
    expect(issues[1].number).toBe(2)
    expect(issues[2].number).toBe(3)
  }).pipe(
    Effect.provide(GitHubResolver.layer),
    Effect.provide(mockGitHubClient),
  ))
