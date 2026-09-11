export interface ProviderMergeQueueEntry {
  id: string
  number: number
  pullRequest: {
    number: number
    title: string
    url: string
  }
  position: number
  state: 'AWAITING_CHECKS' | 'LOCKED' | 'MERGEABLE' | 'QUEUED' | 'UNMERGEABLE'
  estimatedTimeToMerge: string | null
  enqueuedAt: string
  headCommit: {
    sha: string
    message: string
  }
}

export interface ProviderProjectV2 {
  id: string
  number: number
  title: string
  shortDescription: string | null
  readme: string | null
  public: boolean
  closed: boolean
  url: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  owner: {
    login: string
  }
}

export interface ProviderProjectV2Field {
  id: string
  name: string
  dataType: 'TEXT' | 'NUMBER' | 'DATE' | 'SINGLE_SELECT' | 'ITERATION'
  options?: Array<{
    id: string
    name: string
    color?: string | null
  }>
}

export interface ProviderProjectV2Item {
  id: string
  fieldValues: Array<{
    field: {
      id: string
      name: string
    }
    value: string | number | null
  }>
  content: {
    number: number
    kind: 'issue' | 'pull'
    title: string
    url: string
  } | null
}

export interface ProviderDiscussionCategory {
  id: string
  name: string
  emoji: string | null
  description: string | null
  isAnswerable: boolean
  createdAt: string
  slug: string
}

export interface ProviderDiscussionPoll {
  discussionId: string
  question: string
  options: Array<{
    id: string
    option: string
    totalVoteCount: number
  }>
  totalVoteCount: number
}

export interface ProviderSponsorship {
  tier: {
    id: string
    name: string
    monthlyPriceInDollars: number
    description: string
  } | null
  sponsor: {
    login: string
    avatarUrl: string
    url: string
  }
  createdAt: string
  isActive: boolean
  isOneTime: boolean
}

export interface ProviderFundingLinks {
  github: string[]
  patreon: string | null
  openCollective: string | null
  koFi: string | null
  tidelift: string | null
  communityBridge: string | null
  liberapay: string | null
  issuehunt: string | null
  lfxCrowdfunding: string | null
  custom: string[]
}

export interface ProviderStatusCheckRollup {
  commit: {
    sha: string
  }
  state: 'EXPECTED' | 'ERROR' | 'FAILURE' | 'PENDING' | 'SUCCESS'
  contexts: Array<{
    context: string
    state: 'EXPECTED' | 'ERROR' | 'FAILURE' | 'PENDING' | 'SUCCESS'
    description: string | null
    targetUrl: string | null
    createdAt: string
  }>
}

export interface ProviderReviewThread {
  id: string
  isResolved: boolean
  isOutdated: boolean
  isCollapsed: boolean
  line: number | null
  originalLine: number | null
  startLine: number | null
  originalStartLine: number | null
  path: string
  diffSide: 'LEFT' | 'RIGHT'
  comments: Array<{
    id: string
    body: string
    author: string | null
    createdAt: string
    replyTo: string | null
  }>
  suggestedChange: {
    originalCode: string
    suggestedCode: string
    startLine: number
    endLine: number
  } | null
}

export interface ProviderCodeOwner {
  pattern: string
  owners: string[]
  lineNumber: number
}

export interface ProviderGraphQLTeam {
  id: string
  slug: string
  name: string
  description: string | null
  privacy: 'SECRET' | 'CLOSED' | 'VISIBLE'
  url: string
  avatarUrl: string | null
  membersCount: number
  repositoriesCount: number
  createdAt: string
  updatedAt: string
}

export interface ProviderProjectItemConnection {
  projectV2Items: Array<{
    projectId: string
    projectNumber: number
    projectTitle: string
    itemId: string
    fieldValues: Array<{
      fieldName: string
      value: string | number | null
    }>
  }>
}
