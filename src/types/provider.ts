import type { IssueKind, IssueState } from '../types'
import type { ReactionContent } from '../utils/reactions'
import type { AttestationsSummary, DependabotAlert, DependencyGraphSummary, DependencyReview, SbomData } from './security'

export interface ProviderReactions {
  totalCount: number
  plusOne: number
  minusOne: number
  laugh: number
  hooray: number
  confused: number
  heart: number
  rocket: number
  eyes: number
}

export type IssueStateReason = 'completed' | 'not_planned' | 'reopened'

export interface ProviderItem {
  number: number
  kind: IssueKind
  url?: string
  state: IssueState
  stateReason?: IssueStateReason | null
  updatedAt: string
  createdAt: string
  closedAt: string | null
  title: string
  body: string | null
  author: string | null
  authorAvatarUrl?: string
  labels: string[]
  assignees: string[]
  milestone: string | null
  reactions?: ProviderReactions
}

export interface ProviderComment {
  id: number
  body: string | null
  createdAt: string
  updatedAt: string
  author: string | null
  authorAvatarUrl?: string
  reactions?: ProviderReactions
}

export type ProviderReviewDecision = 'approved' | 'changes_requested' | 'review_required'

export type MergeQueueEntryState = 'QUEUED' | 'AWAITING_CHECKS' | 'MERGEABLE' | 'UNMERGEABLE' | 'LOCKED'

export interface ProviderMergeQueueEntry {
  position: number
  state: MergeQueueEntryState
  enqueuedAt: string
  estimatedTimeToMerge: number | null
  /** Login of the user who enqueued this PR. */
  enqueuer: string | null
}

export interface ProviderPullMetadata {
  isDraft: boolean
  merged: boolean
  mergedAt: string | null
  mergeCommitSha: string | null
  baseRef: string
  headRef: string
  headSha: string
  requestedReviewers: string[]
  /**
   * Whether GitHub computed the PR to be mergeable. `null`/omitted when GitHub
   * hasn't finished computing yet — the UI should treat as unknown.
   */
  mergeable?: boolean | null
  /**
   * Raw GitHub `mergeable_state` string: typically one of
   * `clean | dirty | blocked | behind | unstable | draft | unknown`.
   */
  mergeableState?: string
  /**
   * Aggregate review state. Prefers GitHub's own `reviewDecision` (set when
   * branch protection requires reviews); falls back to a derivation from the
   * latest non-dismissed review per reviewer. `null` when there is no useful
   * signal (no reviews submitted and no reviewers requested).
   */
  reviewDecision?: ProviderReviewDecision | null
  /**
   * Auto-merge configuration when enabled.
   */
  autoMerge?: ProviderAutoMergeInfo | null
   * Merge queue entry details when this PR is in the merge queue.
   * `null` when not in queue or when scope/permissions are insufficient.
   */
  mergeQueueEntry?: ProviderMergeQueueEntry | null
}

export interface ProviderPullReview {
  id: number
  state: ProviderReviewState
  author: string | null
  authorAvatarUrl?: string
  body: string | null
  submittedAt: string
  commitId?: string
}

export interface ProviderPullReviewThread {
  id: string
  isResolved: boolean
  isOutdated: boolean
  comments: ProviderReviewComment[]
}

export type ProviderCheckStatus = 'completed' | 'in_progress' | 'queued' | 'waiting' | 'pending' | 'requested'
export type ProviderCheckConclusion = 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null

export interface ProviderCheck {
  name: string
  status: ProviderCheckStatus
  conclusion: ProviderCheckConclusion
  detailsUrl?: string
  startedAt?: string
  completedAt?: string
}

export interface ProviderPullFile {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged'
  additions: number
  deletions: number
  changes: number
  patch?: string
  previousFilename?: string
}

export interface ProviderPullGate {
  mergeable: boolean | null
  mergeableState: string
  reviewDecision: ProviderReviewDecision | null
  checksGreen: boolean | null
  inMergeQueue: boolean
  conflictFiles: string[]
}

export interface ProviderReviewComment {
  id: number
  body: string | null
  author: string | null
  authorAvatarUrl?: string
  createdAt: string
  updatedAt: string
  /** File path the comment is anchored to. */
  path: string
  /** Line in the file (right side for additions); null if the line is no longer present. */
  line: number | null
  /** Start line for multi-line comments. */
  startLine?: number | null
  side?: 'LEFT' | 'RIGHT'
  /** Snippet of the diff for context — already includes the leading `@@` hunk header. */
  diffHunk: string
  commitId?: string
  /** REST id of the parent review (groups comments into a single review). */
  pullRequestReviewId: number | null
  /** REST id of the comment this is a reply to, when threaded. */
  inReplyToId: number | null
  reactions?: ProviderReactions
}

export type MergeMethod = 'squash' | 'merge' | 'rebase'

export interface MergeOptions {
  method?: MergeMethod
  commitTitle?: string
  commitMessage?: string
}

export interface ProviderCommit {
  sha: string
  message: string
  authorLogin: string | null
  authorName: string | null
  authorDate: string
  committerLogin: string | null
  committerDate: string
  url?: string
}

export type ProviderCheckConclusionState = 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required'
export type ProviderCheckStatusState = 'queued' | 'in_progress' | 'completed'

export interface ProviderCheckRun {
  id: number
  name: string
  headSha: string
  status: ProviderCheckStatusState
  conclusion: ProviderCheckConclusionState | null
  startedAt: string | null
  completedAt: string | null
  detailsUrl: string | null
  htmlUrl: string | null
}

export interface ProviderCommitStatus {
  state: 'error' | 'failure' | 'pending' | 'success'
  targetUrl: string | null
  description: string | null
  context: string
  createdAt: string
  updatedAt: string
}

export interface ProviderCombinedStatus {
  state: 'success' | 'pending' | 'failure'
  sha: string
  totalCount: number
  statuses: ProviderCommitStatus[]
}

export interface ProviderAutoMergeInfo {
  enabledAt: string | null
  enabledBy: string | null
  mergeMethod: MergeMethod | null
  commitTitle: string | null
  commitMessage: string | null
}

/** Cross-reference target: the issue/PR that mentioned this item. */
export interface ProviderTimelineSource {
  number: number
  kind: 'issue' | 'pull'
  title?: string
  url?: string
  repo?: string
}

export type ProviderReviewState = 'approved' | 'changes_requested' | 'commented' | 'dismissed' | 'pending'

interface ProviderTimelineEventBase {
  id: string
  createdAt: string
  actor: string | null
  actorAvatarUrl?: string
}

export type ProviderTimelineEvent
  = | (ProviderTimelineEventBase & { kind: 'committed', sha: string, commitMessage: string, body?: string | null, commitUrl?: string })
    | (ProviderTimelineEventBase & { kind: 'closed', stateReason?: string | null, sha?: string, commitUrl?: string })
    | (ProviderTimelineEventBase & { kind: 'reopened' })
    | (ProviderTimelineEventBase & { kind: 'merged', sha?: string, commitUrl?: string })
    | (ProviderTimelineEventBase & { kind: 'labeled' | 'unlabeled', label: { name: string, color: string } })
    | (ProviderTimelineEventBase & { kind: 'assigned' | 'unassigned', assignee: string })
    | (ProviderTimelineEventBase & { kind: 'review_requested' | 'review_request_removed', requestedReviewer: string, isTeam?: boolean })
    | (ProviderTimelineEventBase & {
      kind: 'reviewed'
      review: {
        /** REST id — used to attach inline review comments to their parent review. */
        id?: number
        state: ProviderReviewState
        body: string | null
        submittedAt: string
        /** GraphQL node ID — required to react to a review body. */
        nodeId?: string
        reactions?: ProviderReactions
      }
      body?: string | null
    })
    | (ProviderTimelineEventBase & { kind: 'review_dismissed', dismissedReview: { state: string, reviewId: number, dismissalMessage: string | null }, reviewedBy?: string })
    | (ProviderTimelineEventBase & { kind: 'commented', commentId?: number, body?: string | null })
    | (ProviderTimelineEventBase & { kind: 'renamed', rename: { from: string, to: string } })
    | (ProviderTimelineEventBase & {
      kind: 'referenced' | 'cross-referenced' | 'connected' | 'disconnected' | 'marked_as_duplicate' | 'unmarked_as_duplicate'
      source?: ProviderTimelineSource
    })
    | (ProviderTimelineEventBase & { kind: 'milestoned' | 'demilestoned', milestone?: string })
    | (ProviderTimelineEventBase & { kind: 'transferred', fromRepo?: string })
    | (ProviderTimelineEventBase & { kind: 'base_ref_changed', oldRef?: string, newRef?: string })
    | (ProviderTimelineEventBase & { kind: 'head_ref_force_pushed', sha?: string, commitUrl?: string })
    | (ProviderTimelineEventBase & { kind: 'head_ref_deleted' | 'head_ref_restored' })
    | (ProviderTimelineEventBase & { kind: 'locked', lockReason?: string })
    | (ProviderTimelineEventBase & { kind: 'unlocked' | 'ready_for_review' | 'convert_to_draft' | 'pinned' | 'unpinned' })
    | (ProviderTimelineEventBase & { kind: 'mentioned' | 'subscribed' | 'unsubscribed' })
    | (ProviderTimelineEventBase & {
      kind: 'auto_merge_enabled' | 'auto_merge_disabled' | 'auto_squash_enabled' | 'auto_squash_disabled' | 'auto_rebase_enabled' | 'auto_rebase_disabled'
      commitTitle?: string
      commitMessage?: string
    })
    | (ProviderTimelineEventBase & { kind: 'unknown', rawKind?: string })

export type ProviderTimelineEventKind = ProviderTimelineEvent['kind']

export interface ProviderRepository {
  name: string
  full_name: string
  description: string | null
  private: boolean
  archived: boolean
  default_branch: string
  html_url: string
  fork: boolean
  open_issues_count: number
  has_issues: boolean
  has_projects: boolean
  has_wiki: boolean
  created_at: string
  updated_at: string
  pushed_at: string | null
  owner: {
    login: string
  }
  stargazers_count: number
  watchers_count: number
  forks_count: number
  subscribers_count?: number
  network_count?: number
  /** Whether the repo allows merge commits (`Create a merge commit`). */
  allow_merge_commit?: boolean
  /** Whether the repo allows squash-merging (`Squash and merge`). */
  allow_squash_merge?: boolean
  /** Whether the repo allows rebase-merging (`Rebase and merge`). */
  allow_rebase_merge?: boolean
  /**
   * Whether the default branch is gated by a merge queue. When true, the UI
   * shows a "Merge when ready" button that enqueues the PR via GraphQL.
   * `null`/omitted when the setting hasn't been fetched yet.
   */
  merge_queue_enabled?: boolean | null
}

export interface ProviderLabel {
  name: string
  color: string
  description: string | null
  default: boolean
}

export interface ProviderAuthenticatedUser {
  login: string
  name: string | null
  avatarUrl: string
}

export interface ProviderEvent {
  id: string
  type: string
  actor: string | null
  createdAt: string
  payload?: Record<string, any>
}

export interface ProviderDeployment {
  id: number
  environment: string
  state: string
  description: string | null
  createdAt: string
  updatedAt: string
  creator: string | null
  ref: string
  sha: string
  url?: string
}

export interface ProviderMilestone {
  number: number
  title: string
  state: 'open' | 'closed'
  description: string | null
  due_on: string | null
  open_issues: number
  closed_issues: number
  created_at: string
  updated_at: string
  closed_at: string | null
}

export interface ProviderSecurityAlert {
  number: number
  state: 'open' | 'dismissed' | 'fixed'
  severity: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  dismissedAt: string | null
  fixedAt: string | null
}

export interface ProviderDependabotAlert extends ProviderSecurityAlert {
  package: string
  ecosystem: string
  vulnerableVersionRange: string | null
}

export interface ProviderCodeScanningAlert extends ProviderSecurityAlert {
  rule: string
  tool: string
  location: {
    path: string
    startLine: number
    endLine: number
  }
}

export interface ProviderSecretScanningAlert extends ProviderSecurityAlert {
  secretType: string
  resolution: string | null
}

export interface ProviderDeployment {
  id: number
  ref: string
  sha: string
  environment: string
  state: 'queued' | 'in_progress' | 'success' | 'failure' | 'error' | 'inactive'
  createdAt: string
  updatedAt: string
  creator: string | null
  description: string | null
  url: string | null
}

export interface ProviderEnvironment {
  name: string
  url: string | null
}

export interface ProviderRepoEvent {
  id: string
  type: string
  actor: string | null
  createdAt: string
  payload: Record<string, unknown>
}

export interface ProviderCollaborator {
  login: string
  permissions: {
    admin: boolean
    maintain: boolean
    push: boolean
    triage: boolean
    pull: boolean
  }
}

export interface ProviderTeam {
  name: string
  slug: string
  permission: string
}

export interface ProviderApp {
  id: number
  name: string
  slug: string
}

export interface ProviderItemSnapshot {
  number: number
  kind: IssueKind
  updatedAt: string | null
}

export interface ProviderUpdateCounts {
  issues: number
  pulls: number
}

export interface ProviderGitRef {
  ref: string
  sha: string
  url: string
}

export interface ProviderGitCommit {
  sha: string
  message: string
  author: {
    name: string
    email: string
    date: string
  }
  committer: {
    name: string
    email: string
    date: string
  }
  tree: {
    sha: string
  }
  parents: Array<{ sha: string }>
  url: string
  html_url?: string
}

export interface ProviderGitTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
  url: string
}

export interface ProviderGitTree {
  sha: string
  url: string
  tree: ProviderGitTreeItem[]
  truncated: boolean
}

export interface ProviderGitBlob {
  sha: string
  content: string
  encoding: 'base64' | 'utf-8'
  size: number
  url: string
}

export type ProviderLockReason = 'resolved' | 'off-topic' | 'too heated' | 'too-heated' | 'spam'

export interface ProviderTrafficViews {
  count: number
  uniques: number
  views: Array<{
    timestamp: string
    count: number
    uniques: number
  }>
}

export interface ProviderBranchProtection {
  pattern: string
  required_status_checks: {
    strict: boolean
    contexts: string[]
  } | null
  required_pull_request_reviews: {
    dismiss_stale_reviews: boolean
    require_code_owner_reviews: boolean
    required_approving_review_count: number
  } | null
  enforce_admins: boolean
  required_linear_history: boolean
  allow_force_pushes: boolean
  allow_deletions: boolean
}

export interface ProviderWorkflowRun {
  id: number
  name: string | null
  head_branch: string | null
  head_sha: string
  status: string
  conclusion: string | null
  workflow_id: number
  created_at: string
  updated_at: string
  html_url: string
  event: string
  actor: string | null
}

export interface ProviderRepositoryTopics {
  names: string[]
}

export interface ProviderRepositoryContent {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string | null
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  content?: string
  encoding?: string
export interface ProviderIssueDependency {
  id: number
  number: number
  title: string
  state: IssueState
  url?: string
  repo?: string
}

export interface ProviderSubIssue {
  id: number
  number: number
  title: string
  state: IssueState
  url?: string
  repo?: string
}

export interface ProviderParentIssue {
  id: number
  number: number
  title: string
  state: IssueState
  url?: string
  repo?: string
}

export type IssueFieldDataType = 'text' | 'date' | 'single_select' | 'multi_select' | 'number'

export interface IssueFieldOption {
  id: number
  name: string
  description: string | null
  color: string | null
}

export interface ProviderIssueField {
  id: number
  nodeId: string
  name: string
  description: string | null
  dataType: IssueFieldDataType
  options?: IssueFieldOption[] | null
}

export interface ProviderIssueFieldValue {
  fieldId: number
  fieldName: string
  dataType: IssueFieldDataType
  value: string | number | string[] | null
}

export interface ProviderIssueType {
  id: number
  nodeId: string
  name: string
  description: string | null
  color: string | null
  isEnabled: boolean
}

export type ProviderLockReason = 'resolved' | 'off-topic' | 'too heated' | 'too-heated' | 'spam'

export interface ProviderTrafficClones {
  count: number
  uniques: number
  clones: Array<{
    timestamp: string
    count: number
    uniques: number
  }>
}

export interface ProviderTrafficReferrer {
  referrer: string
  count: number
  uniques: number
}

export interface ProviderTrafficPath {
  path: string
  title: string
  count: number
  uniques: number
}

export interface ProviderStarHistory {
  week: string
  total: number
  days: [number, number, number, number, number, number, number]
}

export interface ProviderContributor {
  login: string
  contributions: number
  avatar_url?: string
}

/**
 * Compare data for a pull request: ahead/behind commits relative to base branch,
 * merge-base SHA, and commit lists for visualization.
 */
export interface ProviderPullCompare {
  /** Merge base SHA (common ancestor of head and base). */
  mergeBaseSha: string
  /** Commits ahead of base (unique to this PR's head branch). */
  aheadBy: number
  /** Commits behind base (base branch commits not in PR). */
  behindBy: number
  /** List of commits ahead (in chronological order, oldest first). */
  commits: ProviderCommit[]
  /** Whether the branches can be merged without conflicts. */
  mergeable?: boolean | null
}

/**
 * Stacked PR relationship data: PRs this PR depends on (base PRs),
 * and PRs that depend on this PR (dependent PRs).
 */
export interface ProviderPullStack {
  /** PR numbers this PR is stacked on top of (base PRs, in order from base to head). */
  basePRs: number[]
  /** PR numbers that are stacked on top of this PR (dependent PRs). */
  dependentPRs: number[]
}

/**
 * Status check rollup from GitHub GraphQL API, providing aggregate
 * check state and individual check contexts.
 */
export interface ProviderPullStatusCheckRollup {
  /** Aggregate state: SUCCESS, FAILURE, PENDING, EXPECTED, or null if no checks. */
  state: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'EXPECTED' | null
  /** Individual check contexts (both StatusContext and CheckRun). */
  contexts: Array<{
    context: string
    state: string
    targetUrl: string | null
    description: string | null
  }>
}

/**
 * Compare data for a pull request: ahead/behind commits relative to base branch,
 * merge-base SHA, and commit lists for visualization.
 */
export interface ProviderPullCompare {
  /** Merge base SHA (common ancestor of head and base). */
  mergeBaseSha: string
  /** Commits ahead of base (unique to this PR's head branch). */
  aheadBy: number
  /** Commits behind base (base branch commits not in PR). */
  behindBy: number
  /** List of commits ahead (in chronological order, oldest first). */
  commits: ProviderCommit[]
  /** Whether the branches can be merged without conflicts. */
  mergeable?: boolean | null
}

/**
 * Stacked PR relationship data: PRs this PR depends on (base PRs),
 * and PRs that depend on this PR (dependent PRs).
 */
export interface ProviderPullStack {
  /** PR numbers this PR is stacked on top of (base PRs, in order from base to head). */
  basePRs: number[]
  /** PR numbers that are stacked on top of this PR (dependent PRs). */
  dependentPRs: number[]
}

/**
 * Status check rollup from GitHub GraphQL API, providing aggregate
 * check state and individual check contexts.
 */
export interface ProviderPullStatusCheckRollup {
  /** Aggregate state: SUCCESS, FAILURE, PENDING, EXPECTED, or null if no checks. */
  state: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'EXPECTED' | null
  /** Individual check contexts (both StatusContext and CheckRun). */
  contexts: Array<{
    context: string
    state: string
    targetUrl: string | null
    description: string | null
  }>
}

/**
 * Compare data for a pull request: ahead/behind commits relative to base branch,
 * merge-base SHA, and commit lists for visualization.
 */
export interface ProviderPullCompare {
  /** Merge base SHA (common ancestor of head and base). */
  mergeBaseSha: string
  /** Commits ahead of base (unique to this PR's head branch). */
  aheadBy: number
  /** Commits behind base (base branch commits not in PR). */
  behindBy: number
  /** List of commits ahead (in chronological order, oldest first). */
  commits: ProviderCommit[]
  /** Whether the branches can be merged without conflicts. */
  mergeable?: boolean | null
}

/**
 * Stacked PR relationship data: PRs this PR depends on (base PRs),
 * and PRs that depend on this PR (dependent PRs).
 */
export interface ProviderPullStack {
  /** PR numbers this PR is stacked on top of (base PRs, in order from base to head). */
  basePRs: number[]
  /** PR numbers that are stacked on top of this PR (dependent PRs). */
  dependentPRs: number[]
}

/**
 * Status check rollup from GitHub GraphQL API, providing aggregate
 * check state and individual check contexts.
 */
export interface ProviderPullStatusCheckRollup {
  /** Aggregate state: SUCCESS, FAILURE, PENDING, EXPECTED, or null if no checks. */
  state: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'EXPECTED' | null
  /** Individual check contexts (both StatusContext and CheckRun). */
  contexts: Array<{
    context: string
    state: string
    targetUrl: string | null
    description: string | null
  }>
}

/**
 * Where a reaction is applied. `item` = issue/PR body (uses `op.number`).
 * `comment` = issue/PR conversation comment. `review` = a PR review body
 * (review reactions go through GraphQL and need the review's node ID).
 */
export type ReactionTarget
  = | { kind: 'item' }
    | { kind: 'comment', commentId: number }
    | { kind: 'review', reviewId: string }

export interface PaginateItemsOptions {
  state: IssueState | 'all'
  since?: string
}

export interface ProviderCollaborator {
  login: string
  name: string | null
  avatarUrl: string
  permission: 'pull' | 'push' | 'maintain' | 'admin'
  roleName?: string
}

export interface ProviderTeam {
  name: string
  slug: string
  description: string | null
  permission: 'pull' | 'push' | 'maintain' | 'admin'
  members: string[]
}

export interface ProviderAppInstallation {
  name: string
  slug: string
  description: string | null
  permissions: Record<string, string>
}

export interface ProviderCodeowners {
  path: string
  owners: string[]
}

export interface RepositoryProvider {
  paginateItems: (options: PaginateItemsOptions) => AsyncIterable<ProviderItem[]>
  fetchItems: (options: PaginateItemsOptions) => Promise<ProviderItem[]>
  eachItem: (options: PaginateItemsOptions) => AsyncIterable<ProviderItem>
  fetchItemsByNumbers: (numbers: number[]) => Promise<ProviderItem[]>
  fetchComments: (number: number) => Promise<ProviderComment[]>
  fetchPullMetadata: (number: number) => Promise<ProviderPullMetadata>
  fetchPullPatch: (number: number) => Promise<string>
  fetchPullCommits: (number: number) => Promise<ProviderCommit[]>
  fetchReviewComments: (number: number) => Promise<ProviderReviewComment[]>
  fetchTimeline: (number: number) => Promise<ProviderTimelineEvent[]>
  fetchItemSnapshot: (number: number) => Promise<ProviderItemSnapshot>
  fetchRepository: () => Promise<ProviderRepository>
  fetchRepositoryLabels: () => Promise<ProviderLabel[]>
  fetchRepositoryMilestones: () => Promise<ProviderMilestone[]>
  fetchAuthenticatedUser: () => Promise<ProviderAuthenticatedUser | null>
  countUpdatedSince: (since: string) => Promise<ProviderUpdateCounts>
  fetchCheckRuns: (ref: string) => Promise<ProviderCheckRun[]>
  fetchCombinedStatus: (ref: string) => Promise<ProviderCombinedStatus>
  fetchRepositoryTopics?: () => Promise<ProviderRepositoryTopics>
  fetchReleases?: (limit?: number) => Promise<ProviderRelease[]>
  fetchBranchProtection?: (branch: string) => Promise<ProviderBranchProtection | null>
  fetchRecentWorkflowRuns?: (limit?: number) => Promise<ProviderWorkflowRun[]>
  fetchRepositoryContent?: (path: string) => Promise<ProviderRepositoryContent | null>
  fetchPinnedIssues?: () => Promise<number[]>
  fetchCollaborators: () => Promise<ProviderCollaborator[]>
  fetchTeams: () => Promise<ProviderTeam[]>
  fetchAppInstallations: () => Promise<ProviderAppInstallation[]>
  fetchCodeowners: () => Promise<ProviderCodeowners | null>
  getRequestCount: () => number
  fetchPullReviews: (number: number) => Promise<ProviderPullReview[]>
  fetchPullReviewThreads: (number: number) => Promise<ProviderPullReviewThread[]>
  fetchPullChecks: (number: number) => Promise<ProviderCheck[]>
  fetchPullFiles: (number: number) => Promise<ProviderPullFile[]>
  fetchPullGate: (number: number) => Promise<ProviderPullGate>

  fetchDependabotAlerts?: (options?: { state?: 'open' | 'dismissed' | 'fixed', limit?: number }) => Promise<ProviderDependabotAlert[]>
  fetchCodeScanningAlerts?: (options?: { state?: 'open' | 'dismissed' | 'fixed', limit?: number }) => Promise<ProviderCodeScanningAlert[]>
  fetchSecretScanningAlerts?: (options?: { state?: 'open' | 'resolved', limit?: number }) => Promise<ProviderSecretScanningAlert[]>
  fetchDeployments?: (options?: { ref?: string, environment?: string, limit?: number }) => Promise<ProviderDeployment[]>
  fetchEnvironments?: () => Promise<ProviderEnvironment[]>
  fetchRepoEvents?: (limit?: number) => Promise<ProviderRepoEvent[]>
  fetchCollaborators?: () => Promise<ProviderCollaborator[]>
  fetchTeams?: () => Promise<ProviderTeam[]>
  fetchInstalledApps?: () => Promise<ProviderApp[]>
  fetchPullCompare: (number: number) => Promise<ProviderPullCompare>
  fetchPullStack: (number: number) => Promise<ProviderPullStack>
  fetchPullStatusCheckRollup: (number: number) => Promise<ProviderPullStatusCheckRollup>

  fetchEvents?: (limit?: number) => Promise<ProviderEvent[]>
  fetchDeployments?: () => Promise<ProviderDeployment[]>

  fetchIssueDependenciesBlockedBy: (number: number) => Promise<ProviderIssueDependency[]>
  fetchIssueDependenciesBlocking: (number: number) => Promise<ProviderIssueDependency[]>
  fetchIssueSubIssues: (number: number) => Promise<ProviderSubIssue[]>
  fetchIssueParent: (number: number) => Promise<ProviderParentIssue | null>
  fetchIssueFieldValues: (number: number) => Promise<ProviderIssueFieldValue[]>
  fetchRepositoryIssueTypes: () => Promise<ProviderIssueType[]>
  fetchOrganizationIssueFields: (org: string) => Promise<ProviderIssueField[]>

  fetchGitRefs: () => Promise<ProviderGitRef[]>
  fetchGitCommits: (options: { sha?: string, limit?: number }) => Promise<ProviderGitCommit[]>
  fetchGitTree: (sha: string, recursive?: boolean) => Promise<ProviderGitTree>
  fetchGitBlob: (sha: string) => Promise<ProviderGitBlob>
  compareCommits: (base: string, head: string) => Promise<{ commits: ProviderGitCommit[] }>

  fetchDependabotAlerts?: (options?: { state?: 'open' | 'dismissed' | 'fixed', limit?: number }) => Promise<ProviderDependabotAlert[]>
  fetchCodeScanningAlerts?: (options?: { state?: 'open' | 'dismissed' | 'fixed', limit?: number }) => Promise<ProviderCodeScanningAlert[]>
  fetchSecretScanningAlerts?: (options?: { state?: 'open' | 'resolved', limit?: number }) => Promise<ProviderSecretScanningAlert[]>
  fetchDeployments?: (options?: { ref?: string, environment?: string, limit?: number }) => Promise<ProviderDeployment[]>
  fetchEnvironments?: () => Promise<ProviderEnvironment[]>
  fetchRepoEvents?: (limit?: number) => Promise<ProviderRepoEvent[]>
  fetchCollaborators?: () => Promise<ProviderCollaborator[]>
  fetchTeams?: () => Promise<ProviderTeam[]>
  fetchInstalledApps?: () => Promise<ProviderApp[]>
  fetchPullCompare: (number: number) => Promise<ProviderPullCompare>
  fetchPullStack: (number: number) => Promise<ProviderPullStack>
  fetchPullStatusCheckRollup: (number: number) => Promise<ProviderPullStatusCheckRollup>

  fetchEvents?: (limit?: number) => Promise<ProviderEvent[]>
  fetchDeployments?: () => Promise<ProviderDeployment[]>

  fetchIssueDependenciesBlockedBy: (number: number) => Promise<ProviderIssueDependency[]>
  fetchIssueDependenciesBlocking: (number: number) => Promise<ProviderIssueDependency[]>
  fetchIssueSubIssues: (number: number) => Promise<ProviderSubIssue[]>
  fetchIssueParent: (number: number) => Promise<ProviderParentIssue | null>
  fetchIssueFieldValues: (number: number) => Promise<ProviderIssueFieldValue[]>
  fetchRepositoryIssueTypes: () => Promise<ProviderIssueType[]>
  fetchOrganizationIssueFields: (org: string) => Promise<ProviderIssueField[]>
  searchCode: (options: SearchOptions) => Promise<SearchCodeResult[]>
  searchCommits: (options: SearchOptions) => Promise<SearchCommitResult[]>
  searchIssues: (options: SearchOptions) => Promise<SearchIssueResult[]>

  fetchTrafficViews: () => Promise<ProviderTrafficViews | null>
  fetchTrafficClones: () => Promise<ProviderTrafficClones | null>
  fetchTrafficReferrers: () => Promise<ProviderTrafficReferrer[]>
  fetchTrafficPaths: () => Promise<ProviderTrafficPath[]>
  fetchStarHistory: () => Promise<ProviderStarHistory[]>
  fetchContributors: () => Promise<ProviderContributor[]>

  fetchCustomProperties?: () => Promise<any[] | null>
  fetchAutolinks?: () => Promise<any[] | null>
  fetchBranchRenames?: () => Promise<any[] | null>
  fetchCommitActivity?: () => Promise<any[] | null>
  fetchParticipationStats?: () => Promise<any | null>
  fetchRepositoryTags?: () => Promise<any[] | null>
  fetchGitRefs?: (namespace?: string) => Promise<any[] | null>
  fetchGitTree?: (treeSha: string, recursive?: boolean) => Promise<any | null>
  fetchAssigneeSuggestions?: () => Promise<any[] | null>
  fetchTrafficReferrers?: () => Promise<any[] | null>
  fetchTrafficPaths?: () => Promise<any[] | null>
  fetchTrafficViews?: () => Promise<any | null>
  fetchTrafficClones?: () => Promise<any | null>
  fetchVulnerabilityReporting?: () => Promise<any | null>

  actionClose: (number: number) => Promise<void>
  actionReopen: (number: number) => Promise<void>
  actionSetTitle: (number: number, title: string) => Promise<void>
  actionSetBody: (number: number, body: string) => Promise<void>
  actionAddComment: (number: number, body: string) => Promise<void>
  actionAddLabels: (number: number, labels: string[]) => Promise<void>
  actionRemoveLabels: (number: number, labels: string[]) => Promise<void>
  actionSetLabels: (number: number, labels: string[]) => Promise<void>
  actionAddAssignees: (number: number, assignees: string[]) => Promise<void>
  actionRemoveAssignees: (number: number, assignees: string[]) => Promise<void>
  actionSetAssignees: (number: number, assignees: string[]) => Promise<void>
  actionSetMilestone: (number: number, milestone: string | number) => Promise<void>
  actionClearMilestone: (number: number) => Promise<void>
  actionLock: (number: number, reason?: ProviderLockReason) => Promise<void>
  actionUnlock: (number: number) => Promise<void>
  actionRequestReviewers: (number: number, reviewers: string[]) => Promise<void>
  actionRemoveReviewers: (number: number, reviewers: string[]) => Promise<void>
  actionMarkReadyForReview: (number: number) => Promise<void>
  actionConvertToDraft: (number: number) => Promise<void>
  actionApprove: (number: number, body?: string) => Promise<void>
  actionRequestChanges: (number: number, body: string) => Promise<void>
  actionReviewComment: (number: number, body: string) => Promise<void>
  actionMerge: (number: number, options: MergeOptions) => Promise<void>
  actionEnqueueMerge: (number: number) => Promise<void>
  actionAddReaction: (number: number, reaction: ReactionContent, target: ReactionTarget) => Promise<void>
  actionRemoveReaction: (number: number, reaction: ReactionContent, target: ReactionTarget) => Promise<void>
  fetchViewerReactions: (number: number, target: ReactionTarget) => Promise<ReactionContent[]>

  fetchDependabotAlerts?: () => Promise<DependabotAlert[]>
  fetchSbom?: (ref?: string) => Promise<SbomData | null>
  fetchDependencyReview?: (pullNumber: number, baseRef?: string, headRef?: string) => Promise<DependencyReview | null>
  fetchAttestationsSummary?: (artifactName?: string) => Promise<AttestationsSummary | null>
  fetchDependencyGraphSummary?: () => Promise<DependencyGraphSummary | null>
}
