import type { IssueKind, IssueState } from './issue'
import type { ProviderReviewDecision } from './provider'

export type PackSize = 'small' | 'medium' | 'large'

export interface PackMetadata {
  chunkId: string
  generatedAt: string
  ghfsVersion: string
  size: PackSize
}

export interface PackGateSummary {
  mergeable?: boolean | null
  mergeableState?: string
  reviewDecision?: ProviderReviewDecision | null
  checksStatus?: 'pending' | 'passing' | 'failing' | 'unknown'
  checksDigestPlaceholder?: string
}

export interface PackFileEntry {
  path: string
  additions?: number
  deletions?: number
  changes?: number
}

export interface PackLinkedIssue {
  number: number
  title: string
  state: IssueState
}

export interface PackOwner {
  login: string
  role: 'author' | 'assignee' | 'reviewer'
}

export interface PackSmallContent {
  number: number
  kind: IssueKind
  title: string
  state: IssueState
  url: string
  gate?: PackGateSummary
  fileList?: PackFileEntry[]
}

export interface PackMediumContent extends PackSmallContent {
  body: string
  author: string
  labels: string[]
  createdAt: string
  updatedAt: string
}

export interface PackLargeContent extends PackMediumContent {
  assignees: string[]
  milestone: string | null
  closedAt: string | null
  linkedIssues?: PackLinkedIssue[]
  owners?: PackOwner[]
  commentCount: number
  commentSummary?: string
  pr?: {
    isDraft: boolean
    merged: boolean
    mergedAt: string | null
    baseRef: string
    headRef: string
    requestedReviewers: string[]
    reviewSummary?: string
  }
}

export interface Pack<T = PackSmallContent | PackMediumContent | PackLargeContent> {
  metadata: PackMetadata
  content: T
}
