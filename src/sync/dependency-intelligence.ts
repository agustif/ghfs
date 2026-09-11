// @ts-nocheck
import type { RepositoryProvider } from '../types/provider'
import type {
  AttestationsSummary,
  DependabotAlert,
  DependencyGraphSummary,
  DependencyReview,
  SbomData,
} from '../types/security'
import { diagnostics } from '../logger'

export interface DependencyIntelligenceData {
  dependabotAlerts?: DependabotAlert[]
  sbom?: SbomData | null
  dependencyGraphSummary?: DependencyGraphSummary | null
  attestationsSummary?: AttestationsSummary | null
  dependencyReviews?: Record<number, DependencyReview>
}

export async function fetchDependencyIntelligence(
  provider: RepositoryProvider,
  pullNumbers: number[] = [],
): Promise<DependencyIntelligenceData> {
  const data: DependencyIntelligenceData = {}

  if (provider.fetchDependabotAlerts) {
    try {
      data.dependabotAlerts = await provider.fetchDependabotAlerts()
      diagnostics.debug(`Fetched ${data.dependabotAlerts.length} Dependabot alerts`)
    }
    catch (error) {
      diagnostics.warn('Failed to fetch Dependabot alerts:', error)
    }
  }

  if (provider.fetchSbom) {
    try {
      data.sbom = await provider.fetchSbom()
      if (data.sbom)
        diagnostics.debug(`Fetched SBOM with ${data.sbom.packages.length} packages`)
    }
    catch (error) {
      diagnostics.warn('Failed to fetch SBOM:', error)
    }
  }

  if (provider.fetchDependencyGraphSummary) {
    try {
      data.dependencyGraphSummary = await provider.fetchDependencyGraphSummary()
      if (data.dependencyGraphSummary?.hasSubmissions) {
        diagnostics.debug(
          `Dependency graph: ${data.dependencyGraphSummary.submissionCount} submissions, ${data.dependencyGraphSummary.manifestCount} manifests`,
        )
      }
    }
    catch (error) {
      diagnostics.warn('Failed to fetch dependency graph summary:', error)
    }
  }

  if (provider.fetchAttestationsSummary) {
    try {
      data.attestationsSummary = await provider.fetchAttestationsSummary()
      if (data.attestationsSummary)
        diagnostics.debug(`Fetched ${data.attestationsSummary.totalCount} attestations`)
    }
    catch (error) {
      diagnostics.warn('Failed to fetch attestations summary:', error)
    }
  }

  if (provider.fetchDependencyReview && pullNumbers.length > 0) {
    data.dependencyReviews = {}
    for (const pullNumber of pullNumbers) {
      try {
        const review = await provider.fetchDependencyReview(pullNumber)
        if (review)
          data.dependencyReviews[pullNumber] = review
        diagnostics.debug(`Fetched dependency review for PR #${pullNumber}`)
      }
      catch (error) {
        diagnostics.warn(`Failed to fetch dependency review for PR #${pullNumber}:`, error)
      }
    }
  }

  return data
}

export function summarizeDependabotAlerts(alerts: DependabotAlert[] | undefined): {
  total: number
  open: number
  bySeverity: Record<string, number>
  top10: Array<{ number: number, severity: string, summary: string, package: string }>
} {
  if (!alerts || alerts.length === 0) {
    return {
      total: 0,
      open: 0,
      bySeverity: {},
      top10: [],
    }
  }

  const openAlerts = alerts.filter(a => a.state === 'open')
  const bySeverity: Record<string, number> = {}

  for (const alert of openAlerts) {
    const severity = alert.vulnerability.severity
    bySeverity[severity] = (bySeverity[severity] || 0) + 1
  }

  const severityOrder: Record<string, number> = {
    critical: 4,
    high: 3,
    moderate: 2,
    low: 1,
  }

  const top10 = openAlerts
    .sort((a, b) => {
      const severityDiff
        = (severityOrder[b.vulnerability.severity] || 0) - (severityOrder[a.vulnerability.severity] || 0)
      if (severityDiff !== 0)
        return severityDiff
      return a.number - b.number
    })
    .slice(0, 10)
    .map(alert => ({
      number: alert.number,
      severity: alert.vulnerability.severity,
      summary: alert.vulnerability.summary,
      package: alert.dependency.name,
    }))

  return {
    total: alerts.length,
    open: openAlerts.length,
    bySeverity,
    top10,
  }
}
