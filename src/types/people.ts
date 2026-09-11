export interface PersonSummary {
  login: string
  name: string | null
  avatarUrl: string
  authoredPRs: Array<{
    number: number
    title: string
    state: 'open' | 'closed' | 'merged'
    createdAt: string
    updatedAt: string
    url: string
  }>
  reviewsGiven: Array<{
    prNumber: number
    prTitle: string
    state: 'approved' | 'changes_requested' | 'commented'
    submittedAt: string
    url: string
  }>
  codeownerPaths: string[]
}

export interface CollaboratorInfo {
  login: string
  name: string | null
  avatarUrl: string
  permission: 'pull' | 'push' | 'maintain' | 'admin'
  role_name?: string
}

export interface TeamInfo {
  name: string
  slug: string
  description: string | null
  permission: 'pull' | 'push' | 'maintain' | 'admin'
  members: string[]
}

export interface GitHubAppInfo {
  name: string
  slug: string
  description: string | null
  permissions: Record<string, string>
}

export interface CollaboratorsSummary {
  collaborators: CollaboratorInfo[]
  teams: TeamInfo[]
  apps: GitHubAppInfo[]
  syncedAt: string
}

export interface PeopleSnapshot {
  people: PersonSummary[]
  collaborators?: CollaboratorsSummary
  syncedAt: string
}
