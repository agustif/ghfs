// @ts-nocheck
import type { RepositoryProvider } from '../types/provider'
import type { SecuritySummary } from '../types/security'

export async function buildSecuritySummary(
  provider: RepositoryProvider,
  syncedAt: string,
): Promise<SecuritySummary | null> {
  try {
    const [dependabotAlerts, codeScanningAlerts, secretScanningAlerts] = await Promise.all([
      provider.fetchDependabotAlerts?.({ limit: 100 }).catch(() => []),
      provider.fetchCodeScanningAlerts?.({ limit: 100 }).catch(() => []),
      provider.fetchSecretScanningAlerts?.({ limit: 100 }).catch(() => []),
    ])

    if (!dependabotAlerts && !codeScanningAlerts && !secretScanningAlerts)
      return null

    const dependabot = {
      total: dependabotAlerts?.length ?? 0,
      open: dependabotAlerts?.filter(a => a.state === 'open').length ?? 0,
      critical: dependabotAlerts?.filter(a => a.state === 'open' && a.severity === 'critical').length ?? 0,
      high: dependabotAlerts?.filter(a => a.state === 'open' && a.severity === 'high').length ?? 0,
      medium: dependabotAlerts?.filter(a => a.state === 'open' && a.severity === 'medium').length ?? 0,
      low: dependabotAlerts?.filter(a => a.state === 'open' && a.severity === 'low').length ?? 0,
      topAlerts: (dependabotAlerts ?? [])
        .filter(a => a.state === 'open')
        .sort((a, b) => {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        })
        .slice(0, 10),
    }

    const codeScanning = {
      total: codeScanningAlerts?.length ?? 0,
      open: codeScanningAlerts?.filter(a => a.state === 'open').length ?? 0,
      critical: codeScanningAlerts?.filter(a => a.state === 'open' && a.severity === 'critical').length ?? 0,
      high: codeScanningAlerts?.filter(a => a.state === 'open' && a.severity === 'high').length ?? 0,
      medium: codeScanningAlerts?.filter(a => a.state === 'open' && a.severity === 'medium').length ?? 0,
      low: codeScanningAlerts?.filter(a => a.state === 'open' && a.severity === 'low').length ?? 0,
      topAlerts: (codeScanningAlerts ?? [])
        .filter(a => a.state === 'open')
        .sort((a, b) => {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        })
        .slice(0, 10),
    }

    const secretScanning = {
      total: secretScanningAlerts?.length ?? 0,
      open: secretScanningAlerts?.filter(a => a.state === 'open').length ?? 0,
      topAlerts: (secretScanningAlerts ?? [])
        .filter(a => a.state === 'open')
        .slice(0, 10),
    }

    return {
      dependabot,
      codeScanning,
      secretScanning,
      syncedAt,
    }
  }
  catch {
    return null
  }
}
