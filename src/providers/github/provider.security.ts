import type { Octokit } from 'octokit'
import type {
  CodeQLConfig,
  CodeScanningAlert,
  DependabotAlert,
  SecretScanningAlert,
  SecurityAdvisory,
  SecurityPolicy,
} from '../../types/security'
import { Buffer } from 'node:buffer'
import { redactSecretScanningAlert } from '../../utils/security-redact'

type BumpRequestCount = () => void

export async function fetchCodeScanningAlerts(
  octokit: Octokit,
  owner: string,
  repo: string,
  state: 'open' | 'dismissed' | 'fixed' | undefined,
  bumpRequestCount: BumpRequestCount,
): Promise<CodeScanningAlert[]> {
  try {
    bumpRequestCount()
    const alerts = await octokit.paginate(octokit.rest.codeScanning.listAlertsForRepo, {
      owner,
      repo,
      state,
      per_page: 100,
    }) as GitHubCodeScanningAlert[]

    return alerts.map(mapCodeScanningAlert)
  }
  catch (error) {
    const status = (error as { status?: number }).status
    if (status === 404 || status === 403)
      return []
    throw error
  }
}

export async function fetchSecretScanningAlerts(
  octokit: Octokit,
  owner: string,
  repo: string,
  state: 'open' | 'resolved' | undefined,
  bumpRequestCount: BumpRequestCount,
): Promise<SecretScanningAlert[]> {
  try {
    bumpRequestCount()
    const alerts = await octokit.paginate(octokit.rest.secretScanning.listAlertsForRepo, {
      owner,
      repo,
      state,
      per_page: 100,
    }) as GitHubSecretScanningAlert[]

    return alerts.map(alert => redactSecretScanningAlert(mapSecretScanningAlert(alert)))
  }
  catch (error) {
    const status = (error as { status?: number }).status
    if (status === 404 || status === 403)
      return []
    throw error
  }
}

export async function fetchDependabotAlerts(
  octokit: Octokit,
  owner: string,
  repo: string,
  state: 'open' | 'dismissed' | 'fixed' | undefined,
  bumpRequestCount: BumpRequestCount,
): Promise<DependabotAlert[]> {
  try {
    bumpRequestCount()
    const alerts = await octokit.paginate(octokit.rest.dependabot.listAlertsForRepo, {
      owner,
      repo,
      state,
      per_page: 100,
    })

    return alerts.map(mapDependabotAlert)
  }
  catch (error) {
    const status = (error as { status?: number }).status
    if (status === 404 || status === 403)
      return []
    throw error
  }
}

export async function fetchSecurityAdvisories(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<SecurityAdvisory[]> {
  try {
    bumpRequestCount()
    const advisories = await octokit.paginate(octokit.rest.securityAdvisories.listRepositoryAdvisories, {
      owner,
      repo,
      per_page: 100,
    })

    return advisories.map(mapSecurityAdvisory)
  }
  catch (error) {
    const status = (error as { status?: number }).status
    if (status === 404 || status === 403)
      return []
    throw error
  }
}

export async function fetchSecurityPolicy(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<SecurityPolicy> {
  try {
    bumpRequestCount()
    const result = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'SECURITY.md',
    })

    if ('content' in result.data && typeof result.data.content === 'string') {
      const content = Buffer.from(result.data.content, 'base64').toString('utf8')
      return {
        url: result.data.html_url ?? null,
        content,
      }
    }

    return { url: null, content: null }
  }
  catch (error) {
    const status = (error as { status?: number }).status
    if (status === 404) {
      try {
        bumpRequestCount()
        const fallbackResult = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: '.github/SECURITY.md',
        })

        if ('content' in fallbackResult.data && typeof fallbackResult.data.content === 'string') {
          const content = Buffer.from(fallbackResult.data.content, 'base64').toString('utf8')
          return {
            url: fallbackResult.data.html_url ?? null,
            content,
          }
        }
      }
      catch {
        return { url: null, content: null }
      }
    }
    return { url: null, content: null }
  }
}

export async function fetchCodeQLConfigs(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<CodeQLConfig[]> {
  const configs: CodeQLConfig[] = []
  const paths = [
    '.github/codeql/codeql-config.yml',
    '.github/codeql-config.yml',
    'codeql-config.yml',
  ]

  for (const path of paths) {
    try {
      bumpRequestCount()
      const result = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      })

      if ('content' in result.data && typeof result.data.content === 'string') {
        const content = Buffer.from(result.data.content, 'base64').toString('utf8')
        configs.push({ path, content })
      }
    }
    catch {
    }
  }

  return configs
}

function mapCodeScanningAlert(alert: GitHubCodeScanningAlert): CodeScanningAlert {
  return {
    number: alert.number,
    state: alert.state,
    createdAt: alert.created_at,
    updatedAt: alert.updated_at ?? alert.created_at,
    dismissedAt: alert.dismissed_at ?? null,
    dismissedBy: alert.dismissed_by?.login ?? null,
    dismissedReason: alert.dismissed_reason ?? null,
    dismissedComment: alert.dismissed_comment ?? null,
    fixedAt: alert.fixed_at ?? null,
    url: alert.html_url,
    rule: {
      id: alert.rule.id ?? alert.rule.name ?? 'unknown',
      severity: alert.rule.severity ?? 'none',
      securitySeverityLevel: alert.rule.security_severity_level ?? null,
      description: alert.rule.description ?? '',
      name: alert.rule.name ?? alert.rule.id ?? 'unknown',
      tags: alert.rule.tags ?? [],
    },
    tool: {
      name: alert.tool.name ?? 'unknown',
      version: alert.tool.version ?? null,
    },
    mostRecentInstance: {
      ref: alert.most_recent_instance.ref ?? 'unknown',
      analysisKey: alert.most_recent_instance.analysis_key ?? '',
      commitSha: alert.most_recent_instance.commit_sha ?? '',
      location: {
        path: alert.most_recent_instance.location?.path ?? 'unknown',
        startLine: alert.most_recent_instance.location?.start_line ?? 0,
        endLine: alert.most_recent_instance.location?.end_line ?? 0,
        startColumn: alert.most_recent_instance.location?.start_column ?? null,
        endColumn: alert.most_recent_instance.location?.end_column ?? null,
      },
      classifications: alert.most_recent_instance.classifications ?? [],
    },
    instancesUrl: alert.instances_url,
  }
}

function mapSecretScanningAlert(alert: GitHubSecretScanningAlert): SecretScanningAlert {
  return {
    number: alert.number,
    state: alert.state === 'resolved' ? 'dismissed' : alert.state,
    createdAt: alert.created_at ?? new Date().toISOString(),
    updatedAt: alert.updated_at ?? alert.created_at ?? new Date().toISOString(),
    dismissedAt: alert.resolved_at ?? null,
    dismissedBy: alert.resolved_by?.login ?? null,
    dismissedReason: alert.resolution ?? null,
    dismissedComment: alert.resolution_comment ?? null,
    fixedAt: alert.resolved_at && alert.resolution === 'revoked' ? alert.resolved_at : null,
    url: alert.html_url,
    secretType: alert.secret_type ?? 'unknown',
    secretTypeDisplayName: alert.secret_type_display_name ?? alert.secret_type ?? 'Unknown',
    secret: alert.secret ?? '[REDACTED]',
    resolution: alert.resolution ?? null,
    resolvedAt: alert.resolved_at ?? null,
    resolvedBy: alert.resolved_by?.login ?? null,
    resolutionComment: alert.resolution_comment ?? null,
    pushProtectionBypassed: alert.push_protection_bypassed ?? false,
    pushProtectionBypassedAt: alert.push_protection_bypassed_at ?? null,
    pushProtectionBypassedBy: alert.push_protection_bypassed_by?.login ?? null,
    validity: alert.validity ?? null,
    locationsUrl: alert.locations_url ?? '',
  }
}

function mapDependabotAlert(alert: any): DependabotAlert {
  return {
    number: alert.number,
    state: alert.state,
    createdAt: alert.created_at,
    updatedAt: alert.updated_at ?? alert.created_at,
    dismissedAt: alert.dismissed_at ?? null,
    dismissedBy: alert.dismissed_by?.login ?? null,
    dismissedReason: alert.dismissed_reason ?? null,
    dismissedComment: alert.dismissed_comment ?? null,
    fixedAt: alert.fixed_at ?? null,
    url: alert.html_url,
    securityAdvisory: {
      ghsaId: alert.security_advisory.ghsa_id,
      cveId: alert.security_advisory.cve_id ?? null,
      severity: alert.security_advisory.severity,
      summary: alert.security_advisory.summary,
      description: alert.security_advisory.description,
      cvss: {
        score: alert.security_advisory.cvss.score ?? 0,
        vectorString: alert.security_advisory.cvss.vector_string ?? null,
      },
      cwes: alert.security_advisory.cwes?.map((cwe: any) => ({
        cweId: cwe.cwe_id,
        name: cwe.name,
      })) ?? [],
      publishedAt: alert.security_advisory.published_at,
      updatedAt: alert.security_advisory.updated_at,
      withdrawnAt: alert.security_advisory.withdrawn_at ?? null,
      references: alert.security_advisory.references?.map((ref: any) => ({ url: ref.url })) ?? [],
    },
    securityVulnerability: {
      package: {
        ecosystem: alert.security_vulnerability.package.ecosystem,
        name: alert.security_vulnerability.package.name,
      },
      severity: alert.security_vulnerability.severity,
      vulnerableVersionRange: alert.security_vulnerability.vulnerable_version_range,
      firstPatchedVersion: alert.security_vulnerability.first_patched_version
        ? { identifier: alert.security_vulnerability.first_patched_version.identifier }
        : null,
    },
    dependencyManifestPath: alert.dependency?.manifest_path ?? 'unknown',
    dependencyScope: alert.dependency?.scope ?? null,
    autoDissmissedAt: alert.auto_dismissed_at ?? null,
  }
}

function mapSecurityAdvisory(advisory: any): SecurityAdvisory {
  return {
    ghsaId: advisory.ghsa_id,
    cveId: advisory.cve_id ?? null,
    severity: advisory.severity,
    summary: advisory.summary,
    description: advisory.description,
    publishedAt: advisory.published_at,
    updatedAt: advisory.updated_at,
    withdrawnAt: advisory.withdrawn_at ?? null,
    identifiers: advisory.identifiers?.map((id: any) => ({
      type: id.type,
      value: id.value,
    })) ?? [],
    references: advisory.references?.map((ref: any) => ({ url: ref.url })) ?? [],
    cvss: advisory.cvss
      ? {
          score: advisory.cvss.score ?? 0,
          vectorString: advisory.cvss.vector_string ?? null,
        }
      : null,
    cwes: advisory.cwes?.map((cwe: any) => ({
      cweId: cwe.cwe_id,
      name: cwe.name,
    })) ?? [],
    vulnerabilities: advisory.vulnerabilities?.map((vuln: any) => ({
      package: {
        ecosystem: vuln.package.ecosystem,
        name: vuln.package.name,
      },
      severity: vuln.severity,
      vulnerableVersionRange: vuln.vulnerable_version_range,
      firstPatchedVersion: vuln.first_patched_version
        ? { identifier: vuln.first_patched_version.identifier }
        : null,
    })) ?? [],
  }
}

interface GitHubCodeScanningAlert {
  number: number
  state: 'open' | 'dismissed' | 'fixed'
  created_at: string
  updated_at?: string
  dismissed_at?: string | null
  dismissed_by?: { login: string } | null
  dismissed_reason?: string | null
  dismissed_comment?: string | null
  fixed_at?: string | null
  html_url: string
  rule: {
    id?: string
    name?: string
    severity?: 'error' | 'warning' | 'note' | 'none'
    security_severity_level?: 'critical' | 'high' | 'medium' | 'low' | null
    description?: string
    tags?: string[]
  }
  tool: {
    name?: string
    version?: string | null
  }
  most_recent_instance: {
    ref?: string
    analysis_key?: string
    commit_sha?: string
    location?: {
      path?: string
      start_line?: number
      end_line?: number
      start_column?: number | null
      end_column?: number | null
    }
    classifications?: string[]
  }
  instances_url: string
}

interface GitHubSecretScanningAlert {
  number: number
  state: 'open' | 'resolved'
  created_at?: string
  updated_at?: string
  resolved_at?: string | null
  resolved_by?: { login: string } | null
  resolution?: string | null
  resolution_comment?: string | null
  html_url: string
  secret_type?: string
  secret_type_display_name?: string
  secret?: string
  push_protection_bypassed?: boolean
  push_protection_bypassed_at?: string | null
  push_protection_bypassed_by?: { login: string } | null
  validity?: 'active' | 'inactive' | 'unknown' | null
  locations_url?: string
}

interface _GitHubDependabotAlert {
  number: number
  state: 'open' | 'dismissed' | 'fixed'
  created_at: string
  updated_at?: string
  dismissed_at?: string | null
  dismissed_by?: { login: string } | null
  dismissed_reason?: string | null
  dismissed_comment?: string | null
  fixed_at?: string | null
  auto_dismissed_at?: string | null
  html_url: string
  security_advisory: {
    ghsa_id: string
    cve_id?: string | null
    severity: 'critical' | 'high' | 'medium' | 'low'
    summary: string
    description: string
    cvss: {
      score?: number
      vector_string?: string | null
    }
    cwes?: Array<{
      cwe_id: string
      name: string
    }>
    published_at: string
    updated_at: string
    withdrawn_at?: string | null
    references?: Array<{
      url: string
    }>
  }
  security_vulnerability: {
    package: {
      ecosystem: string
      name: string
    }
    severity: 'critical' | 'high' | 'medium' | 'low'
    vulnerable_version_range: string
    first_patched_version?: {
      identifier: string
    } | null
  }
  dependency?: {
    manifest_path?: string
    scope?: 'development' | 'runtime' | null
  }
}

interface _GitHubSecurityAdvisory {
  ghsa_id: string
  cve_id?: string | null
  severity: 'critical' | 'high' | 'medium' | 'low'
  summary: string
  description: string
  published_at: string
  updated_at: string
  withdrawn_at?: string | null
  identifiers?: Array<{
    type: string
    value: string
  }>
  references?: Array<{
    url: string
  }>
  cvss?: {
    score?: number
    vector_string?: string | null
  }
  cwes?: Array<{
    cwe_id: string
    name: string
  }>
  vulnerabilities?: Array<{
    package: {
      ecosystem: string
      name: string
    }
    severity: 'critical' | 'high' | 'medium' | 'low'
    vulnerable_version_range: string
    first_patched_version?: {
      identifier: string
    } | null
  }>
}
