/** Hotfix: merge-storm type restorations for PR landing */
import type { ProviderReviewComment, ProviderReviewDecision, ProviderReviewState } from './provider'

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

/** Loose structural types — callers use many optional GraphQL fields */
export type ProviderDiscussion = Record<string, any>
export type ProviderDiscussionComment = Record<string, any>
export type ProviderDiscussionCategory = Record<string, any>
export type ProviderPackage = Record<string, any>
export type ProviderPackageVersion = Record<string, any>
