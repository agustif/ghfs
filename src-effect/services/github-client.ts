import type {
  HttpClientError,
} from '@effect/platform'
import type { Comment, Discussion, DiscussionCategory, Issue, Label, Milestone, MergeQueueEntry, PullRequest, Release, Repo, RepoPackage, TimelineEvent, WikiPage, Workflow } from '../domain'
import {
  HttpBody,
  HttpClient,
  HttpClientRequest,
} from '@effect/platform'
import { Context, DateTime, Effect, Layer, Redacted, Schedule } from 'effect'
import { Comment, Discussion, DiscussionCategory, GitHubError, Label, MergeQueueEntry, Milestone, ReactionSummary, Release, RepoPackage, TimelineEvent, WikiPage, Workflow } from '../domain'
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
    fetchTimeline: (
      number: number,
      params?: { page?: number; perPage?: number; subjectKind?: 'issue' | 'pull' },
    ) => Effect.Effect<Array<TimelineEvent>, GitHubError>
    fetchReleases: (params?: {
      page?: number
      perPage?: number
    }) => Effect.Effect<Array<Release>, GitHubError>
    fetchDiscussions: (params?: {
      after?: string | null
      first?: number
    }) => Effect.Effect<{
      discussions: Array<Discussion>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }, GitHubError>
    fetchDiscussionCategories: () => Effect.Effect<Array<DiscussionCategory>, GitHubError>
    fetchWikiPages: (params?: {
      page?: number
      perPage?: number
    }) => Effect.Effect<Array<WikiPage>, GitHubError>
    fetchWorkflows: (params?: {
      page?: number
      perPage?: number
    }) => Effect.Effect<Array<Workflow>, GitHubError>
    fetchMergeQueueEntries: (params?: {
      after?: string | null
      first?: number
    }) => Effect.Effect<{
      entries: Array<MergeQueueEntry>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }, GitHubError>
    fetchPackages: (params?: {
      page?: number
      perPage?: number
      packageType?: string
    }) => Effect.Effect<Array<RepoPackage>, GitHubError>
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

      type GitHubTimelineWire = {
        id?: number | string
        event?: string | null
        created_at?: string | null
        submitted_at?: string | null
        actor?: { login?: string | null } | null
        user?: { login?: string | null } | null
        sha?: string | null
        message?: string | null
        commit_url?: string | null
        author?: { name?: string | null; date?: string | null } | null
        committer?: { name?: string | null; date?: string | null } | null
        label?: { name?: string; color?: string | null } | null
        assignee?: { login?: string | null } | null
        rename?: { from?: string; to?: string } | null
        commit_id?: string | null
        state_reason?: string | null
        lock_reason?: string | null
        milestone?: { title?: string } | string | null
        requested_reviewer?: { login?: string | null } | null
        requested_team?: { name?: string | null } | null
        [key: string]: unknown
      }

      const KNOWN_TIMELINE_KINDS = new Set([
        'committed',
        'closed',
        'reopened',
        'merged',
        'labeled',
        'unlabeled',
        'assigned',
        'unassigned',
        'review_requested',
        'review_request_removed',
        'reviewed',
        'review_dismissed',
        'commented',
        'renamed',
        'milestoned',
        'demilestoned',
        'transferred',
        'base_ref_changed',
        'head_ref_force_pushed',
        'head_ref_deleted',
        'head_ref_restored',
        'locked',
        'unlocked',
        'ready_for_review',
        'convert_to_draft',
        'pinned',
        'unpinned',
        'mentioned',
        'subscribed',
        'unsubscribed',
        'cross-referenced',
        'connected',
        'disconnected',
      ] as const)

      function mapTimelineEvent(
        row: GitHubTimelineWire,
        subjectKind: 'issue' | 'pull',
        subjectNumber: number,
      ): TimelineEvent | null {
        const eventName = row.event
        if (!eventName) return null

        // committed events use commit shape (no id/created_at/actor).
        if (eventName === 'committed' && row.sha) {
          const createdAt = row.committer?.date ?? row.author?.date
          if (!createdAt) return null
          const fullMessage = row.message ?? ''
          const firstLine = fullMessage.split('\n', 1)[0] ?? ''
          return new TimelineEvent({
            id: `commit:${row.sha}`,
            kind: 'committed',
            createdAt: DateTime.fromDateUnsafe(new Date(createdAt)),
            ...(row.author?.name || row.committer?.name
              ? { actor: row.author?.name ?? row.committer?.name ?? undefined }
              : {}),
            subjectKind,
            subjectNumber,
            payload: {
              sha: row.sha,
              commitMessage: firstLine,
              body: fullMessage,
              ...(row.commit_url ? { commitUrl: row.commit_url } : {}),
            },
          })
        }

        const createdAt = row.created_at ?? row.submitted_at
        if (!createdAt) return null

        const id = row.id != null ? String(row.id) : `${eventName}:${createdAt}`
        const actor = row.actor?.login ?? row.user?.login ?? undefined
        const kind = KNOWN_TIMELINE_KINDS.has(eventName as never)
          ? (eventName as TimelineEvent['kind'])
          : 'unknown'

        const payload: Record<string, unknown> = {}
        if (kind === 'unknown') payload.rawKind = eventName
        if (row.label) payload.label = { name: row.label.name, color: row.label.color ?? '' }
        if (row.assignee?.login) payload.assignee = row.assignee.login
        if (row.rename?.from != null && row.rename?.to != null) {
          payload.rename = { from: row.rename.from, to: row.rename.to }
        }
        if (row.commit_id) payload.sha = row.commit_id
        if (row.commit_url) payload.commitUrl = row.commit_url
        if (row.state_reason) payload.stateReason = row.state_reason
        if (row.lock_reason) payload.lockReason = row.lock_reason
        if (row.milestone) {
          payload.milestone =
            typeof row.milestone === 'string' ? row.milestone : row.milestone.title
        }
        if (row.requested_reviewer?.login) payload.requestedReviewer = row.requested_reviewer.login
        else if (row.requested_team?.name) {
          payload.requestedReviewer = row.requested_team.name
          payload.isTeam = true
        }

        return new TimelineEvent({
          id,
          kind,
          createdAt: DateTime.fromDateUnsafe(new Date(createdAt)),
          ...(actor ? { actor } : {}),
          subjectKind,
          subjectNumber,
          ...(Object.keys(payload).length > 0 ? { payload } : {}),
        })
      }

      const fetchTimeline = Effect.fn('GitHubClient.fetchTimeline')(function* (
        number: number,
        params: {
          page?: number
          perPage?: number
          subjectKind?: 'issue' | 'pull'
        } = {},
      ): Effect.fn.Return<Array<TimelineEvent>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set('page', String(params.page))
        searchParams.set('per_page', String(params.perPage ?? 100))

        const subjectKind = params.subjectKind ?? 'issue'

        // Timeline API preview Accept (mockingbird); mirrors fetchPatch per-request override.
        const response = yield* client
          .get(`/repos/${owner}/${name}/issues/${number}/timeline?${searchParams.toString()}`, {
            headers: {
              Accept: 'application/vnd.github.mockingbird-preview+json',
            },
          })
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const rows = json as Array<GitHubTimelineWire>
        return rows.flatMap((row) => {
          const mapped = mapTimelineEvent(row, subjectKind, number)
          return mapped ? [mapped] : []
        })
      })


      type GitHubReleaseWire = {
        id: number
        tag_name: string
        name: string | null
        body: string | null
        draft?: boolean
        prerelease?: boolean
        // Legacy provider aliases — prefer draft/prerelease when present.
        isDraft?: boolean
        isPrerelease?: boolean
        created_at: string
        published_at: string | null
        author?: { login?: string | null } | null
        url?: string
        html_url?: string
      }

      function mapRelease(row: GitHubReleaseWire): Release {
        const htmlUrl = row.html_url ?? undefined
        // Prefer html_url for the required `url` (legacy sync-releases prints the clickable URL).
        const url = htmlUrl ?? row.url ?? ''
        const draft = row.draft ?? row.isDraft ?? false
        const prerelease = row.prerelease ?? row.isPrerelease ?? false

        return new Release({
          id: row.id,
          tagName: row.tag_name,
          name: row.name ?? null,
          author: row.author?.login ?? null,
          body: row.body ?? null,
          url,
          ...(htmlUrl ? { htmlUrl } : {}),
          draft,
          prerelease,
          createdAt: DateTime.fromDateUnsafe(new Date(row.created_at)),
          publishedAt: row.published_at
            ? DateTime.fromDateUnsafe(new Date(row.published_at))
            : null,
        })
      }

      const fetchReleases = Effect.fn('GitHubClient.fetchReleases')(function* (params: {
        page?: number
        perPage?: number
      } = {}): Effect.fn.Return<Array<Release>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set('page', String(params.page))
        searchParams.set('per_page', String(params.perPage ?? 100))

        const response = yield* client
          .get(`/repos/${owner}/${name}/releases?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const rows = json as Array<GitHubReleaseWire>
        return rows.map(mapRelease)
      }

      const DISCUSSIONS_QUERY = `
  query RepoDiscussions($owner: String!, $name: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      discussions(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          number
          title
          body
          url
          locked
          upvoteCount
          createdAt
          updatedAt
          closedAt
          answerChosenAt
          author { login }
          answerChosenBy { login }
          category { id name }
          labels(first: 20) {
            nodes { name color }
          }
        }
      }
    }
  }
`

      const DISCUSSION_CATEGORIES_QUERY = `
  query DiscussionCategories($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      discussionCategories(first: 100) {
        nodes {
          id
          name
          slug
          description
          isAnswerable
        }
      }
    }
  }
`

      type GqlDiscussionNode = {
        id: string
        number: number
        title: string
        body: string | null
        url: string | null
        locked: boolean
        upvoteCount: number
        createdAt: string
        updatedAt: string
        closedAt: string | null
        answerChosenAt: string | null
        author?: { login?: string | null } | null
        answerChosenBy?: { login?: string | null } | null
        category?: { id?: string | null; name?: string | null } | null
        labels?: { nodes?: Array<{ name: string; color: string }> | null } | null
      }

      type GqlDiscussionsResponse = {
        data?: {
          repository?: {
            discussions?: {
              pageInfo: { hasNextPage: boolean; endCursor: string | null }
              nodes: Array<GqlDiscussionNode | null>
            } | null
          } | null
        }
        errors?: Array<{ message: string }>
      }

      function mapDiscussion(node: GqlDiscussionNode): Discussion {
        const categoryId = node.category?.id ?? undefined
        const categoryName = node.category?.name ?? undefined
        return new Discussion({
          id: node.id,
          number: node.number,
          title: node.title,
          author: node.author?.login ?? null,
          body: node.body ?? null,
          url: node.url ?? null,
          ...(categoryId ? { categoryId } : {}),
          ...(categoryName ? { categoryName } : {}),
          locked: node.locked ?? false,
          upvoteCount: node.upvoteCount ?? 0,
          createdAt: DateTime.fromDateUnsafe(new Date(node.createdAt)),
          updatedAt: DateTime.fromDateUnsafe(new Date(node.updatedAt)),
          closedAt: node.closedAt
            ? DateTime.fromDateUnsafe(new Date(node.closedAt))
            : null,
          answerChosenAt: node.answerChosenAt
            ? DateTime.fromDateUnsafe(new Date(node.answerChosenAt))
            : null,
          answerChosenBy: node.answerChosenBy?.login ?? null,
          labels: (node.labels?.nodes ?? []).map((l) => ({
            name: l.name,
            color: l.color,
          })),
        })
      }

      const graphql = Effect.fn('GitHubClient.graphql')(function* (
        query: string,
        variables: Record<string, unknown>,
      ): Effect.fn.Return<unknown, GitHubError> {
        const response = yield* client
          .post('/graphql', {
            body: HttpBody.unsafeJson({ query, variables }),
          })
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        return json
      })

      const fetchDiscussions = Effect.fn('GitHubClient.fetchDiscussions')(function* (params: {
        after?: string | null
        first?: number
      } = {}): Effect.fn.Return<{
        discussions: Array<Discussion>
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }, GitHubError> {
        const json = (yield* graphql(DISCUSSIONS_QUERY, {
          owner,
          name,
          first: params.first ?? 100,
          after: params.after ?? null,
        })) as GqlDiscussionsResponse

        if (json.errors?.length) {
          return yield* Effect.fail(
            new GitHubError({
              status: 200,
              message: json.errors.map((e) => e.message).join('; '),
              details: 'GraphQL errors on repository.discussions',
            }),
          )
        }

        const connection = json.data?.repository?.discussions
        const nodes = (connection?.nodes ?? []).filter(
          (n): n is GqlDiscussionNode => n != null,
        )
        return {
          discussions: nodes.map(mapDiscussion),
          pageInfo: {
            hasNextPage: connection?.pageInfo.hasNextPage ?? false,
            endCursor: connection?.pageInfo.endCursor ?? null,
          },
        }
      })

      const fetchDiscussionCategories = Effect.fn('GitHubClient.fetchDiscussionCategories')(function* (): Effect.fn.Return<Array<DiscussionCategory>, GitHubError> {
        const json = (yield* graphql(DISCUSSION_CATEGORIES_QUERY, {
          owner,
          name,
        })) as {
          data?: {
            repository?: {
              discussionCategories?: {
                nodes: Array<{
                  id: string
                  name: string
                  slug: string
                  description: string | null
                  isAnswerable: boolean
                } | null>
              } | null
            } | null
          }
          errors?: Array<{ message: string }>
        }

        if (json.errors?.length) {
          return yield* Effect.fail(
            new GitHubError({
              status: 200,
              message: json.errors.map((e) => e.message).join('; '),
              details: 'GraphQL errors on repository.discussionCategories',
            }),
          )
        }

        return (json.data?.repository?.discussionCategories?.nodes ?? [])
          .filter((n): n is NonNullable<typeof n> => n != null)
          .map(
            (n) =>
              new DiscussionCategory({
                id: n.id,
                name: n.name,
                slug: n.slug,
                description: n.description ?? null,
                isAnswerable: n.isAnswerable,
              }),
          )
      })



      type GitHubContentsEntry = {
        name: string
        path: string
        type: "file" | "dir" | string
        sha?: string
        size?: number
        html_url?: string | null
        download_url?: string | null
        encoding?: string
        content?: string
      }

      function pageNameFromFile(fileName: string): string {
        return fileName.replace(/\.md$/i, "")
      }

      function titleFromName(name: string): string {
        return name.replace(/-/g, " ")
      }

      function decodeBase64Content(content: string | undefined): string | null {
        if (!content) return null
        try {
          return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8")
        } catch {
          return null
        }
      }

      function mapWikiPage(
        entry: GitHubContentsEntry,
        body: string | null,
      ): WikiPage {
        const name = pageNameFromFile(entry.name)
        const htmlUrl = entry.html_url ?? undefined
        return new WikiPage({
          name,
          title: titleFromName(name),
          content: body,
          author: null, // Contents API has no author; git-clone fallback can fill
          updatedAt: null, // likewise — history follow-up
          ...(htmlUrl ? { htmlUrl } : {}),
        })
      }

      function slicePage<A>(
        all: Array<A>,
        page: number,
        perPage: number,
      ): Array<A> {
        const p = Math.max(1, page)
        const start = (p - 1) * perPage
        return all.slice(start, start + perPage)
      }

      const fetchWikiPages = Effect.fn("GitHubClient.fetchWikiPages")(function* (params: {
        page?: number
        perPage?: number
      } = {}): Effect.fn.Return<Array<WikiPage>, GitHubError> {
        const page = params.page ?? 1
        const perPage = params.perPage ?? 100
        const wikiRepo = `${name}.wiki`

        // List root of the wiki sibling repo (list-all; not server-paginated).
        const listResponse = yield* client
          .get(`/repos/${owner}/${wikiRepo}/contents/`)
          .pipe(Effect.mapError(toGitHubError))
        const listJson = yield* listResponse.json.pipe(Effect.mapError(toGitHubError))
        const entries = (Array.isArray(listJson) ? listJson : []) as Array<GitHubContentsEntry>

        const mdFiles = entries.filter(
          (e) =>
            e.type === "file" &&
            (e.name.toLowerCase().endsWith(".md") || e.name === "Home"),
        )

        const all: Array<WikiPage> = []
        for (const entry of mdFiles) {
          const fileResponse = yield* client
            .get(`/repos/${owner}/${wikiRepo}/contents/${encodeURIComponent(entry.path)}`)
            .pipe(Effect.mapError(toGitHubError))
          const fileJson = (yield* fileResponse.json.pipe(
            Effect.mapError(toGitHubError),
          )) as GitHubContentsEntry
          const body =
            fileJson.encoding === "base64"
              ? decodeBase64Content(fileJson.content)
              : (fileJson.content ?? null)
          all.push(mapWikiPage({ ...entry, html_url: fileJson.html_url ?? entry.html_url }, body))
        }

        // Client-side page slice so SyncWiki Stream.paginate stays uniform.
        return slicePage(all, page, perPage)
      })


      type GitHubWorkflowWire = {
        id: number
        node_id?: string
        name: string
        path: string
        state: string
        created_at: string
        updated_at: string
        html_url?: string
        badge_url?: string
        url?: string
      }

      type GitHubWorkflowsListResponse = {
        total_count?: number
        workflows: Array<GitHubWorkflowWire>
      }

      function mapWorkflow(row: GitHubWorkflowWire): Workflow {
        const nodeId = row.node_id ?? undefined
        const htmlUrl = row.html_url ?? undefined
        const badgeUrl = row.badge_url ?? undefined

        return new Workflow({
          id: row.id,
          ...(nodeId ? { nodeId } : {}),
          name: row.name,
          path: row.path,
          state: row.state,
          createdAt: DateTime.fromDateUnsafe(new Date(row.created_at)),
          updatedAt: DateTime.fromDateUnsafe(new Date(row.updated_at)),
          ...(htmlUrl ? { htmlUrl } : {}),
          ...(badgeUrl ? { badgeUrl } : {}),
        })
      }

      const fetchWorkflows = Effect.fn("GitHubClient.fetchWorkflows")(function* (params: {
        page?: number
        perPage?: number
      } = {}): Effect.fn.Return<Array<Workflow>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set("page", String(params.page))
        searchParams.set("per_page", String(params.perPage ?? 100))

        const response = yield* client
          .get(`/repos/${owner}/${name}/actions/workflows?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const body = json as GitHubWorkflowsListResponse
        const rows = Array.isArray(body.workflows) ? body.workflows : []
        return rows.map(mapWorkflow)
      })


      const MERGE_QUEUE_ENTRIES_QUERY = `
  query MergeQueueEntries($owner: String!, $name: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      mergeQueue {
        entries(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            position
            state
            enqueuedAt
            estimatedTimeToMerge
            baseCommit {
              oid
            }
            headCommit {
              oid
            }
            pullRequest {
              number
              title
              url
              author { login }
            }
          }
        }
      }
    }
  }
`

      type GqlMergeQueueNode = {
        position: number
        state: string
        enqueuedAt: string
        estimatedTimeToMerge: number | string | null
        baseCommit?: { oid?: string | null } | null
        headCommit?: { oid?: string | null } | null
        pullRequest: {
          number: number
          title: string
          url?: string | null
          author?: { login?: string | null } | null
        }
      }

      type GqlMergeQueueResponse = {
        data?: {
          repository?: {
            mergeQueue?: {
              entries?: {
                pageInfo: { hasNextPage: boolean; endCursor: string | null }
                nodes: Array<GqlMergeQueueNode | null>
              } | null
            } | null
          } | null
        }
        errors?: Array<{ message: string }>
      }

      function mapEstimatedTimeToMerge(
        value: number | string | null | undefined,
      ): string | null | undefined {
        if (value === undefined) return undefined
        if (value === null) return null
        return String(value)
      }

      function mapMergeQueueEntry(node: GqlMergeQueueNode): MergeQueueEntry {
        const estimatedTimeToMerge = mapEstimatedTimeToMerge(node.estimatedTimeToMerge)
        const baseSha = node.baseCommit?.oid ?? null
        const headSha = node.headCommit?.oid ?? null

        return new MergeQueueEntry({
          position: node.position,
          state: node.state,
          enqueuedAt: DateTime.fromDateUnsafe(new Date(node.enqueuedAt)),
          ...(estimatedTimeToMerge !== undefined ? { estimatedTimeToMerge } : {}),
          pullRequestNumber: node.pullRequest.number,
          pullRequestTitle: node.pullRequest.title,
          pullRequestAuthor: node.pullRequest.author?.login ?? null,
          pullRequestUrl: node.pullRequest.url ?? null,
          ...(baseSha !== undefined ? { baseSha } : {}),
          ...(headSha !== undefined ? { headSha } : {}),
        })
      }

      const fetchMergeQueueEntries = Effect.fn('GitHubClient.fetchMergeQueueEntries')(function* (params: {
        after?: string | null
        first?: number
      } = {}): Effect.fn.Return<{
        entries: Array<MergeQueueEntry>
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }, GitHubError> {
        const json = (yield* graphql(MERGE_QUEUE_ENTRIES_QUERY, {
          owner,
          name,
          first: params.first ?? 100,
          after: params.after ?? null,
        })) as GqlMergeQueueResponse

        if (json.errors?.length) {
          return yield* Effect.fail(
            new GitHubError({
              status: 200,
              message: json.errors.map((e) => e.message).join('; '),
              details: 'GraphQL errors on repository.mergeQueue.entries',
            }),
          )
        }

        // No merge queue configured → empty page (not an error).
        const connection = json.data?.repository?.mergeQueue?.entries
        if (!json.data?.repository?.mergeQueue) {
          return {
            entries: [],
            pageInfo: { hasNextPage: false, endCursor: null },
          }
        }

        const nodes = (connection?.nodes ?? []).filter(
          (n): n is GqlMergeQueueNode => n != null,
        )
        return {
          entries: nodes.map(mapMergeQueueEntry),
          pageInfo: {
            hasNextPage: connection?.pageInfo.hasNextPage ?? false,
            endCursor: connection?.pageInfo.endCursor ?? null,
          },
        }
      })

      const KNOWN_PACKAGE_TYPES = [
        "npm",
        "maven",
        "rubygems",
        "docker",
        "nuget",
        "container",
      ] as const

      type GitHubPackageWire = {
        id?: number
        name: string
        package_type: string
        visibility?: string
        created_at: string
        updated_at: string
        html_url?: string
        url?: string
        owner?: { login?: string | null } | null
        repository?: { full_name?: string | null } | null
      }

      function mapPackage(row: GitHubPackageWire, fallbackOwner: string): RepoPackage {
        const htmlUrl = row.html_url ?? undefined
        const fullName = row.repository?.full_name ?? undefined
        const ownerLogin = row.owner?.login ?? fallbackOwner

        return new RepoPackage({
          name: row.name,
          packageType: row.package_type,
          visibility: row.visibility ?? "private",
          owner: ownerLogin,
          createdAt: DateTime.fromDateUnsafe(new Date(row.created_at)),
          updatedAt: DateTime.fromDateUnsafe(new Date(row.updated_at)),
          ...(htmlUrl ? { htmlUrl } : {}),
          ...(fullName ? { repository: { fullName } } : {}),
        })
      }

      const fetchPackagesForType = Effect.fn("GitHubClient.fetchPackagesForType")(
        function* (params: {
          packageType: string
          page?: number
          perPage?: number
        }): Effect.fn.Return<Array<RepoPackage>, GitHubError> {
          const searchParams = new URLSearchParams()
          searchParams.set("package_type", params.packageType)
          if (params.page) searchParams.set("page", String(params.page))
          searchParams.set("per_page", String(params.perPage ?? 100))

          // Prefer org-scoped list (Packages are often org/user scoped; org = repo owner).
          const orgPath = `/orgs/${owner}/packages?${searchParams.toString()}`
          const userPath = `/users/${owner}/packages?${searchParams.toString()}`

          const tryGet = (path: string) =>
            client.get(path).pipe(Effect.mapError(toGitHubError))

          const response = yield* tryGet(orgPath).pipe(
            Effect.catchAll(() => tryGet(userPath)),
          )
          const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
          const rows = (Array.isArray(json) ? json : []) as Array<GitHubPackageWire>
          return rows.map((row) => mapPackage(row, owner))
        },
      )

      const fetchPackages = Effect.fn("GitHubClient.fetchPackages")(function* (params: {
        page?: number
        perPage?: number
        packageType?: string
      } = {}): Effect.fn.Return<Array<RepoPackage>, GitHubError> {
        const types = params.packageType
          ? [params.packageType]
          : [...KNOWN_PACKAGE_TYPES]

        const pages = yield* Effect.forEach(
          types,
          (packageType) =>
            fetchPackagesForType({
              packageType,
              page: params.page,
              perPage: params.perPage,
            }).pipe(
              // Missing registry / 404 for a type → empty page (keep SyncPackages resilient).
              Effect.catchAll(() => Effect.succeed([] as Array<RepoPackage>)),
            ),
          { concurrency: 1 },
        )

        return pages.flat()
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
        fetchTimeline,
        fetchReleases,
        fetchDiscussions,
        fetchDiscussionCategories,
        fetchWikiPages,
        fetchWorkflows,
        fetchMergeQueueEntries,
        fetchPackages,
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
