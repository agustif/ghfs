export interface SecurityAlert {
  number: number
  state: 'open' | 'dismissed' | 'fixed'
  severity: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  dismissedAt: string | null
  fixedAt: string | null
}

export interface DependabotAlert extends SecurityAlert {
  package: string
  ecosystem: string
  vulnerableVersionRange: string | null
}

export interface CodeScanningAlert extends SecurityAlert {
  rule: string
  tool: string
  location: {
    path: string
    startLine: number
    endLine: number
  }
}

export interface SecretScanningAlert extends SecurityAlert {
  secretType: string
  resolution: string | null
}

export interface SecuritySummary {
  dependabot: {
    total: number
    open: number
    critical: number
    high: number
    medium: number
    low: number
    topAlerts: DependabotAlert[]
  }
  codeScanning: {
    total: number
    open: number
    critical: number
    high: number
    medium: number
    low: number
    topAlerts: CodeScanningAlert[]
  }
  secretScanning: {
    total: number
    open: number
    topAlerts: SecretScanningAlert[]
  }
  syncedAt: string
}

export interface DeploymentStatus {
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

export interface EnvironmentSummary {
  name: string
  url: string | null
  latestDeployment: DeploymentStatus | null
}

export interface DeploymentsSummary {
  defaultBranch: {
    environments: EnvironmentSummary[]
  }
  openPRs: Record<number, {
    number: number
    title: string
    environments: EnvironmentSummary[]
  }>
  syncedAt: string
}

export interface CrossReference {
  from: {
    type: 'issue' | 'pull' | 'commit' | 'discussion'
    id: string | number
  }
  to: {
    type: 'issue' | 'pull' | 'commit' | 'discussion'
    id: string | number
  }
  relation: 'references' | 'closes' | 'fixed_by' | 'duplicate_of' | 'mentioned_in'
}

export interface CrossRefsGraph {
  refs: CrossReference[]
  syncedAt: string
}
