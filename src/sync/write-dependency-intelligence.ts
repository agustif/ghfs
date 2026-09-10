import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'pathe'
import type { DependencyIntelligenceData } from './dependency-intelligence'
import { summarizeDependabotAlerts } from './dependency-intelligence'
import { diagnostics } from '../logger'

export interface WriteDependencyIntelligenceOptions {
  directory: string
  data: DependencyIntelligenceData
}

export async function writeDependencyIntelligence(
  options: WriteDependencyIntelligenceOptions,
): Promise<void> {
  const { directory, data } = options
  const securityDir = join(directory, 'security')

  await mkdir(securityDir, { recursive: true })

  if (data.sbom) {
    const sbomPath = join(securityDir, 'sbom.json')
    await writeFile(sbomPath, JSON.stringify(data.sbom, null, 2), 'utf-8')
    diagnostics.debug(`Wrote SBOM to ${sbomPath}`)
  }

  if (data.dependabotAlerts) {
    const alertsSummary = summarizeDependabotAlerts(data.dependabotAlerts)
    const summaryPath = join(securityDir, 'dependabot-summary.json')
    await writeFile(
      summaryPath,
      JSON.stringify(
        {
          total: alertsSummary.total,
          open: alertsSummary.open,
          bySeverity: alertsSummary.bySeverity,
          top10: alertsSummary.top10,
          lastUpdated: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf-8',
    )
    diagnostics.debug(`Wrote Dependabot summary to ${summaryPath}`)

    const alertsPath = join(securityDir, 'dependabot-alerts.json')
    const sanitizedAlerts = data.dependabotAlerts.map((alert) => {
      const sanitized = { ...alert }
      return sanitized
    })
    await writeFile(alertsPath, JSON.stringify(sanitizedAlerts, null, 2), 'utf-8')
    diagnostics.debug(`Wrote ${data.dependabotAlerts.length} Dependabot alerts to ${alertsPath}`)
  }

  if (data.dependencyGraphSummary) {
    const graphPath = join(securityDir, 'dependency-graph-summary.json')
    await writeFile(
      graphPath,
      JSON.stringify(
        {
          ...data.dependencyGraphSummary,
          lastUpdated: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf-8',
    )
    diagnostics.debug(`Wrote dependency graph summary to ${graphPath}`)
  }

  if (data.attestationsSummary) {
    const attestationsPath = join(securityDir, 'attestations-summary.json')
    await writeFile(attestationsPath, JSON.stringify(data.attestationsSummary, null, 2), 'utf-8')
    diagnostics.debug(`Wrote attestations summary to ${attestationsPath}`)
  }

  if (data.dependencyReviews && Object.keys(data.dependencyReviews).length > 0) {
    const reviewsDir = join(securityDir, 'dependency-review')
    await mkdir(reviewsDir, { recursive: true })

    for (const [pullNumber, review] of Object.entries(data.dependencyReviews)) {
      const reviewPath = join(reviewsDir, `pr-${pullNumber}.json`)
      await writeFile(reviewPath, JSON.stringify(review, null, 2), 'utf-8')
      diagnostics.debug(`Wrote dependency review for PR #${pullNumber} to ${reviewPath}`)
    }
  }

  const readmePath = join(securityDir, 'README.md')
  const readmeContent = generateSecurityReadme(data)
  await writeFile(readmePath, readmeContent, 'utf-8')
  diagnostics.debug(`Wrote security README to ${readmePath}`)
}

function generateSecurityReadme(data: DependencyIntelligenceData): string {
  const lines: string[] = [
    '# Security & Dependency Intelligence',
    '',
    'This directory contains security and dependency information for the repository.',
    '',
    '## Contents',
    '',
  ]

  if (data.sbom) {
    lines.push('### SBOM (Software Bill of Materials)')
    lines.push('')
    lines.push('- **File**: `sbom.json`')
    lines.push(`- **Format**: SPDX ${data.sbom.spdxVersion}`)
    lines.push(`- **Packages**: ${data.sbom.packages.length}`)
    lines.push('')
  }

  if (data.dependabotAlerts) {
    const summary = summarizeDependabotAlerts(data.dependabotAlerts)
    lines.push('### Dependabot Alerts')
    lines.push('')
    lines.push('- **Files**: `dependabot-alerts.json`, `dependabot-summary.json`')
    lines.push(`- **Total Alerts**: ${summary.total}`)
    lines.push(`- **Open Alerts**: ${summary.open}`)
    if (Object.keys(summary.bySeverity).length > 0) {
      lines.push('- **By Severity**:')
      for (const [severity, count] of Object.entries(summary.bySeverity).sort((a, b) => b[1] - a[1])) {
        lines.push(`  - ${severity}: ${count}`)
      }
    }
    lines.push('')
  }

  if (data.dependencyGraphSummary?.hasSubmissions) {
    lines.push('### Dependency Graph')
    lines.push('')
    lines.push('- **File**: `dependency-graph-summary.json`')
    lines.push(`- **Submissions**: ${data.dependencyGraphSummary.submissionCount || 0}`)
    lines.push(`- **Manifests**: ${data.dependencyGraphSummary.manifestCount || 0}`)
    lines.push(`- **Dependencies**: ${data.dependencyGraphSummary.dependencyCount || 0}`)
    if (data.dependencyGraphSummary.latestSubmissionDate) {
      lines.push(`- **Latest Submission**: ${data.dependencyGraphSummary.latestSubmissionDate}`)
    }
    lines.push('')
  }

  if (data.attestationsSummary && data.attestationsSummary.totalCount > 0) {
    lines.push('### Artifact Attestations')
    lines.push('')
    lines.push('- **File**: `attestations-summary.json`')
    lines.push(`- **Total Attestations**: ${data.attestationsSummary.totalCount}`)
    lines.push('')
  }

  if (data.dependencyReviews && Object.keys(data.dependencyReviews).length > 0) {
    lines.push('### Dependency Reviews (Pull Requests)')
    lines.push('')
    lines.push('- **Directory**: `dependency-review/`')
    lines.push(`- **Pull Requests**: ${Object.keys(data.dependencyReviews).length}`)
    lines.push('')
    for (const [pullNumber, review] of Object.entries(data.dependencyReviews)) {
      lines.push(`- **PR #${pullNumber}**:`)
      lines.push(`  - Changes: ${review.changes.length}`)
      lines.push(`  - Vulnerabilities Introduced: ${review.vulnerabilitiesIntroduced}`)
      lines.push(`  - Vulnerabilities Fixed: ${review.vulnerabilitiesFixed}`)
    }
    lines.push('')
  }

  lines.push('## Notes')
  lines.push('')
  lines.push('- All files are generated during `ghfs sync`')
  lines.push('- No secret values are stored in this directory')
  lines.push('- Files may be empty or missing if the repository does not have the feature enabled')
  lines.push('')
  lines.push(`Last updated: ${new Date().toISOString()}`)
  lines.push('')

  return lines.join('\n')
}
