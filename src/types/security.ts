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
  url: string
  securityAdvisory: {
    ghsaId: string
    cveId: string | null
    summary: string
    description: string
    severity: string
    identifiers: Array<{ type: string, value: string }>
    references: Array<{ url: string }>
    publishedAt: string
    updatedAt: string
    withdrawnAt: string | null
    vulnerabilities: Array<{
      package: { ecosystem: string, name: string }
      vulnerableVersionRange: string
      firstPatchedVersion: { identifier: string } | null
    }>
    cwes: Array<{ cweId: string, name: string }>
  }
  securityVulnerability: {
    package: { ecosystem: string, name: string }
    severity: string
    vulnerableVersionRange: string
    firstPatchedVersion: { identifier: string } | null
  }
  dependencyScope: string | null
  dependencyManifestPath: string | null
  dismissedBy: { login: string, avatarUrl: string } | null
  dismissedReason: string | null
  dismissedComment: string | null
}

export interface CodeScanningAlert extends SecurityAlert {
  rule: {
    id: string
    name: string
    severity: string
    securitySeverityLevel: string | null
    description: string
    tags: string[]
  }
  tool: {
    name: string
    version: string | null
  }
  location: {
    path: string
    startLine: number
    endLine: number
  }
  url: string
  mostRecentInstance: {
    ref: string
    analysisKey: string
    environment: string
    category: string
    state: string
    commitSha: string
    message: { text: string }
    location: {
      path: string
      startLine: number
      endLine: number
      startColumn: number
      endColumn: number
    }
  }
  dismissedBy: { login: string, avatarUrl: string } | null
  dismissedReason: string | null
  dismissedComment: string | null
}

export interface SecretScanningAlert extends SecurityAlert {
  secretType: string
  secretTypeDisplayName: string
  resolution: string | null
  url: string
  secret: string
  validity: string | null
  pushProtectionBypassed: boolean | null
  pushProtectionBypassedAt: string | null
  pushProtectionBypassedBy: { login: string, avatarUrl: string } | null
  resolvedAt: string | null
  resolvedBy: { login: string, avatarUrl: string } | null
  resolutionComment: string | null
}

export interface SecuritySummary {
  dependabot?: {
    total: number
    open: number
    critical: number
    high: number
    medium: number
    low: number
    topAlerts: DependabotAlert[]
  }
  dependabotAlerts?: {
    total: number
    open: number
    fixed: number
    dismissed: number
    byState?: {
      open: number
      dismissed: number
      fixed: number
    }
    bySeverity: {
      critical: number
      high: number
      medium: number
      low: number
    }
  }
  codeScanningAlerts?: {
    total: number
    open: number
    fixed: number
    dismissed: number
    byState?: {
      open: number
      dismissed: number
      fixed: number
    }
    bySeverity: {
      critical: number
      high: number
      medium: number
      low: number
      none: number
    }
  }
  secretScanningAlerts?: {
    total: number
    open: number
    resolved: number
    byState?: {
      open: number
      resolved: number
    }
    byValidity?: {
      active: number
      inactive: number
      unknown: number
    }
    bySeverity: {
      critical: number
      high: number
      medium: number
      low: number
    }
  }
  codeScanning?: {
    total: number
    open: number
    critical: number
    high: number
    medium: number
    low: number
    topAlerts: CodeScanningAlert[]
  }
  secretScanning?: {
    total: number
    open: number
    topAlerts: SecretScanningAlert[]
  }
  securityAdvisories?: {
    total: number
  }
  syncedAt?: string
  lastSyncedAt?: string
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

export interface SecurityAdvisory {
  ghsaId: string
  cveId: string | null
  severity: string
  summary: string
  description: string
  publishedAt: string
  updatedAt: string
  withdrawnAt: string | null
  identifiers: Array<{ type: string, value: string }>
  references: Array<{ url: string }>
  cvss: { score: number, vectorString: string | null } | null
  cwes: Array<{ cweId: string, name: string }>
  vulnerabilities: Array<{
    package: { ecosystem: string, name: string }
    severity: string
    vulnerableVersionRange: string
    firstPatchedVersion: { identifier: string } | null
  }>
}

export interface SecurityPolicy {
  url: string | null
  content: string | null
}

export interface CodeQLConfig {
  path: string
  content: string
}

export interface SecurityData {
  codeScanningAlerts: CodeScanningAlert[]
  secretScanningAlerts: SecretScanningAlert[]
  dependabotAlerts: DependabotAlert[]
  securityAdvisories: SecurityAdvisory[]
  securityPolicy: SecurityPolicy | null
  codeqlConfigs: CodeQLConfig[]
  summary: SecuritySummary
}

export interface SbomData {
  spdxId?: string
  name?: string
  packages?: unknown[]
  [key: string]: unknown
}

export interface DependencyReview {
  changeType?: string
  manifest?: string
  package?: { name: string, ecosystem: string }
  [key: string]: unknown
}

export interface AttestationsSummary {
  total: number
  [key: string]: unknown
}

export interface DependencyGraphSummary {
  totalDependencies?: number
  [key: string]: unknown
}
