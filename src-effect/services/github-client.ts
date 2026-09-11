import type {
  HttpClientError,
} from '@effect/platform'
import type { ActivityEventInput, AuthenticatedUserInput, Autolink, RuleSuite, CodeownersFile, DeploymentInput, CodeScanningAlertLean, Collaborator, Comment, DependabotAlertLean, Discussion, DiscussionCategory, InteractionLimits, Issue, Label, Milestone, MergeQueueEntry, PagesBuild, Person, ProjectV2, PullRequest, Release, Repo, RepoMetadata, RepoPackage, RepoSecurityAdvisory, SecretScanningAlertLean, Sponsorship, Team, TimelineEvent, Webhook, WikiPage, Workflow } from '../domain'
import {
  HttpBody,
  HttpClient,
  HttpClientRequest,
} from '@effect/platform'
import { Context, DateTime, Effect, Layer, Redacted, Schedule } from 'effect'
import { Autolink, RuleSuite, CodeownersFile, CodeownersRule, CodeScanningAlertLean, Collaborator, Comment, DependabotAlertLean, Discussion, DiscussionCategory, GitHubError, InteractionLimits, Label, MergeQueueEntry, Milestone, PagesBuild, Person, ProjectV2, ReactionSummary, Release, RepoMetadata, RepoPackage, RepoSecurityAdvisory, SecretScanningAlertLean, Sponsorship, Team, TimelineEvent, Webhook, WikiPage, Workflow } from '../domain'
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
    fetchContributors: (params?: {
      page?: number
      perPage?: number
    }) => Effect.Effect<Array<Person>, GitHubError>
    fetchTeams: (params?: {
      page?: number
      after?: string | null
      perPage?: number
      first?: number
    }) => Effect.Effect<{
      teams: Array<Team>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }, GitHubError>
    fetchCollaborators: (params?: {
      page?: number
      perPage?: number
    }) => Effect.Effect<Array<Collaborator>, GitHubError>
    fetchCodeowners: () => Effect.Effect<CodeownersFile | null, GitHubError>
    fetchProjectsV2: (params?: {
      after?: string | null
      first?: number
    }) => Effect.Effect<{
      projects: Array<ProjectV2>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }, GitHubError>
    fetchPagesBuilds: (params?: {
      page?: number
      perPage?: number
    }) => Effect.Effect<Array<PagesBuild>, GitHubError>
    fetchSponsorships: (params?: {
      after?: string | null
      first?: number
    }) => Effect.Effect<{
      sponsorships: Array<Sponsorship>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }, GitHubError>
    fetchActionsWebhooks: (params?: {
      page?: number
      perPage?: number
    }) => Effect.Effect<Array<Webhook>, GitHubError>
    fetchInteractionLimits: () => Effect.Effect<InteractionLimits, GitHubError>
    fetchRepository: () => Effect.Effect<RepoMetadata, GitHubError>
    fetchSecurityAdvisories: () => Effect.Effect<Array<RepoSecurityAdvisory>, GitHubError>
    fetchDependabotAlerts: (params?: {
      limit?: number
    }) => Effect.Effect<Array<DependabotAlertLean>, GitHubError>
    fetchCodeScanningAlerts: (params?: {
      limit?: number
    }) => Effect.Effect<Array<CodeScanningAlertLean>, GitHubError>
    fetchSecretScanningAlerts: (params?: {
      limit?: number
    }) => Effect.Effect<Array<SecretScanningAlertLean>, GitHubError>
    fetchActivityEvents: (params?: {
      limit?: number
    }) => Effect.Effect<Array<ActivityEventInput>, GitHubError>
    fetchDeployments: (params?: {
      perPage?: number
    }) => Effect.Effect<Array<DeploymentInput>, GitHubError>
    fetchAuthenticatedUser: () => Effect.Effect<AuthenticatedUserInput | null, GitHubError>
    fetchAutolinks: () => Effect.Effect<Array<Autolink>, GitHubError>
    fetchRuleSuites: (params?: {
      limit?: number
    }) => Effect.Effect<Array<RuleSuite>, GitHubError>
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


      type GitHubContributorWire = {
        login?: string | null
        id?: number
        avatar_url?: string | null
        html_url?: string | null
        url?: string | null
        type?: string | null
        contributions?: number | null
        name?: string | null
      }

      function normalizePersonType(raw: string | null | undefined): string | undefined {
        if (raw == null || raw === "") return undefined
        const lower = raw.toLowerCase()
        if (lower === "user" || lower === "bot") return lower
        return raw
      }

      function mapContributor(row: GitHubContributorWire): Person | null {
        const login = row.login?.trim()
        if (!login) return null

        const avatarUrl = row.avatar_url ?? null
        const htmlUrl = row.html_url ?? undefined
        const contributions =
          typeof row.contributions === "number" ? row.contributions : undefined
        const type = normalizePersonType(row.type ?? undefined)
        const name = row.name ?? null

        return new Person({
          login,
          name,
          avatarUrl,
          ...(htmlUrl ? { htmlUrl } : {}),
          ...(contributions !== undefined ? { contributions } : {}),
          ...(type ? { type } : {}),
        })
      }

      const fetchContributors = Effect.fn("GitHubClient.fetchContributors")(function* (params: {
        page?: number
        perPage?: number
      } = {}): Effect.fn.Return<Array<Person>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set("page", String(params.page))
        searchParams.set("per_page", String(params.perPage ?? 100))

        const response = yield* client
          .get(`/repos/${owner}/${name}/contributors?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const rows = (Array.isArray(json) ? json : []) as Array<GitHubContributorWire>
        return rows.flatMap((row) => {
          const person = mapContributor(row)
          return person ? [person] : []
        })
      })


      const ORG_TEAMS_QUERY = `
  query OrgTeams($owner: String!, $first: Int!, $after: String) {
    organization(login: $owner) {
      teams(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          slug
          name
          description
          privacy
          url
          members {
            totalCount
          }
          repositories {
            totalCount
          }
          createdAt
          updatedAt
        }
      }
    }
  }
`

      type GqlTeamNode = {
        id: string
        slug: string
        name: string
        description: string | null
        privacy: string
        url: string
        members?: { totalCount?: number | null } | null
        repositories?: { totalCount?: number | null } | null
        createdAt: string
        updatedAt: string
      }

      type GqlOrgTeamsResponse = {
        data?: {
          organization?: {
            teams?: {
              pageInfo: { hasNextPage: boolean; endCursor: string | null }
              nodes: Array<GqlTeamNode | null>
            } | null
          } | null
        }
        errors?: Array<{ message: string }>
      }

      type GitHubRestTeamWire = {
        id?: number
        node_id?: string | null
        slug?: string | null
        name?: string | null
        description?: string | null
        privacy?: string | null
        html_url?: string | null
        url?: string | null
        members_count?: number | null
        repositories_count?: number | null
        created_at?: string | null
        updated_at?: string | null
      }

      function normalizeTeamPrivacy(raw: string | null | undefined): string {
        if (raw == null || raw === "") return "closed"
        const lower = raw.toLowerCase()
        if (lower === "secret" || lower === "closed" || lower === "visible") return lower
        return raw
      }

      function mapGqlTeam(node: GqlTeamNode): Team {
        return new Team({
          id: node.id,
          slug: node.slug,
          name: node.name,
          privacy: normalizeTeamPrivacy(node.privacy),
          membersCount: node.members?.totalCount ?? 0,
          repositoriesCount: node.repositories?.totalCount ?? 0,
          createdAt: DateTime.fromDateUnsafe(new Date(node.createdAt)),
          updatedAt: DateTime.fromDateUnsafe(new Date(node.updatedAt)),
          url: node.url,
          description: node.description ?? null,
        })
      }

      const TEAM_EPOCH = DateTime.fromDateUnsafe(new Date(0))

      function mapRestTeam(row: GitHubRestTeamWire): Team | null {
        const slug = row.slug?.trim()
        const name = row.name?.trim()
        if (!slug || !name) return null

        const id =
          row.node_id?.trim() ||
          (typeof row.id === "number" ? String(row.id) : null)
        if (!id) return null

        const url = row.html_url ?? row.url ?? `https://github.com/orgs/${owner}/teams/${slug}`
        const createdAt = row.created_at
          ? DateTime.fromDateUnsafe(new Date(row.created_at))
          : TEAM_EPOCH
        const updatedAt = row.updated_at
          ? DateTime.fromDateUnsafe(new Date(row.updated_at))
          : TEAM_EPOCH

        return new Team({
          id,
          slug,
          name,
          privacy: normalizeTeamPrivacy(row.privacy),
          membersCount: typeof row.members_count === "number" ? row.members_count : 0,
          repositoriesCount:
            typeof row.repositories_count === "number" ? row.repositories_count : 0,
          createdAt,
          updatedAt,
          url,
          description: row.description ?? null,
        })
      }

      const fetchTeamsGraphql = Effect.fn("GitHubClient.fetchTeamsGraphql")(function* (params: {
        after?: string | null
        first?: number
      }): Effect.fn.Return<{
        teams: Array<Team>
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }, GitHubError> {
        const first = params.first ?? 100
        const json = (yield* graphql(ORG_TEAMS_QUERY, {
          owner,
          first,
          after: params.after ?? null,
        })) as GqlOrgTeamsResponse

        if (json.errors?.length) {
          return yield* Effect.fail(
            new GitHubError({
              status: 200,
              message: json.errors.map((e) => e.message).join("; "),
              details: "GraphQL errors on organization.teams",
            }),
          )
        }

        // User/personal owners have no organization → empty page (keep SyncTeams resilient).
        const connection = json.data?.organization?.teams
        if (!connection) {
          return {
            teams: [],
            pageInfo: { hasNextPage: false, endCursor: null },
          }
        }

        const teams = (connection.nodes ?? []).flatMap((node) =>
          node ? [mapGqlTeam(node)] : [],
        )
        return {
          teams,
          pageInfo: {
            hasNextPage: connection.pageInfo.hasNextPage,
            endCursor: connection.pageInfo.endCursor,
          },
        }
      })

      const fetchTeamsRest = Effect.fn("GitHubClient.fetchTeamsRest")(function* (params: {
        page?: number
        perPage?: number
      }): Effect.fn.Return<{
        teams: Array<Team>
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }, GitHubError> {
        const perPage = params.perPage ?? 100
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set("page", String(params.page))
        searchParams.set("per_page", String(perPage))

        const response = yield* client
          .get(`/orgs/${owner}/teams?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const rows = (Array.isArray(json) ? json : []) as Array<GitHubRestTeamWire>
        const teams = rows.flatMap((row) => {
          const team = mapRestTeam(row)
          return team ? [team] : []
        })

        // REST has no endCursor — synthesize hasNextPage from page fullness.
        return {
          teams,
          pageInfo: {
            hasNextPage: teams.length >= perPage,
            endCursor: null,
          },
        }
      })

      const fetchTeams = Effect.fn("GitHubClient.fetchTeams")(function* (params: {
        page?: number
        after?: string | null
        perPage?: number
        first?: number
      } = {}): Effect.fn.Return<{
        teams: Array<Team>
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }, GitHubError> {
        // Prefer GraphQL cursor unless caller explicitly asks for REST `page`.
        if (params.page != null && params.after == null) {
          return yield* fetchTeamsRest({
            page: params.page,
            perPage: params.perPage ?? params.first,
          })
        }
        return yield* fetchTeamsGraphql({
          after: params.after ?? null,
          first: params.first ?? params.perPage,
        })
      })


      type GitHubCollaboratorWire = {
        login?: string | null
        id?: number
        avatar_url?: string | null
        name?: string | null
        permission?: string | null
        role_name?: string | null
        permissions?: {
          admin?: boolean
          maintain?: boolean
          push?: boolean
          triage?: boolean
          pull?: boolean
        } | null
      }

      function deriveCollaboratorPermission(
        wirePermission: string | null | undefined,
        flags: GitHubCollaboratorWire["permissions"]
      ): string | null {
        if (wirePermission != null && wirePermission !== "") return wirePermission
        if (!flags) return null
        if (flags.admin) return "admin"
        if (flags.maintain) return "maintain"
        if (flags.push) return "push"
        if (flags.triage) return "triage"
        if (flags.pull) return "pull"
        return null
      }

      function mapCollaborator(row: GitHubCollaboratorWire): Collaborator | null {
        const login = row.login?.trim()
        if (!login) return null

        const avatarUrl = row.avatar_url ?? null
        const name = row.name ?? null
        const permission = deriveCollaboratorPermission(row.permission, row.permissions)
        const roleName = row.role_name ?? null

        const flags = row.permissions
        const permissions =
          flags &&
          typeof flags.admin === "boolean" &&
          typeof flags.maintain === "boolean" &&
          typeof flags.push === "boolean" &&
          typeof flags.triage === "boolean" &&
          typeof flags.pull === "boolean"
            ? {
                admin: flags.admin,
                maintain: flags.maintain,
                push: flags.push,
                triage: flags.triage,
                pull: flags.pull,
              }
            : undefined

        return new Collaborator({
          login,
          name,
          avatarUrl,
          permission,
          ...(roleName !== undefined ? { roleName } : {}),
          ...(permissions ? { permissions } : {}),
        })
      }

      const fetchCollaborators = Effect.fn("GitHubClient.fetchCollaborators")(function* (params: {
        page?: number
        perPage?: number
      } = {}): Effect.fn.Return<Array<Collaborator>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set("page", String(params.page))
        searchParams.set("per_page", String(params.perPage ?? 100))

        const response = yield* client
          .get(`/repos/${owner}/${name}/collaborators?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const rows = (Array.isArray(json) ? json : []) as Array<GitHubCollaboratorWire>
        return rows.flatMap((row) => {
          const collaborator = mapCollaborator(row)
          return collaborator ? [collaborator] : []
        })
      })

      const CODEOWNERS_CANDIDATE_PATHS = [
        "CODEOWNERS",
        ".github/CODEOWNERS",
        "docs/CODEOWNERS",
      ] as const

      type GitHubContentsFileWire = {
        type?: string
        path?: string
        name?: string
        encoding?: string
        content?: string
        html_url?: string | null
      }

      function decodeBase64Content(content: string | undefined): string | null {
        if (!content) return null
        try {
          return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8")
        } catch {
          return null
        }
      }

      function parseCodeownersRules(content: string): Array<CodeownersRule> {
        const rules: Array<CodeownersRule> = []
        for (const line of content.split("\n")) {
          const trimmed = line.trim()
          if (trimmed === "" || trimmed.startsWith("#")) continue
          const parts = trimmed.split(/\s+/)
          if (parts.length < 2) continue
          const pattern = parts[0]!
          const owners = parts.slice(1).filter((o) => o.startsWith("@"))
          if (owners.length === 0) continue
          rules.push(new CodeownersRule({ pattern, owners }))
        }
        return rules
      }

      function tryFetchCodeownersAt(
        candidatePath: string
      ): Effect.Effect<CodeownersFile | null, GitHubError> {
        return Effect.gen(function* () {
          const response = yield* client
            .get(`/repos/${owner}/${name}/contents/${candidatePath}`)
            .pipe(Effect.mapError(toGitHubError))
          const json = (yield* response.json.pipe(
            Effect.mapError(toGitHubError)
          )) as GitHubContentsFileWire

          // Directory listing (array) or non-file → treat as miss.
          if (Array.isArray(json) || json.type !== "file") {
            return null
          }

          const raw =
            json.encoding === "base64"
              ? decodeBase64Content(json.content)
              : (json.content ?? null)
          if (raw == null) return null

          const rules = parseCodeownersRules(raw)
          return new CodeownersFile({
            path: json.path ?? candidatePath,
            rules,
            raw,
          })
        }).pipe(
          Effect.catchIf(
            (error): error is GitHubError =>
              error instanceof GitHubError && error.status === 404,
            () => Effect.succeed(null)
          )
        )
      }

      const fetchCodeowners = Effect.fn("GitHubClient.fetchCodeowners")(
        function* (): Effect.fn.Return<CodeownersFile | null, GitHubError> {
          for (const candidatePath of CODEOWNERS_CANDIDATE_PATHS) {
            const found = yield* tryFetchCodeownersAt(candidatePath)
            if (found) return found
          }
          return null
        }
      )

      const PROJECTS_V2_QUERY = `
  query ProjectsV2($owner: String!, $name: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      projectsV2(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          number
          title
          shortDescription
          public
          closed
          url
          createdAt
          updatedAt
          closedAt
          owner {
            ... on Organization {
              login
            }
            ... on User {
              login
            }
          }
        }
      }
    }
  }
`

      type GqlProjectV2Node = {
        id: string
        number: number
        title: string
        shortDescription: string | null
        public: boolean
        closed: boolean
        url: string
        createdAt: string
        updatedAt: string
        closedAt: string | null
        owner?: { login?: string | null } | null
      }

      type GqlProjectsV2Response = {
        data?: {
          repository?: {
            projectsV2?: {
              pageInfo: { hasNextPage: boolean; endCursor: string | null }
              nodes: Array<GqlProjectV2Node | null>
            } | null
          } | null
        }
        errors?: Array<{ message: string }>
      }

      function mapProjectV2(node: GqlProjectV2Node): ProjectV2 {
        return new ProjectV2({
          id: node.id,
          number: node.number,
          title: node.title,
          url: node.url,
          closed: node.closed ?? false,
          public: node.public ?? false,
          shortDescription: node.shortDescription ?? null,
          createdAt: DateTime.fromDateUnsafe(new Date(node.createdAt)),
          updatedAt: DateTime.fromDateUnsafe(new Date(node.updatedAt)),
          closedAt: node.closedAt
            ? DateTime.fromDateUnsafe(new Date(node.closedAt))
            : null,
          ownerLogin: node.owner?.login ?? "",
        })
      }

      const fetchProjectsV2 = Effect.fn("GitHubClient.fetchProjectsV2")(function* (params: {
        after?: string | null
        first?: number
      } = {}): Effect.fn.Return<{
        projects: Array<ProjectV2>
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }, GitHubError> {
        const json = (yield* graphql(PROJECTS_V2_QUERY, {
          owner,
          name,
          first: params.first ?? 100,
          after: params.after ?? null,
        })) as GqlProjectsV2Response

        if (json.errors?.length) {
          return yield* Effect.fail(
            new GitHubError({
              status: 200,
              message: json.errors.map((e) => e.message).join("; "),
              details: "GraphQL errors on repository.projectsV2",
            }),
          )
        }

        const connection = json.data?.repository?.projectsV2
        const nodes = (connection?.nodes ?? []).filter(
          (n): n is GqlProjectV2Node => n != null,
        )
        return {
          projects: nodes.map(mapProjectV2),
          pageInfo: {
            hasNextPage: connection?.pageInfo.hasNextPage ?? false,
            endCursor: connection?.pageInfo.endCursor ?? null,
          },
        }
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


      type GitHubPagesBuildWire = {
        url?: string | null
        status?: string | null
        error?: { message?: string | null } | null
        commit?: string | null
        duration?: number | null
        created_at?: string | null
        updated_at?: string | null
        pusher?: {
          login?: string | null
          avatar_url?: string | null
        } | null
      }

      function mapPagesBuild(row: GitHubPagesBuildWire): PagesBuild | null {
        const url = row.url?.trim()
        const commit = row.commit?.trim()
        const createdAt = row.created_at
        const updatedAt = row.updated_at
        if (!url || !commit || !createdAt || !updatedAt) return null

        const error =
          row.error && typeof row.error === "object"
            ? { message: row.error.message ?? null }
            : undefined

        const pusherLogin = row.pusher?.login?.trim()
        const pusher =
          pusherLogin
            ? {
                login: pusherLogin,
                ...(row.pusher?.avatar_url
                  ? { avatarUrl: row.pusher.avatar_url }
                  : {}),
              }
            : null

        return new PagesBuild({
          url,
          status: row.status ?? null,
          ...(error ? { error } : {}),
          commit,
          duration: row.duration ?? null,
          createdAt: DateTime.fromDateUnsafe(new Date(createdAt)),
          updatedAt: DateTime.fromDateUnsafe(new Date(updatedAt)),
          pusher,
        })
      }

      const fetchPagesBuilds = Effect.fn("GitHubClient.fetchPagesBuilds")(function* (params: {
        page?: number
        perPage?: number
      } = {}): Effect.fn.Return<Array<PagesBuild>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set("page", String(params.page))
        searchParams.set("per_page", String(params.perPage ?? 100))

        return yield* Effect.gen(function* () {
          const response = yield* client
            .get(`/repos/${owner}/${name}/pages/builds?${searchParams.toString()}`)
            .pipe(Effect.mapError(toGitHubError))
          const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
          const rows = (Array.isArray(json) ? json : []) as Array<GitHubPagesBuildWire>
          return rows.flatMap((row) => {
            const build = mapPagesBuild(row)
            return build ? [build] : []
          })
        }).pipe(
          Effect.catchIf(
            (error): error is GitHubError =>
              error instanceof GitHubError && error.status === 404,
            () => Effect.succeed([] as Array<PagesBuild>)
          )
        )
      })


      const SPONSORSHIPS_QUERY = `
  query SponsorshipsAsMaintainer($owner: String!, $first: Int!, $after: String) {
    user(login: $owner) {
      sponsorshipsAsMaintainer(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          tier {
            id
            name
            monthlyPriceInDollars
            description
          }
          sponsorEntity {
            ... on User {
              login
              avatarUrl
              url
            }
            ... on Organization {
              login
              avatarUrl
              url
            }
          }
          createdAt
          isActive
          isOneTimePayment
        }
      }
    }
    organization(login: $owner) {
      sponsorshipsAsMaintainer(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          tier {
            id
            name
            monthlyPriceInDollars
            description
          }
          sponsorEntity {
            ... on User {
              login
              avatarUrl
              url
            }
            ... on Organization {
              login
              avatarUrl
              url
            }
          }
          createdAt
          isActive
          isOneTimePayment
        }
      }
    }
  }
`

      type GqlSponsorshipNode = {
        tier: {
          id: string
          name: string
          monthlyPriceInDollars: number
          description: string | null
        } | null
        sponsorEntity: {
          login: string
          avatarUrl: string
          url: string
        } | null
        createdAt: string
        isActive: boolean
        isOneTimePayment: boolean
      }

      type GqlSponsorshipsConnection = {
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
        nodes: Array<GqlSponsorshipNode | null>
      }

      type GqlSponsorshipsResponse = {
        data?: {
          user?: { sponsorshipsAsMaintainer?: GqlSponsorshipsConnection | null } | null
          organization?: { sponsorshipsAsMaintainer?: GqlSponsorshipsConnection | null } | null
        }
        errors?: Array<{ message: string }>
      }

      function mapSponsorship(node: GqlSponsorshipNode): Sponsorship | null {
        if (!node.sponsorEntity?.login) return null
        return new Sponsorship({
          tier: node.tier
            ? {
                id: node.tier.id,
                name: node.tier.name,
                monthlyPriceInDollars: node.tier.monthlyPriceInDollars,
                description: node.tier.description ?? "",
              }
            : null,
          sponsor: {
            login: node.sponsorEntity.login,
            avatarUrl: node.sponsorEntity.avatarUrl ?? "",
            url: node.sponsorEntity.url ?? "",
          },
          createdAt: DateTime.fromDateUnsafe(new Date(node.createdAt)),
          isActive: node.isActive ?? false,
          isOneTime: node.isOneTimePayment ?? false,
        })
      }

      const fetchSponsorships = Effect.fn("GitHubClient.fetchSponsorships")(function* (params: {
        after?: string | null
        first?: number
      } = {}): Effect.fn.Return<{
        sponsorships: Array<Sponsorship>
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }, GitHubError> {
        const json = (yield* graphql(SPONSORSHIPS_QUERY, {
          owner,
          first: params.first ?? 100,
          after: params.after ?? null,
        })) as GqlSponsorshipsResponse

        if (json.errors?.length) {
          return yield* Effect.fail(
            new GitHubError({
              status: 200,
              message: json.errors.map((e) => e.message).join("; "),
              details: "GraphQL errors on sponsorshipsAsMaintainer",
            }),
          )
        }

        const connection =
          json.data?.user?.sponsorshipsAsMaintainer ??
          json.data?.organization?.sponsorshipsAsMaintainer ??
          null

        const nodes = (connection?.nodes ?? []).filter(
          (n): n is GqlSponsorshipNode => n != null,
        )
        const sponsorships = nodes
          .map(mapSponsorship)
          .filter((s): s is Sponsorship => s != null)

        return {
          sponsorships,
          pageInfo: {
            hasNextPage: connection?.pageInfo.hasNextPage ?? false,
            endCursor: connection?.pageInfo.endCursor ?? null,
          },
        }
      })


      type GitHubWebhookWire = {
        id?: number | null
        type?: string | null
        name?: string | null
        active?: boolean | null
        events?: Array<string> | null
        config?: {
          url?: string | null
          content_type?: string | null
          insecure_ssl?: string | null
          secret?: string | null
        } | null
        created_at?: string | null
        updated_at?: string | null
      }

      // Redact hostname chars (legacy sync-actions-webhooks redactUrlHost).
      function redactUrlHost(url: string): string {
        try {
          const parsed = new URL(url)
          return `${parsed.protocol}//${parsed.hostname.replace(/./g, "*")}${parsed.pathname}`
        } catch {
          return "[redacted]"
        }
      }

      function mapWebhook(row: GitHubWebhookWire): Webhook | null {
        const id = row.id
        const type = row.type?.trim()
        const name = row.name?.trim()
        const createdAt = row.created_at
        const updatedAt = row.updated_at
        if (
          typeof id !== "number" ||
          !Number.isInteger(id) ||
          !type ||
          !name ||
          !createdAt ||
          !updatedAt
        ) {
          return null
        }

        const wireConfig = row.config ?? {}
        const rawUrl = wireConfig.url?.trim()
        const contentType = wireConfig.content_type?.trim()
        const insecureSsl = wireConfig.insecure_ssl?.trim()

        return new Webhook({
          id,
          type,
          name,
          active: row.active ?? false,
          events: Array.isArray(row.events) ? row.events : [],
          config: {
            ...(rawUrl ? { url: redactUrlHost(rawUrl) } : {}),
            ...(contentType ? { contentType } : {}),
            ...(insecureSsl ? { insecureSsl } : {}),
            secret: "[redacted]",
          },
          createdAt: DateTime.fromDateUnsafe(new Date(createdAt)),
          updatedAt: DateTime.fromDateUnsafe(new Date(updatedAt)),
        })
      }

      const fetchActionsWebhooks = Effect.fn("GitHubClient.fetchActionsWebhooks")(function* (params: {
        page?: number
        perPage?: number
      } = {}): Effect.fn.Return<Array<Webhook>, GitHubError> {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set("page", String(params.page))
        searchParams.set("per_page", String(params.perPage ?? 100))

        const response = yield* client
          .get(`/repos/${owner}/${name}/hooks?${searchParams.toString()}`)
          .pipe(Effect.mapError(toGitHubError))
        const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
        const rows = (Array.isArray(json) ? json : []) as Array<GitHubWebhookWire>
        return rows.flatMap((row) => {
          const hook = mapWebhook(row)
          return hook ? [hook] : []
        })
      })


      type GitHubInteractionLimitsWire = {
        limit?: "existing_users" | "contributors_only" | "collaborators_only" | null
        origin?: string
        expires_at?: string | null
      }

      const EMPTY_INTERACTION_LIMITS = new InteractionLimits({
        limit: null,
        origin: "repository",
        expiresAt: null,
      })

      function mapInteractionLimits(row: GitHubInteractionLimitsWire): InteractionLimits {
        const limit = row.limit ?? null
        const origin =
          typeof row.origin === "string" && row.origin.length > 0
            ? row.origin
            : "repository"
        const expiresAt = row.expires_at ?? null
        return new InteractionLimits({
          limit,
          origin,
          expiresAt,
        })
      }

      const fetchInteractionLimits = Effect.fn("GitHubClient.fetchInteractionLimits")(
        function* (): Effect.fn.Return<InteractionLimits, GitHubError> {
          return yield* Effect.gen(function* () {
            const response = yield* client
              .get(`/repos/${owner}/${name}/interaction-limits`)
              .pipe(Effect.mapError(toGitHubError))
            const json = (yield* response.json.pipe(
              Effect.mapError(toGitHubError)
            )) as GitHubInteractionLimitsWire
            return mapInteractionLimits(json)
          }).pipe(
            Effect.catchIf(
              (error): error is GitHubError =>
                error instanceof GitHubError && error.status === 404,
              () => Effect.succeed(EMPTY_INTERACTION_LIMITS)
            )
          )
        }
      )


      type GitHubRepositoryWire = {
        name?: string
        full_name?: string
        description?: string | null
        private?: boolean
        archived?: boolean
        default_branch?: string
        html_url?: string
        fork?: boolean
        has_issues?: boolean
        has_projects?: boolean
        has_wiki?: boolean
        created_at?: string
        updated_at?: string
        pushed_at?: string | null
        owner?: { login?: string }
        stargazers_count?: number
        watchers_count?: number
        forks_count?: number
        open_issues_count?: number
        language?: string | null
        topics?: Array<string>
        visibility?: string | null
        allow_merge_commit?: boolean
        allow_squash_merge?: boolean
        allow_rebase_merge?: boolean
        merge_queue_enabled?: boolean | null
      }

      type GitHubSecurityAdvisoryWire = {
        ghsa_id?: string
        severity?: string
        summary?: string
        published_at?: string
        vulnerabilities?: Array<{
          package?: { ecosystem?: string; name?: string }
          severity?: string
          vulnerable_version_range?: string
          first_patched_version?: { identifier?: string } | null
        }>
      }

      function mapRepository(row: GitHubRepositoryWire): RepoMetadata {
        return new RepoMetadata({
          name: row.name ?? name,
          fullName: row.full_name ?? `${owner}/${name}`,
          description: row.description ?? null,
          private: row.private ?? false,
          archived: row.archived ?? false,
          defaultBranch: row.default_branch ?? "main",
          htmlUrl: row.html_url ?? `https://github.com/${owner}/${name}`,
          fork: row.fork ?? false,
          hasIssues: row.has_issues ?? true,
          hasProjects: row.has_projects ?? false,
          hasWiki: row.has_wiki ?? false,
          createdAt: row.created_at ?? new Date(0).toISOString(),
          updatedAt: row.updated_at ?? new Date(0).toISOString(),
          pushedAt: row.pushed_at ?? null,
          owner: row.owner?.login ?? owner,
          stargazersCount: row.stargazers_count ?? 0,
          watchersCount: row.watchers_count ?? 0,
          forksCount: row.forks_count ?? 0,
          openIssuesCount: row.open_issues_count ?? 0,
          language: row.language ?? null,
          topics: row.topics ?? [],
          visibility: row.visibility ?? null,
          allowMergeCommit: row.allow_merge_commit,
          allowSquashMerge: row.allow_squash_merge,
          allowRebaseMerge: row.allow_rebase_merge,
          // REST repos.get does not expose merge queue; legacy used GraphQL — OOS lean.
          mergeQueueEnabled: row.merge_queue_enabled ?? null,
        })
      }

      function mapSecurityAdvisory(row: GitHubSecurityAdvisoryWire): RepoSecurityAdvisory {
        return new RepoSecurityAdvisory({
          id: row.ghsa_id ?? "",
          severity: row.severity ?? "unknown",
          summary: row.summary ?? "",
          publishedAt: row.published_at ?? new Date(0).toISOString(),
          vulnerabilities: (row.vulnerabilities ?? []).map((vuln) => ({
            package: {
              ecosystem: vuln.package?.ecosystem ?? "unknown",
              name: vuln.package?.name ?? "unknown",
            },
            severity: vuln.severity ?? "unknown",
            vulnerableVersionRange: vuln.vulnerable_version_range ?? "",
            firstPatchedVersion: vuln.first_patched_version?.identifier
              ? { identifier: vuln.first_patched_version.identifier }
              : null,
          })),
        })
      }

      const fetchRepository = Effect.fn("GitHubClient.fetchRepository")(
        function* (): Effect.fn.Return<RepoMetadata, GitHubError> {
          const response = yield* client
            .get(`/repos/${owner}/${name}`)
            .pipe(Effect.mapError(toGitHubError))
          const json = (yield* response.json.pipe(
            Effect.mapError(toGitHubError)
          )) as GitHubRepositoryWire
          return mapRepository(json)
        }
      )

      const fetchSecurityAdvisories = Effect.fn("GitHubClient.fetchSecurityAdvisories")(
        function* (): Effect.fn.Return<Array<RepoSecurityAdvisory>, GitHubError> {
          return yield* Effect.gen(function* () {
            const all: Array<RepoSecurityAdvisory> = []
            let page = 1
            for (;;) {
              const searchParams = new URLSearchParams()
              searchParams.set("per_page", "100")
              searchParams.set("page", String(page))
              const response = yield* client
                .get(
                  `/repos/${owner}/${name}/security-advisories?${searchParams.toString()}`
                )
                .pipe(Effect.mapError(toGitHubError))
              const json = (yield* response.json.pipe(
                Effect.mapError(toGitHubError)
              )) as Array<GitHubSecurityAdvisoryWire>
              if (!Array.isArray(json) || json.length === 0) break
              for (const row of json) {
                all.push(mapSecurityAdvisory(row))
              }
              if (json.length < 100) break
              page += 1
            }
            return all
          }).pipe(
            Effect.catchIf(
              (error): error is GitHubError =>
                error instanceof GitHubError &&
                (error.status === 404 || error.status === 403),
              () => Effect.succeed([] as Array<RepoSecurityAdvisory>)
            )
          )
        }
      )


      type GitHubDependabotAlertWire = {
        number?: number
        state?: "open" | "dismissed" | "fixed"
        html_url?: string
        security_vulnerability?: {
          package?: { name?: string }
          severity?: "low" | "medium" | "high" | "critical"
        }
        security_advisory?: {
          severity?: "low" | "medium" | "high" | "critical"
        }
      }

      type GitHubCodeScanningAlertWire = {
        number?: number
        state?: "open" | "dismissed" | "fixed"
        html_url?: string
        rule?: {
          id?: string
          name?: string
          severity?: string
          security_severity_level?: "low" | "medium" | "high" | "critical" | null
        }
      }

      type GitHubSecretScanningAlertWire = {
        number?: number
        state?: "open" | "resolved"
        html_url?: string
        secret_type?: string
        secret_type_display_name?: string
        // secret?: string  — NEVER read / NEVER map
      }

      function mapSecuritySeverity(
        value: string | null | undefined,
      ): "low" | "medium" | "high" | "critical" {
        if (value === "critical" || value === "high" || value === "medium" || value === "low") {
          return value
        }
        // code-scanning rule.severity may be error/warning/note/none — coerce
        if (value === "error") return "high"
        if (value === "warning") return "medium"
        if (value === "note") return "low"
        return "low"
      }

      function mapDependabotAlertLean(row: GitHubDependabotAlertWire): DependabotAlertLean {
        const severity = mapSecuritySeverity(
          row.security_vulnerability?.severity ?? row.security_advisory?.severity,
        )
        return new DependabotAlertLean({
          number: row.number ?? 0,
          state: row.state ?? "open",
          severity,
          package: row.security_vulnerability?.package?.name ?? "unknown",
          url: row.html_url ?? "",
        })
      }

      function mapCodeScanningAlertLean(row: GitHubCodeScanningAlertWire): CodeScanningAlertLean {
        const severity = mapSecuritySeverity(
          row.rule?.security_severity_level ?? row.rule?.severity,
        )
        return new CodeScanningAlertLean({
          number: row.number ?? 0,
          state: row.state ?? "open",
          severity,
          rule: row.rule?.id ?? row.rule?.name ?? "unknown",
          url: row.html_url ?? "",
        })
      }

      function mapSecretScanningAlertLean(row: GitHubSecretScanningAlertWire): SecretScanningAlertLean {
        // Map resolved → dismissed so lean state stays open|dismissed|fixed (no secret field).
        const state =
          row.state === "resolved" ? ("dismissed" as const) : (row.state ?? "open")
        return new SecretScanningAlertLean({
          number: row.number ?? 0,
          state,
          secretType: row.secret_type ?? row.secret_type_display_name ?? "unknown",
          url: row.html_url ?? "",
        })
      }

      function emptyAlertsOnDisabled<A>(
        effect: Effect.Effect<Array<A>, GitHubError>,
      ): Effect.Effect<Array<A>, GitHubError> {
        return effect.pipe(
          Effect.catchIf(
            (error): error is GitHubError =>
              error instanceof GitHubError &&
              (error.status === 404 || error.status === 403),
            () => Effect.succeed([] as Array<A>),
          ),
        )
      }

      const fetchDependabotAlerts = Effect.fn("GitHubClient.fetchDependabotAlerts")(
        function* (params: { limit?: number } = {}): Effect.fn.Return<
          Array<DependabotAlertLean>,
          GitHubError
        > {
          return yield* Effect.gen(function* () {
            const limit = Math.min(Math.max(params.limit ?? 100, 1), 100)
            const searchParams = new URLSearchParams()
            searchParams.set("per_page", String(limit))
            const response = yield* client
              .get(`/repos/${owner}/${name}/dependabot/alerts?${searchParams.toString()}`)
              .pipe(Effect.mapError(toGitHubError))
            const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
            const rows = (Array.isArray(json) ? json : []) as Array<GitHubDependabotAlertWire>
            return rows.slice(0, limit).map(mapDependabotAlertLean)
          }).pipe(emptyAlertsOnDisabled)
        },
      )

      const fetchCodeScanningAlerts = Effect.fn("GitHubClient.fetchCodeScanningAlerts")(
        function* (params: { limit?: number } = {}): Effect.fn.Return<
          Array<CodeScanningAlertLean>,
          GitHubError
        > {
          return yield* Effect.gen(function* () {
            const limit = Math.min(Math.max(params.limit ?? 100, 1), 100)
            const searchParams = new URLSearchParams()
            searchParams.set("per_page", String(limit))
            const response = yield* client
              .get(`/repos/${owner}/${name}/code-scanning/alerts?${searchParams.toString()}`)
              .pipe(Effect.mapError(toGitHubError))
            const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
            const rows = (Array.isArray(json) ? json : []) as Array<GitHubCodeScanningAlertWire>
            return rows.slice(0, limit).map(mapCodeScanningAlertLean)
          }).pipe(emptyAlertsOnDisabled)
        },
      )

      const fetchSecretScanningAlerts = Effect.fn("GitHubClient.fetchSecretScanningAlerts")(
        function* (params: { limit?: number } = {}): Effect.fn.Return<
          Array<SecretScanningAlertLean>,
          GitHubError
        > {
          return yield* Effect.gen(function* () {
            const limit = Math.min(Math.max(params.limit ?? 100, 1), 100)
            const searchParams = new URLSearchParams()
            searchParams.set("per_page", String(limit))
            const response = yield* client
              .get(`/repos/${owner}/${name}/secret-scanning/alerts?${searchParams.toString()}`)
              .pipe(Effect.mapError(toGitHubError))
            const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
            const rows = (Array.isArray(json) ? json : []) as Array<GitHubSecretScanningAlertWire>
            // Intentionally ignore any wire `secret` field — redact by omission.
            return rows.slice(0, limit).map(mapSecretScanningAlertLean)
          }).pipe(emptyAlertsOnDisabled)
        },
      )


      type GitHubRepoEventWire = {
        id?: string | number
        type?: string
        actor?: { login?: string } | null
        created_at?: string
        payload?: Record<string, unknown> | null
      }

      function mapActivityEventInput(row: GitHubRepoEventWire): ActivityEventInput {
        return {
          id: row.id != null ? String(row.id) : "",
          type: row.type ?? "UnknownEvent",
          actor: row.actor?.login ?? null,
          createdAt: row.created_at ?? "",
          // Transient — formatEventDescription only; ActivitySummary encode omits payload.
          payload: row.payload ?? null,
        }
      }

      function emptyEventsOnDisabled(
        effect: Effect.Effect<Array<ActivityEventInput>, GitHubError>,
      ): Effect.Effect<Array<ActivityEventInput>, GitHubError> {
        return effect.pipe(
          Effect.catchIf(
            (error): error is GitHubError =>
              error instanceof GitHubError &&
              (error.status === 404 || error.status === 403),
            () => Effect.succeed([] as Array<ActivityEventInput>),
          ),
        )
      }

      const fetchActivityEvents = Effect.fn("GitHubClient.fetchActivityEvents")(
        function* (params: { limit?: number } = {}): Effect.fn.Return<
          Array<ActivityEventInput>,
          GitHubError
        > {
          return yield* Effect.gen(function* () {
            // Cue default 50; GitHub max per_page 100.
            const limit = Math.min(Math.max(params.limit ?? 50, 1), 100)
            const searchParams = new URLSearchParams()
            searchParams.set("per_page", String(limit))
            const response = yield* client
              .get(`/repos/${owner}/${name}/events?${searchParams.toString()}`)
              .pipe(Effect.mapError(toGitHubError))
            const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
            const rows = (Array.isArray(json) ? json : []) as Array<GitHubRepoEventWire>
            return rows.slice(0, limit).map(mapActivityEventInput)
          }).pipe(emptyEventsOnDisabled)
        },
      )


      type GitHubDeploymentWire = {
        id?: number
        sha?: string | null
        ref?: string | null
        environment?: string | null
        description?: string | null
        created_at?: string | null
        updated_at?: string | null
        url?: string | null
        creator?: { login?: string | null } | null
        // Rarely present on list; statuses endpoint owns real state.
        state?: string | null
      }

      function mapDeploymentInput(row: GitHubDeploymentWire): DeploymentInput | null {
        if (row.id == null) return null
        const environment =
          typeof row.environment === "string" && row.environment.trim().length > 0
            ? row.environment
            : "unknown"
        const createdAt = row.created_at ?? ""
        const updatedAt = row.updated_at ?? createdAt
        const url = row.url?.trim()
        return {
          id: row.id,
          environment,
          state: row.state?.trim() || "unknown",
          description: row.description ?? null,
          createdAt,
          updatedAt,
          creator: row.creator?.login ?? null,
          ref: row.ref ?? "",
          sha: row.sha ?? "",
          ...(url ? { url } : {}),
        }
      }

      function emptyDeploymentsOnDisabled(
        effect: Effect.Effect<Array<DeploymentInput>, GitHubError>,
      ): Effect.Effect<Array<DeploymentInput>, GitHubError> {
        return effect.pipe(
          Effect.catchIf(
            (error): error is GitHubError =>
              error instanceof GitHubError &&
              (error.status === 404 || error.status === 403),
            () => Effect.succeed([] as Array<DeploymentInput>),
          ),
        )
      }

      const fetchDeployments = Effect.fn("GitHubClient.fetchDeployments")(
        function* (params: { perPage?: number } = {}): Effect.fn.Return<
          Array<DeploymentInput>,
          GitHubError
        > {
          return yield* Effect.gen(function* () {
            // Cue/provider listDeployments uses per_page: 100 (single page, not paginate-all).
            const perPage = Math.min(Math.max(params.perPage ?? 100, 1), 100)
            const searchParams = new URLSearchParams()
            searchParams.set("per_page", String(perPage))
            const response = yield* client
              .get(`/repos/${owner}/${name}/deployments?${searchParams.toString()}`)
              .pipe(Effect.mapError(toGitHubError))
            const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
            const rows = (Array.isArray(json) ? json : []) as Array<GitHubDeploymentWire>
            return rows.flatMap((row) => {
              const mapped = mapDeploymentInput(row)
              return mapped ? [mapped] : []
            })
          }).pipe(emptyDeploymentsOnDisabled)
        },
      )


      type GitHubAuthenticatedUserWire = {
        login?: string | null
        name?: string | null
        avatar_url?: string | null
      }

      function mapAuthenticatedUserInput(
        row: GitHubAuthenticatedUserWire,
      ): AuthenticatedUserInput | null {
        const login = row.login?.trim()
        if (!login) return null
        return { login }
      }

      function nullUserOnUnauthorized(
        effect: Effect.Effect<AuthenticatedUserInput | null, GitHubError>,
      ): Effect.Effect<AuthenticatedUserInput | null, GitHubError> {
        return effect.pipe(
          Effect.catchIf(
            (error): error is GitHubError =>
              error instanceof GitHubError &&
              (error.status === 401 || error.status === 403),
            () => Effect.succeed(null as AuthenticatedUserInput | null),
          ),
        )
      }

      const fetchAuthenticatedUser = Effect.fn("GitHubClient.fetchAuthenticatedUser")(
        function* (): Effect.fn.Return<AuthenticatedUserInput | null, GitHubError> {
          return yield* Effect.gen(function* () {
            // Provider: octokit.rest.users.getAuthenticated() → GET /user
            const response = yield* client
              .get("/user")
              .pipe(Effect.mapError(toGitHubError))
            const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
            return mapAuthenticatedUserInput(
              (json ?? {}) as GitHubAuthenticatedUserWire,
            )
          }).pipe(nullUserOnUnauthorized)
        },
      )



      type GitHubAutolinkWire = {
        id?: number | null
        key_prefix?: string | null
        url_template?: string | null
        is_alphanumeric?: boolean | null
        updated_at?: string | null
      }

      function mapAutolink(row: GitHubAutolinkWire): Autolink | null {
        const id = row.id
        const keyPrefix = row.key_prefix?.trim()
        const urlTemplate = row.url_template?.trim()
        if (typeof id !== "number" || !keyPrefix || !urlTemplate) return null
        if (typeof row.is_alphanumeric !== "boolean") return null

        return Autolink.make({
          id,
          keyPrefix,
          urlTemplate,
          isAlphanumeric: row.is_alphanumeric,
          ...(row.updated_at !== undefined
            ? { updatedAt: row.updated_at ?? null }
            : {}),
        })
      }

      const fetchAutolinks = Effect.fn("GitHubClient.fetchAutolinks")(function* (): Effect.fn.Return<
        Array<Autolink>,
        GitHubError
      > {
        return yield* Effect.gen(function* () {
          const response = yield* client
            .get(`/repos/${owner}/${name}/autolinks`)
            .pipe(Effect.mapError(toGitHubError))
          const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
          const rows = (Array.isArray(json) ? json : []) as Array<GitHubAutolinkWire>
          return rows.flatMap((row) => {
            const autolink = mapAutolink(row)
            return autolink ? [autolink] : []
          })
        }).pipe(
          Effect.catchIf(
            (error): error is GitHubError =>
              error instanceof GitHubError &&
              (error.status === 404 || error.status === 403),
            () => Effect.succeed([] as Array<Autolink>)
          )
        )
      })


      type GitHubRuleSuiteWire = {
        id?: number | null
        actor_id?: number | null
        actor_name?: string | null
        before_sha?: string | null
        after_sha?: string | null
        ref?: string | null
        repository_id?: number | null
        repository_name?: string | null
        pushed_at?: string | null
        result?: string | null
        evaluation_result?: string | null
      }

      function mapRuleSuite(row: GitHubRuleSuiteWire): RuleSuite | null {
        const id = row.id
        const beforeSha = row.before_sha?.trim()
        const afterSha = row.after_sha?.trim()
        const ref = row.ref?.trim()
        const repositoryId = row.repository_id
        const repositoryName = row.repository_name?.trim()
        const pushedAt = row.pushed_at
        const result = row.result?.trim()
        if (
          typeof id !== "number" ||
          !beforeSha ||
          !afterSha ||
          !ref ||
          typeof repositoryId !== "number" ||
          !repositoryName ||
          !pushedAt ||
          !result
        ) {
          return null
        }

        return RuleSuite.make({
          id,
          actorId: row.actor_id ?? null,
          actorName: row.actor_name?.trim() ?? null,
          beforeSha,
          afterSha,
          ref,
          repositoryId,
          repositoryName,
          pushedAt: DateTime.fromDateUnsafe(new Date(pushedAt)),
          result,
          evaluationResult: row.evaluation_result?.trim() ?? null,
        })
      }

      const fetchRuleSuites = Effect.fn("GitHubClient.fetchRuleSuites")(function* (params: {
        limit?: number
      } = {}): Effect.fn.Return<Array<RuleSuite>, GitHubError> {
        const searchParams = new URLSearchParams()
        searchParams.set("per_page", String(params.limit ?? 30))
        // Single-fetch observe: page 1 only (legacy limit: 30 cue)
        searchParams.set("page", "1")

        return yield* Effect.gen(function* () {
          const response = yield* client
            .get(`/repos/${owner}/${name}/rulesets/rule-suites?${searchParams.toString()}`)
            .pipe(Effect.mapError(toGitHubError))
          const json = yield* response.json.pipe(Effect.mapError(toGitHubError))
          const rows = (Array.isArray(json) ? json : []) as Array<GitHubRuleSuiteWire>
          return rows.flatMap((row) => {
            const suite = mapRuleSuite(row)
            return suite ? [suite] : []
          })
        }).pipe(
          Effect.catchIf(
            (error): error is GitHubError =>
              error instanceof GitHubError &&
              (error.status === 404 || error.status === 403),
            () => Effect.succeed([] as Array<RuleSuite>)
          )
        )
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
        fetchContributors,
        fetchTeams,
        fetchCollaborators,
        fetchCodeowners,
        fetchProjectsV2,
        fetchPagesBuilds,
        fetchSponsorships,
        fetchActionsWebhooks,
        fetchInteractionLimits,
        fetchRepository,
        fetchSecurityAdvisories,
        fetchDependabotAlerts,
        fetchCodeScanningAlerts,
        fetchSecretScanningAlerts,
        fetchActivityEvents,
        fetchDeployments,
        fetchAuthenticatedUser,
        fetchAutolinks,
        fetchRuleSuites,
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
