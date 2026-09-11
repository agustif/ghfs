import type {
  HttpClientError,
} from '@effect/platform'
import type { Comment, Issue, Label, Milestone, PullRequest, Repo } from '../domain'
import {
  HttpBody,
  HttpClient,
  HttpClientRequest,
} from '@effect/platform'
import { Context, DateTime, Effect, Layer, Redacted, Schedule } from 'effect'
import { Comment, GitHubError, Label, Milestone, ReactionSummary } from '../domain'
import { GhfsConfig } from './config'

function toGitHubError(error: HttpClientError.HttpClientError): GitHubError {
  if (error._tag === 'ResponseError') {
    return new GitHubError({
      status: error.response.status,
      message: `GitHub API error: ${error.response.status}`,
      details: error.message,
    })
  }
  return new GitHubError({
    status: 0,
    message: 'Network error',
    details: String(error),
  })
}

export class GitHubClient extends Context.Service<
  GitHubClient,
  {
    fetchRepo: () => Effect.Effect<Repo, GitHubError>
    fetchIssues: (params: {
      state?: 'open' | 'closed' | 'all'
      since?: string
      page?: number
    }) => Effect.Effect<Array<Issue>, GitHubError>
    fetchIssue: (number: number) => Effect.Effect<Issue, GitHubError>
    fetchPullRequests: (params: {
      state?: 'open' | 'closed' | 'all'
      page?: number
    }) => Effect.Effect<Array<PullRequest>, GitHubError>
    fetchPullRequest: (number: number) => Effect.Effect<PullRequest, GitHubError>
    fetchLabels: (params?: {
      page?: number
      perPage?: number
    }) => Effect.Effect<Array<Label>, GitHubError>
    fetchMilestones: (params?: {
      state?: 'open' | 'closed' | 'all'
      page?: number
      perPage?: number
    }) => Effect.Effect<Array<Milestone>, GitHubError>
    fetchIssueComments: (
      number: number,
      params?: { page?: number; perPage?: number },
    ) => Effect.Effect<Array<Comment>, GitHubError>
    fetchPullComments: (
      number: number,
      params?: { page?: number; perPage?: number },
    ) => Effect.Effect<Array<Comment>, GitHubError>
    fetchPatch: (number: number) => Effect.Effect<string, GitHubError>
    closeIssue: (number: number) => Effect.Effect<void, GitHubError>
    reopenIssue: (number: number) => Effect.Effect<void, GitHubError>
    updateIssue: (
      number: number,
      data: { title?: string, body?: string, state?: 'open' | 'closed' },
    ) => Effect.Effect<void, GitHubError>
    addComment: (number: number, body: string) => Effect.Effect<void, GitHubError>
    addLabels: (number: number, labels: Array<string>) => Effect.Effect<void, GitHubError>
    removeLabels: (number: number, labels: Array<string>) => Effect.Effect<void, GitHubError>
    setLabels: (number: number, labels: Array<string>) => Effect.Effect<void, GitHubError>
    addAssignees: (number: number, assignees: Array<string>) => Effect.Effect<void, GitHubError>
    removeAssignees: (number: number, assignees: Array<string>) => Effect.Effect<void, GitHubError>
    setMilestone: (number: number, milestone: string) => Effect.Effect<void, GitHubError>
    clearMilestone: (number: number) => Effect.Effect<void, GitHubError>
    lockIssue: (number: number, reason?: string) => Effect.Effect<void, GitHubError>
    unlockIssue: (number: number) => Effect.Effect<void, GitHubError>
    requestReviewers: (number: number, reviewers: Array<string>) => Effect.Effect<void, GitHubError>
    removeReviewers: (number: number, reviewers: Array<string>) => Effect.Effect<void, GitHubError>
    markReadyForReview: (number: number) => Effect.Effect<void, GitHubError>
    convertToDraft: (number: number) => Effect.Effect<void, GitHubError>
  }
>()(
  'ghfs/services/GitHubClient',
) {
  static readonly layer = Layer.effect(
    GitHubClient,
    Effect.gen(function* () {
      const config = yield* GhfsConfig
      const httpClient = yield* HttpClient.HttpClient

      const baseUrl = 'https://api.github.com'
      const [owner, name] = config.repo.split('/')

      const client = httpClient.pipe(
        HttpClient.mapRequest(req =>
          req.pipe(
            HttpClientRequest.prependUrl(baseUrl),
            HttpClientRequest.setHeader('Authorization', `Bearer ${Redacted.value(config.token)}`),
            HttpClientRequest.setHeader('Accept', 'application/vnd.github+json'),
            HttpClientRequest.setHeader('X-GitHub-Api-Version', '2022-11-28'),
          ),
        ),
        HttpClient.filterStatusOk,
        HttpClient.retry({ times: 3, schedule: Schedule.exponential('1 second') }),
      )

      const fetchRepo = Effect.fn('GitHubClient.fetchRepo')(function* (): Effect.fn.Return<Repo, GitHubError> {
        const response = yield* client.get(`/repos/${owner}/${name}`).pipe(
          Effect.mapError(toGitHubError),
        )
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        return json as Repo
      })

      const fetchIssues = Effect.fn('GitHubClient.fetchIssues')(function* (params: {
        state?: 'open' | 'closed' | 'all'
        since?: string
        page?: number
      }): Effect.fn.Return<Array<Issue>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.state)
          searchParams.set('state', params.state)
        if (params.since)
          searchParams.set('since', params.since)
        if (params.page)
          searchParams.set('page', String(params.page))
        searchParams.set('per_page', '100')

        const response = yield* client
          .get(`/repos/${owner}/${name}/issues?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        return json as Array<Issue>
      })

      const fetchIssue = Effect.fn('GitHubClient.fetchIssue')(function* (number: number): Effect.fn.Return<Issue, GitHubError> {
        const response = yield* client
          .get(`/repos/${owner}/${name}/issues/${number}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        return json as Issue
      })

      const fetchPullRequests = Effect.fn('GitHubClient.fetchPullRequests')(function* (params: {
        state?: 'open' | 'closed' | 'all'
        page?: number
      }): Effect.fn.Return<Array<PullRequest>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.state)
          searchParams.set('state', params.state)
        if (params.page)
          searchParams.set('page', String(params.page))
        searchParams.set('per_page', '100')

        const response = yield* client
          .get(`/repos/${owner}/${name}/pulls?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        return json as Array<PullRequest>
      })

      const fetchPullRequest = Effect.fn('GitHubClient.fetchPullRequest')(
        function* (number: number): Effect.fn.Return<PullRequest, GitHubError> {
          const response = yield* client
            .get(`/repos/${owner}/${name}/pulls/${number}`)
            .pipe(Effect.mapError(toGitHubError))
          const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
          return json as PullRequest
        },
      )


      const fetchLabels = Effect.fn('GitHubClient.fetchLabels')(function* (params: {
        page?: number
        perPage?: number
      } = {}): Effect.fn.Return<Array<Label>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.page)
          searchParams.set('page', String(params.page))
        searchParams.set('per_page', String(params.perPage ?? 100))

        const response = yield* client
          .get(`/repos/${owner}/${name}/labels?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const rows = json as Array<{
          name: string
          color: string
          description: string | null
          default: boolean
        }>
        return rows.map(
          row =>
            new Label({
              name: row.name,
              color: row.color,
              description: row.description ?? null,
              default: row.default,
            }),
        )
      })

      const fetchMilestones = Effect.fn('GitHubClient.fetchMilestones')(function* (params: {
        state?: 'open' | 'closed' | 'all'
        page?: number
        perPage?: number
      } = {}): Effect.fn.Return<Array<Milestone>, GitHubError> {
        const searchParams = new URLSearchParams()
        searchParams.set('state', params.state ?? 'all')
        if (params.page)
          searchParams.set('page', String(params.page))
        searchParams.set('per_page', String(params.perPage ?? 100))

        const response = yield* client
          .get(`/repos/${owner}/${name}/milestones?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const rows = json as Array<{
          number: number
          title: string
          state: 'open' | 'closed'
          description: string | null
          due_on: string | null
          open_issues: number
          closed_issues: number
        }>
        return rows.map(
          row =>
            new Milestone({
              number: row.number,
              title: row.title,
              state: row.state,
              description: row.description ?? null,
              dueOn: row.due_on ?? null,
              openIssues: row.open_issues,
              closedIssues: row.closed_issues,
            }),
        )
      })

      type GitHubCommentWire = {
        id: number
        body: string | null
        created_at: string
        updated_at: string
        user: { login: string } | null
        reactions?: {
          total_count?: number
          '+1'?: number
          '-1'?: number
          laugh?: number
          hooray?: number
          confused?: number
          heart?: number
          rocket?: number
          eyes?: number
        } | null
      }

      function mapReactionSummary(
        reactions: GitHubCommentWire['reactions'],
      ): ReactionSummary | undefined {
        if (!reactions) return undefined
        return new ReactionSummary({
          totalCount: reactions.total_count ?? 0,
          plusOne: reactions['+1'] ?? 0,
          minusOne: reactions['-1'] ?? 0,
          laugh: reactions.laugh ?? 0,
          hooray: reactions.hooray ?? 0,
          confused: reactions.confused ?? 0,
          heart: reactions.heart ?? 0,
          rocket: reactions.rocket ?? 0,
          eyes: reactions.eyes ?? 0,
        })
      }

      function mapComment(
        row: GitHubCommentWire,
        subjectKind: 'issue' | 'pull',
        subjectNumber: number,
      ): Comment {
        const reactions = mapReactionSummary(row.reactions)
        return new Comment({
          id: row.id,
          author: row.user?.login ?? '',
          body: row.body ?? '',
          createdAt: DateTime.fromDateUnsafe(new Date(row.created_at)),
          updatedAt: DateTime.fromDateUnsafe(new Date(row.updated_at)),
          ...(reactions ? { reactions } : {}),
          subjectKind,
          subjectNumber,
        })
      }

      const fetchIssueComments = Effect.fn('GitHubClient.fetchIssueComments')(function* (
        number: number,
        params: { page?: number; perPage?: number } = {},
      ): Effect.fn.Return<Array<Comment>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.page)
          searchParams.set('page', String(params.page))
        searchParams.set('per_page', String(params.perPage ?? 100))

        const response = yield* client
          .get(`/repos/${owner}/${name}/issues/${number}/comments?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const rows = json as Array<GitHubCommentWire>
        return rows.map(row => mapComment(row, 'issue', number))
      })

      // Same issues-comments endpoint for PR conversation comments (markdown.ts parity).
      // Review comments via /pulls/{n}/comments are out of scope / optional later.
      const fetchPullComments = Effect.fn('GitHubClient.fetchPullComments')(function* (
        number: number,
        params: { page?: number; perPage?: number } = {},
      ): Effect.fn.Return<Array<Comment>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.page)
          searchParams.set('page', String(params.page))
        searchParams.set('per_page', String(params.perPage ?? 100))

        const response = yield* client
          .get(`/repos/${owner}/${name}/issues/${number}/comments?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const rows = json as Array<GitHubCommentWire>
        return rows.map(row => mapComment(row, 'pull', number))
      })

      const fetchPatch = Effect.fn('GitHubClient.fetchPatch')(function* (number: number): Effect.fn.Return<string, GitHubError> {
        const response = yield* client
          .get(`/repos/${owner}/${name}/pulls/${number}`, {
            headers: { Accept: 'application/vnd.github.v3.patch' },
          })
          .pipe(Effect.mapError(toGitHubError))
        return yield* response.text.pipe(Effect.mapError(toGitHubError))
      })

      const closeIssue = Effect.fn('GitHubClient.closeIssue')(function* (number: number): Effect.fn.Return<void, GitHubError> {
        yield* client
          .patch(`/repos/${owner}/${name}/issues/${number}`, {
            body: HttpBody.unsafeJson({ state: 'closed' }),
          })
          .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
      })

      const reopenIssue = Effect.fn('GitHubClient.reopenIssue')(function* (number: number): Effect.fn.Return<void, GitHubError> {
        yield* client
          .patch(`/repos/${owner}/${name}/issues/${number}`, {
            body: HttpBody.unsafeJson({ state: 'open' }),
          })
          .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
      })

      const updateIssue = Effect.fn('GitHubClient.updateIssue')(
        function* (
          number: number,
          data: { title?: string, body?: string, state?: 'open' | 'closed' },
        ): Effect.fn.Return<void, GitHubError> {
          yield* client
            .patch(`/repos/${owner}/${name}/issues/${number}`, {
              body: HttpBody.unsafeJson(data),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const addComment = Effect.fn('GitHubClient.addComment')(
        function* (number: number, commentBody: string): Effect.fn.Return<void, GitHubError> {
          yield* client
            .post(`/repos/${owner}/${name}/issues/${number}/comments`, {
              body: HttpBody.unsafeJson({ body: commentBody }),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const addLabels = Effect.fn('GitHubClient.addLabels')(
        function* (number: number, labels: Array<string>): Effect.fn.Return<void, GitHubError> {
          yield* client
            .post(`/repos/${owner}/${name}/issues/${number}/labels`, {
              body: HttpBody.unsafeJson({ labels }),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const removeLabels = Effect.fn('GitHubClient.removeLabels')(
        function* (number: number, labels: Array<string>): Effect.fn.Return<void, GitHubError> {
          for (const label of labels) {
            yield* client
              .delete(`/repos/${owner}/${name}/issues/${number}/labels/${label}`)
              .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
          }
        },
      )

      const setLabels = Effect.fn('GitHubClient.setLabels')(
        function* (number: number, labels: Array<string>): Effect.fn.Return<void, GitHubError> {
          yield* client
            .put(`/repos/${owner}/${name}/issues/${number}/labels`, {
              body: HttpBody.unsafeJson({ labels }),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const addAssignees = Effect.fn('GitHubClient.addAssignees')(
        function* (number: number, assignees: Array<string>): Effect.fn.Return<void, GitHubError> {
          yield* client
            .post(`/repos/${owner}/${name}/issues/${number}/assignees`, {
              body: HttpBody.unsafeJson({ assignees }),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const removeAssignees = Effect.fn('GitHubClient.removeAssignees')(
        function* (number: number, assignees: Array<string>): Effect.fn.Return<void, GitHubError> {
          yield* client
            .delete(`/repos/${owner}/${name}/issues/${number}/assignees`, {
              body: HttpBody.unsafeJson({ assignees }),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const setMilestone = Effect.fn('GitHubClient.setMilestone')(
        function* (number: number, milestone: string): Effect.fn.Return<void, GitHubError> {
          yield* client
            .patch(`/repos/${owner}/${name}/issues/${number}`, {
              body: HttpBody.unsafeJson({ milestone }),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const clearMilestone = Effect.fn('GitHubClient.clearMilestone')(function* (number: number): Effect.fn.Return<void, GitHubError> {
        yield* client
          .patch(`/repos/${owner}/${name}/issues/${number}`, {
            body: HttpBody.unsafeJson({ milestone: null }),
          })
          .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
      })

      const lockIssue = Effect.fn('GitHubClient.lockIssue')(
        function* (number: number, reason?: string): Effect.fn.Return<void, GitHubError> {
          yield* client
            .put(`/repos/${owner}/${name}/issues/${number}/lock`, {
              body: HttpBody.unsafeJson({ lock_reason: reason }),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const unlockIssue = Effect.fn('GitHubClient.unlockIssue')(function* (number: number): Effect.fn.Return<void, GitHubError> {
        yield* client
          .delete(`/repos/${owner}/${name}/issues/${number}/lock`)
          .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
      })

      const requestReviewers = Effect.fn('GitHubClient.requestReviewers')(
        function* (number: number, reviewers: Array<string>): Effect.fn.Return<void, GitHubError> {
          yield* client
            .post(`/repos/${owner}/${name}/pulls/${number}/requested_reviewers`, {
              body: HttpBody.unsafeJson({ reviewers }),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const removeReviewers = Effect.fn('GitHubClient.removeReviewers')(
        function* (number: number, reviewers: Array<string>): Effect.fn.Return<void, GitHubError> {
          yield* client
            .delete(`/repos/${owner}/${name}/pulls/${number}/requested_reviewers`, {
              body: HttpBody.unsafeJson({ reviewers }),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const markReadyForReview = Effect.fn('GitHubClient.markReadyForReview')(
        function* (number: number): Effect.fn.Return<void, GitHubError> {
          yield* client
            .patch(`/repos/${owner}/${name}/pulls/${number}`, {
              body: HttpBody.unsafeJson({ draft: false }),
            })
            .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
        },
      )

      const convertToDraft = Effect.fn('GitHubClient.convertToDraft')(function* (number: number): Effect.fn.Return<void, GitHubError> {
        yield* client
          .post(`/repos/${owner}/${name}/pulls/${number}/convert-to-draft`)
          .pipe(Effect.mapError(toGitHubError), Effect.asVoid)
      })

      return GitHubClient.of({
        fetchRepo,
        fetchIssues,
        fetchIssue,
        fetchPullRequests,
        fetchPullRequest,
        fetchLabels,
        fetchMilestones,
        fetchIssueComments,
        fetchPullComments,
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
        convertToDraft,
      })
    }),
  )
}
