import type { Repo } from '../domain'
import { expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { GitHubClient } from './github-client'
import { SyncCache } from './sync-cache'

const mockGitHubClient = Layer.succeed(
  GitHubClient,
  GitHubClient.of({
    fetchRepo: Effect.succeed({
      name: 'ghfs',
      full_name: 'agustif/ghfs',
      owner: { login: 'agustif' },
      description: 'Test repo',
      private: false,
      html_url: 'https://github.com/agustif/ghfs',
    } as Repo),
    fetchIssues: () => Effect.succeed([]),
    fetchIssue: () => Effect.die('Not implemented'),
    fetchPullRequests: () => Effect.succeed([]),
    fetchPullRequest: () => Effect.die('Not implemented'),
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

it.effect('caches repo data', () =>
  Effect.gen(function* () {
    const cache = yield* SyncCache

    const repo1 = yield* cache.getRepo
    const repo2 = yield* cache.getRepo

    expect(repo1.name).toBe('ghfs')
    expect(repo2.name).toBe('ghfs')
    expect(repo1).toBe(repo2)
  }).pipe(
    Effect.provide(SyncCache.layer),
    Effect.provide(mockGitHubClient),
  ))

it.effect('provides rate limit info', () =>
  Effect.gen(function* () {
    const cache = yield* SyncCache

    const rateLimit = yield* cache.getRateLimit

    expect(rateLimit.limit).toBe(5000)
    expect(rateLimit.remaining).toBe(5000)
    expect(rateLimit.reset).toBeInstanceOf(Date)
  }).pipe(
    Effect.provide(SyncCache.layer),
    Effect.provide(mockGitHubClient),
  ))
