import type { GhfsResolvedConfig } from '../types/config'
import type { RepositoryProvider } from '../types/provider'
import type {
  CodeScanningAlert,
  DependabotAlert,
  SecretScanningAlert,
  SecurityAdvisory,
  SecurityData,
  SecuritySummary,
} from '../types/security'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncSecurity(
  provider: RepositoryProvider,
  config: GhfsResolvedConfig,
): Promise<SecurityData | null> {
  const securityConfig = config.sync.security
  if (!securityConfig)
    return null

  const shouldSyncAny = securityConfig.codeScanning
    || securityConfig.secretScanning
    || securityConfig.dependabot
    || securityConfig.advisories
    || securityConfig.policy
    || securityConfig.codeqlConfigs

  if (!shouldSyncAny)
    return null

  const [
    codeScanningAlerts,
    secretScanningAlerts,
    dependabotAlerts,
    securityAdvisories,
    securityPolicy,
    codeqlConfigs,
  ] = await Promise.all([
    securityConfig.codeScanning && provider.fetchCodeScanningAlerts
      ? provider.fetchCodeScanningAlerts()
      : Promise.resolve([]),
    securityConfig.secretScanning && provider.fetchSecretScanningAlerts
      ? provider.fetchSecretScanningAlerts()
      : Promise.resolve([]),
    securityConfig.dependabot && provider.fetchDependabotAlerts
      ? provider.fetchDependabotAlerts()
      : Promise.resolve([]),
    securityConfig.advisories && provider.fetchSecurityAdvisories
      ? provider.fetchSecurityAdvisories()
      : Promise.resolve([]),
    securityConfig.policy && provider.fetchSecurityPolicy
      ? provider.fetchSecurityPolicy()
      : Promise.resolve({ url: null, content: null }),
    securityConfig.codeqlConfigs && provider.fetchCodeQLConfigs
      ? provider.fetchCodeQLConfigs()
      : Promise.resolve([]),
  ])

  const summary = generateSecuritySummary(
    codeScanningAlerts,
    secretScanningAlerts,
    dependabotAlerts,
    securityAdvisories,
  )

  const securityData: SecurityData = {
    codeScanningAlerts,
    secretScanningAlerts,
    dependabotAlerts,
    securityAdvisories,
    securityPolicy,
    codeqlConfigs,
    summary,
  }

  await writeSecurityFiles(config.directory, securityData)

  return securityData
}

function generateSecuritySummary(
  codeScanningAlerts: CodeScanningAlert[],
  secretScanningAlerts: SecretScanningAlert[],
  dependabotAlerts: DependabotAlert[],
  securityAdvisories: SecurityAdvisory[],
): SecuritySummary {
  return {
    codeScanningAlerts: {
      total: codeScanningAlerts.length,
      open: codeScanningAlerts.filter(a => a.state === 'open').length,
      fixed: codeScanningAlerts.filter(a => a.state === 'fixed').length,
      dismissed: codeScanningAlerts.filter(a => a.state === 'dismissed').length,
      bySeverity: {
        critical: codeScanningAlerts.filter(a => a.rule.securitySeverityLevel === 'critical').length,
        high: codeScanningAlerts.filter(a => a.rule.securitySeverityLevel === 'high').length,
        medium: codeScanningAlerts.filter(a => a.rule.securitySeverityLevel === 'medium').length,
        low: codeScanningAlerts.filter(a => a.rule.securitySeverityLevel === 'low').length,
        none: codeScanningAlerts.filter(a => !a.rule.securitySeverityLevel).length,
      },
    },
    secretScanningAlerts: {
      total: secretScanningAlerts.length,
      open: secretScanningAlerts.filter(a => a.state === 'open').length,
      resolved: secretScanningAlerts.filter(a => a.state !== 'open').length,
      bySeverity: {
        critical: 0,
        high: secretScanningAlerts.filter(a => a.validity === 'active').length,
        medium: secretScanningAlerts.filter(a => a.validity === 'inactive').length,
        low: secretScanningAlerts.filter(a => a.validity === 'unknown' || !a.validity).length,
      },
    },
    dependabotAlerts: {
      total: dependabotAlerts.length,
      open: dependabotAlerts.filter(a => a.state === 'open').length,
      fixed: dependabotAlerts.filter(a => a.state === 'fixed').length,
      dismissed: dependabotAlerts.filter(a => a.state === 'dismissed').length,
      bySeverity: {
        critical: dependabotAlerts.filter(a => a.securityAdvisory.severity === 'critical').length,
        high: dependabotAlerts.filter(a => a.securityAdvisory.severity === 'high').length,
        medium: dependabotAlerts.filter(a => a.securityAdvisory.severity === 'medium').length,
        low: dependabotAlerts.filter(a => a.securityAdvisory.severity === 'low').length,
      },
    },
    securityAdvisories: {
      total: securityAdvisories.length,
    },
    lastSyncedAt: new Date().toISOString(),
  }
}

async function writeSecurityFiles(
  directory: string,
  data: SecurityData,
): Promise<void> {
  const securityDir = join(directory, 'security')
  await mkdir(securityDir, { recursive: true })

  await writeFile(
    join(securityDir, 'summary.json'),
    JSON.stringify(data.summary, null, 2),
  )

  await writeFile(
    join(securityDir, 'summary.md'),
    formatSecuritySummary(data.summary),
  )

  if (data.codeScanningAlerts.length > 0) {
    await writeFile(
      join(securityDir, 'code-scanning.json'),
      JSON.stringify(data.codeScanningAlerts, null, 2),
    )
    await writeFile(
      join(securityDir, 'code-scanning.md'),
      formatCodeScanningAlerts(data.codeScanningAlerts),
    )
  }

  if (data.secretScanningAlerts.length > 0) {
    await writeFile(
      join(securityDir, 'secret-scanning.json'),
      JSON.stringify(data.secretScanningAlerts, null, 2),
    )
    await writeFile(
      join(securityDir, 'secret-scanning.md'),
      formatSecretScanningAlerts(data.secretScanningAlerts),
    )
  }

  if (data.dependabotAlerts.length > 0) {
    await writeFile(
      join(securityDir, 'dependabot.json'),
      JSON.stringify(data.dependabotAlerts, null, 2),
    )
    await writeFile(
      join(securityDir, 'dependabot.md'),
      formatDependabotAlerts(data.dependabotAlerts),
    )
  }

  if (data.securityAdvisories.length > 0) {
    await writeFile(
      join(securityDir, 'advisories.json'),
      JSON.stringify(data.securityAdvisories, null, 2),
    )
    await writeFile(
      join(securityDir, 'advisories.md'),
      formatSecurityAdvisories(data.securityAdvisories),
    )
  }

  if (data.securityPolicy.content) {
    await writeFile(
      join(securityDir, 'SECURITY.md'),
      data.securityPolicy.content,
    )
  }

  if (data.codeqlConfigs.length > 0) {
    const codeqlDir = join(securityDir, 'codeql')
    await mkdir(codeqlDir, { recursive: true })

    for (const config of data.codeqlConfigs) {
      const filename = config.path.split('/').pop() || 'config.yml'
      await writeFile(
        join(codeqlDir, filename),
        config.content,
      )
    }
  }
}

function formatSecuritySummary(summary: SecuritySummary): string {
  const lines: string[] = []

  lines.push('# Security Summary')
  lines.push('')
  lines.push(`Last synced: ${new Date(summary.lastSyncedAt).toLocaleString()}`)
  lines.push('')

  lines.push('## Code Scanning Alerts')
  lines.push('')
  lines.push(`- **Total**: ${summary.codeScanningAlerts.total}`)
  lines.push(`- **Open**: ${summary.codeScanningAlerts.open}`)
  lines.push(`- **Fixed**: ${summary.codeScanningAlerts.fixed}`)
  lines.push(`- **Dismissed**: ${summary.codeScanningAlerts.dismissed}`)
  lines.push('')
  lines.push('### By Severity')
  lines.push(`- 🔴 **Critical**: ${summary.codeScanningAlerts.bySeverity.critical}`)
  lines.push(`- 🟠 **High**: ${summary.codeScanningAlerts.bySeverity.high}`)
  lines.push(`- 🟡 **Medium**: ${summary.codeScanningAlerts.bySeverity.medium}`)
  lines.push(`- 🟢 **Low**: ${summary.codeScanningAlerts.bySeverity.low}`)
  lines.push(`- ⚪ **None**: ${summary.codeScanningAlerts.bySeverity.none}`)
  lines.push('')

  lines.push('## Secret Scanning Alerts')
  lines.push('')
  lines.push(`- **Total**: ${summary.secretScanningAlerts.total}`)
  lines.push(`- **Open**: ${summary.secretScanningAlerts.open}`)
  lines.push(`- **Resolved**: ${summary.secretScanningAlerts.resolved}`)
  lines.push('')
  lines.push('### By Severity')
  lines.push(`- 🟠 **High** (Active): ${summary.secretScanningAlerts.bySeverity.high}`)
  lines.push(`- 🟡 **Medium** (Inactive): ${summary.secretScanningAlerts.bySeverity.medium}`)
  lines.push(`- 🟢 **Low** (Unknown): ${summary.secretScanningAlerts.bySeverity.low}`)
  lines.push('')

  lines.push('## Dependabot Alerts')
  lines.push('')
  lines.push(`- **Total**: ${summary.dependabotAlerts.total}`)
  lines.push(`- **Open**: ${summary.dependabotAlerts.open}`)
  lines.push(`- **Fixed**: ${summary.dependabotAlerts.fixed}`)
  lines.push(`- **Dismissed**: ${summary.dependabotAlerts.dismissed}`)
  lines.push('')
  lines.push('### By Severity')
  lines.push(`- 🔴 **Critical**: ${summary.dependabotAlerts.bySeverity.critical}`)
  lines.push(`- 🟠 **High**: ${summary.dependabotAlerts.bySeverity.high}`)
  lines.push(`- 🟡 **Medium**: ${summary.dependabotAlerts.bySeverity.medium}`)
  lines.push(`- 🟢 **Low**: ${summary.dependabotAlerts.bySeverity.low}`)
  lines.push('')

  lines.push('## Security Advisories')
  lines.push('')
  lines.push(`- **Total**: ${summary.securityAdvisories.total}`)
  lines.push('')

  return lines.join('\n')
}

function formatCodeScanningAlerts(alerts: CodeScanningAlert[]): string {
  const lines: string[] = []

  lines.push('# Code Scanning Alerts')
  lines.push('')

  const openAlerts = alerts.filter(a => a.state === 'open')
  const dismissedAlerts = alerts.filter(a => a.state === 'dismissed')
  const fixedAlerts = alerts.filter(a => a.state === 'fixed')

  if (openAlerts.length > 0) {
    lines.push('## Open Alerts')
    lines.push('')
    for (const alert of openAlerts) {
      lines.push(formatCodeScanningAlert(alert))
      lines.push('')
    }
  }

  if (dismissedAlerts.length > 0) {
    lines.push('## Dismissed Alerts')
    lines.push('')
    for (const alert of dismissedAlerts) {
      lines.push(formatCodeScanningAlert(alert))
      lines.push('')
    }
  }

  if (fixedAlerts.length > 0) {
    lines.push('## Fixed Alerts')
    lines.push('')
    for (const alert of fixedAlerts) {
      lines.push(formatCodeScanningAlert(alert))
      lines.push('')
    }
  }

  return lines.join('\n')
}

function formatCodeScanningAlert(alert: CodeScanningAlert): string {
  const severityIcon = getSeverityIcon(alert.rule.securitySeverityLevel)
  const lines: string[] = []

  lines.push(`### ${severityIcon} [#${alert.number}](${alert.url}) ${alert.rule.name}`)
  lines.push('')
  lines.push(`**Tool**: ${alert.tool.name}${alert.tool.version ? ` v${alert.tool.version}` : ''}`)
  lines.push(`**Severity**: ${alert.rule.severity} ${alert.rule.securitySeverityLevel ? `(${alert.rule.securitySeverityLevel})` : ''}`)
  lines.push(`**State**: ${alert.state}`)
  lines.push('')
  lines.push(`**Description**: ${alert.rule.description}`)
  lines.push('')
  lines.push(`**Location**: \`${alert.mostRecentInstance.location.path}\`:${alert.mostRecentInstance.location.startLine}-${alert.mostRecentInstance.location.endLine}`)
  lines.push(`**Ref**: ${alert.mostRecentInstance.ref}`)
  lines.push(`**Commit**: ${alert.mostRecentInstance.commitSha.substring(0, 7)}`)
  lines.push('')

  if (alert.rule.tags.length > 0)
    lines.push(`**Tags**: ${alert.rule.tags.join(', ')}`)

  if (alert.dismissedAt) {
    lines.push('')
    lines.push(`**Dismissed**: ${new Date(alert.dismissedAt).toLocaleString()}`)
    if (alert.dismissedBy)
      lines.push(`**Dismissed by**: @${alert.dismissedBy}`)
    if (alert.dismissedReason)
      lines.push(`**Reason**: ${alert.dismissedReason}`)
    if (alert.dismissedComment)
      lines.push(`**Comment**: ${alert.dismissedComment}`)
  }

  if (alert.fixedAt) {
    lines.push('')
    lines.push(`**Fixed**: ${new Date(alert.fixedAt).toLocaleString()}`)
  }

  return lines.join('\n')
}

function formatSecretScanningAlerts(alerts: SecretScanningAlert[]): string {
  const lines: string[] = []

  lines.push('# Secret Scanning Alerts')
  lines.push('')
  lines.push('> **Note**: All secret values are automatically redacted for security.')
  lines.push('')

  const openAlerts = alerts.filter(a => a.state === 'open')
  const resolvedAlerts = alerts.filter(a => a.state !== 'open')

  if (openAlerts.length > 0) {
    lines.push('## Open Alerts')
    lines.push('')
    for (const alert of openAlerts) {
      lines.push(formatSecretScanningAlert(alert))
      lines.push('')
    }
  }

  if (resolvedAlerts.length > 0) {
    lines.push('## Resolved Alerts')
    lines.push('')
    for (const alert of resolvedAlerts) {
      lines.push(formatSecretScanningAlert(alert))
      lines.push('')
    }
  }

  return lines.join('\n')
}

function formatSecretScanningAlert(alert: SecretScanningAlert): string {
  const lines: string[] = []

  lines.push(`### ⚠️ [#${alert.number}](${alert.url}) ${alert.secretTypeDisplayName}`)
  lines.push('')
  lines.push(`**Type**: ${alert.secretType}`)
  lines.push(`**State**: ${alert.state}`)
  if (alert.validity)
    lines.push(`**Validity**: ${alert.validity}`)
  lines.push('')
  lines.push(`**Secret**: \`${alert.secret}\``)
  lines.push('')

  if (alert.pushProtectionBypassed) {
    lines.push(`**Push Protection Bypassed**: Yes`)
    if (alert.pushProtectionBypassedAt)
      lines.push(`**Bypassed at**: ${new Date(alert.pushProtectionBypassedAt).toLocaleString()}`)
    if (alert.pushProtectionBypassedBy)
      lines.push(`**Bypassed by**: @${alert.pushProtectionBypassedBy}`)
    lines.push('')
  }

  if (alert.resolvedAt) {
    lines.push(`**Resolved**: ${new Date(alert.resolvedAt).toLocaleString()}`)
    if (alert.resolvedBy)
      lines.push(`**Resolved by**: @${alert.resolvedBy}`)
    if (alert.resolution)
      lines.push(`**Resolution**: ${alert.resolution}`)
    if (alert.resolutionComment)
      lines.push(`**Comment**: ${alert.resolutionComment}`)
  }

  return lines.join('\n')
}

function formatDependabotAlerts(alerts: DependabotAlert[]): string {
  const lines: string[] = []

  lines.push('# Dependabot Alerts')
  lines.push('')

  const openAlerts = alerts.filter(a => a.state === 'open')
  const dismissedAlerts = alerts.filter(a => a.state === 'dismissed')
  const fixedAlerts = alerts.filter(a => a.state === 'fixed')

  if (openAlerts.length > 0) {
    lines.push('## Open Alerts')
    lines.push('')
    for (const alert of openAlerts) {
      lines.push(formatDependabotAlert(alert))
      lines.push('')
    }
  }

  if (dismissedAlerts.length > 0) {
    lines.push('## Dismissed Alerts')
    lines.push('')
    for (const alert of dismissedAlerts) {
      lines.push(formatDependabotAlert(alert))
      lines.push('')
    }
  }

  if (fixedAlerts.length > 0) {
    lines.push('## Fixed Alerts')
    lines.push('')
    for (const alert of fixedAlerts) {
      lines.push(formatDependabotAlert(alert))
      lines.push('')
    }
  }

  return lines.join('\n')
}

function formatDependabotAlert(alert: DependabotAlert): string {
  const severityIcon = getSeverityIcon(alert.securityAdvisory.severity)
  const lines: string[] = []

  lines.push(`### ${severityIcon} [#${alert.number}](${alert.url}) ${alert.securityAdvisory.summary}`)
  lines.push('')
  lines.push(`**Package**: \`${alert.securityVulnerability.package.name}\` (${alert.securityVulnerability.package.ecosystem})`)
  lines.push(`**Severity**: ${alert.securityAdvisory.severity}`)
  lines.push(`**State**: ${alert.state}`)
  lines.push('')
  lines.push(`**Vulnerable Range**: ${alert.securityVulnerability.vulnerableVersionRange}`)
  if (alert.securityVulnerability.firstPatchedVersion)
    lines.push(`**First Patched Version**: ${alert.securityVulnerability.firstPatchedVersion.identifier}`)
  else
    lines.push(`**First Patched Version**: None available`)
  lines.push('')
  lines.push(`**Manifest**: \`${alert.dependencyManifestPath}\``)
  if (alert.dependencyScope)
    lines.push(`**Scope**: ${alert.dependencyScope}`)
  lines.push('')
  lines.push(`**GHSA ID**: ${alert.securityAdvisory.ghsaId}`)
  if (alert.securityAdvisory.cveId)
    lines.push(`**CVE ID**: ${alert.securityAdvisory.cveId}`)
  lines.push('')
  lines.push(`**Description**: ${alert.securityAdvisory.description}`)
  lines.push('')

  if (alert.securityAdvisory.cwes.length > 0) {
    lines.push(`**CWEs**: ${alert.securityAdvisory.cwes.map(cwe => `${cwe.cweId} (${cwe.name})`).join(', ')}`)
    lines.push('')
  }

  if (alert.dismissedAt) {
    lines.push(`**Dismissed**: ${new Date(alert.dismissedAt).toLocaleString()}`)
    if (alert.dismissedBy)
      lines.push(`**Dismissed by**: @${alert.dismissedBy}`)
    if (alert.dismissedReason)
      lines.push(`**Reason**: ${alert.dismissedReason}`)
    if (alert.dismissedComment)
      lines.push(`**Comment**: ${alert.dismissedComment}`)
  }

  if (alert.fixedAt)
    lines.push(`**Fixed**: ${new Date(alert.fixedAt).toLocaleString()}`)

  return lines.join('\n')
}

function formatSecurityAdvisories(advisories: SecurityAdvisory[]): string {
  const lines: string[] = []

  lines.push('# Security Advisories')
  lines.push('')

  for (const advisory of advisories) {
    const severityIcon = getSeverityIcon(advisory.severity)
    lines.push(`## ${severityIcon} ${advisory.summary}`)
    lines.push('')
    lines.push(`**GHSA ID**: ${advisory.ghsaId}`)
    if (advisory.cveId)
      lines.push(`**CVE ID**: ${advisory.cveId}`)
    lines.push(`**Severity**: ${advisory.severity}`)
    if (advisory.cvss)
      lines.push(`**CVSS Score**: ${advisory.cvss.score}`)
    lines.push('')
    lines.push(`**Published**: ${new Date(advisory.publishedAt).toLocaleString()}`)
    lines.push(`**Updated**: ${new Date(advisory.updatedAt).toLocaleString()}`)
    if (advisory.withdrawnAt)
      lines.push(`**Withdrawn**: ${new Date(advisory.withdrawnAt).toLocaleString()}`)
    lines.push('')
    lines.push(`**Description**: ${advisory.description}`)
    lines.push('')

    if (advisory.cwes.length > 0) {
      lines.push(`**CWEs**: ${advisory.cwes.map(cwe => `${cwe.cweId} (${cwe.name})`).join(', ')}`)
      lines.push('')
    }

    if (advisory.vulnerabilities.length > 0) {
      lines.push('### Affected Packages')
      lines.push('')
      for (const vuln of advisory.vulnerabilities) {
        lines.push(`- **${vuln.package.name}** (${vuln.package.ecosystem})`)
        lines.push(`  - Vulnerable: ${vuln.vulnerableVersionRange}`)
        if (vuln.firstPatchedVersion)
          lines.push(`  - Patched: ${vuln.firstPatchedVersion.identifier}`)
      }
      lines.push('')
    }

    if (advisory.references.length > 0) {
      lines.push('### References')
      lines.push('')
      for (const ref of advisory.references)
        lines.push(`- ${ref.url}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

function getSeverityIcon(severity: string | null | undefined): string {
  switch (severity) {
    case 'critical':
      return '🔴'
    case 'high':
      return '🟠'
    case 'medium':
      return '🟡'
    case 'low':
      return '🟢'
    default:
      return '⚪'
  }
}
