export interface CustomPropertyValue {
  property_name: string
  value: string | number | string[] | null
}

export interface AutolinkReference {
  id: number
  key_prefix: string
  url_template: string
  is_alphanumeric: boolean
}

export interface BranchRenameInfo {
  from: string
  to: string
}

export interface CommitActivity {
  days: number[]
  total: number
  week: number
}

export interface ParticipationStats {
  all: number[]
  owner: number[]
}

export interface RepositoryTag {
  name: string
  commit: {
    sha: string
    url: string
  }
  zipball_url: string
  tarball_url: string
  node_id: string
}

export interface GitRef {
  ref: string
  node_id: string
  url: string
  object: {
    type: string
    sha: string
    url: string
  }
}

export interface TreeEntry {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

export interface GitTree {
  sha: string
  url: string
  tree: TreeEntry[]
  truncated: boolean
}

export interface AssigneeSuggestion {
  login: string
  id: number
  node_id: string
  avatar_url: string
  type: string
  site_admin: boolean
}

export interface TrafficReferrer {
  referrer: string
  count: number
  uniques: number
}

export interface TrafficPath {
  path: string
  title: string
  count: number
  uniques: number
}

export interface TrafficViews {
  count: number
  uniques: number
  views: Array<{
    timestamp: string
    count: number
    uniques: number
  }>
}

export interface TrafficClones {
  count: number
  uniques: number
  clones: Array<{
    timestamp: string
    count: number
    uniques: number
  }>
}

export interface ReactionSummary {
  'url': string
  'total_count': number
  '+1': number
  '-1': number
  'laugh': number
  'hooray': number
  'confused': number
  'heart': number
  'rocket': number
  'eyes': number
}

export interface VulnerabilityReporting {
  enabled: boolean
  url?: string
}
