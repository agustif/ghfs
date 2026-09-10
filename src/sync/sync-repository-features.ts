import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import {
  BILLING_DIR_NAME,
  BILLING_FILE_NAME,
  CODE_SCANNING_DIR_NAME,
  CODE_SCANNING_FILE_NAME,
  CODESPACES_DIR_NAME,
  CODESPACES_FILE_NAME,
  DEPENDABOT_DIR_NAME,
  DEPENDABOT_FILE_NAME,
  PACKAGES_DIR_NAME,
  PACKAGES_FILE_NAME,
  SECRET_SCANNING_DIR_NAME,
  SECRET_SCANNING_FILE_NAME,
  SECURITY_DIR_NAME,
} from '../constants'

/**
 * Fetches and writes additional GitHub features data to filesystem:
 * - Billing usage summary (if accessible)
 * - Packages (GHCR, npm, etc.)
 * - Codespaces
 * - Secret scanning alerts (with redacted secrets)
 * - Dependabot alerts (full list, no cap)
 * - Code scanning alerts (full list, no cap)
 *
 * All operations are graceful — if an API endpoint fails due to permissions
 * or feature unavailability, we skip that section rather than failing the sync.
 */
export async function writeRepositoryFeatures(context: SyncContext): Promise<void> {
  await Promise.all([
    writeBillingData(context),
    writePackagesData(context),
    writeCodespacesData(context),
    writeSecretScanningData(context),
    writeDependabotData(context),
    writeCodeScanningData(context),
  ])
}

async function writeBillingData(context: SyncContext): Promise<void> {
  try {
    const billingData = await context.provider.fetchBillingUsageSummary()
    if (!billingData)
      return

    const billingDir = join(context.storageDirAbsolute, BILLING_DIR_NAME)
    await mkdir(billingDir, { recursive: true })
    await writeFile(
      join(billingDir, BILLING_FILE_NAME),
      `${JSON.stringify(billingData, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
    // Silently skip if billing API unavailable or lacks permission
  }
}

async function writePackagesData(context: SyncContext): Promise<void> {
  try {
    const packages = await context.provider.fetchPackages()
    if (packages.length === 0)
      return

    const packagesDir = join(context.storageDirAbsolute, PACKAGES_DIR_NAME)
    await mkdir(packagesDir, { recursive: true })
    await writeFile(
      join(packagesDir, PACKAGES_FILE_NAME),
      `${JSON.stringify(packages, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
    // Silently skip if packages unavailable
  }
}

async function writeCodespacesData(context: SyncContext): Promise<void> {
  try {
    const codespaces = await context.provider.fetchCodespaces()
    if (codespaces.length === 0)
      return

    const codespacesDir = join(context.storageDirAbsolute, CODESPACES_DIR_NAME)
    await mkdir(codespacesDir, { recursive: true })
    await writeFile(
      join(codespacesDir, CODESPACES_FILE_NAME),
      `${JSON.stringify(codespaces, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
    // Silently skip if codespaces unavailable or lacks scope
  }
}

async function writeSecretScanningData(context: SyncContext): Promise<void> {
  try {
    const alerts = await context.provider.fetchSecretScanningAlerts()
    if (alerts.length === 0)
      return

    const securityDir = join(context.storageDirAbsolute, SECURITY_DIR_NAME)
    const secretScanningDir = join(securityDir, SECRET_SCANNING_DIR_NAME)
    await mkdir(secretScanningDir, { recursive: true })
    await writeFile(
      join(secretScanningDir, SECRET_SCANNING_FILE_NAME),
      `${JSON.stringify(alerts, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
    // Silently skip if secret scanning unavailable or lacks access
  }
}

async function writeDependabotData(context: SyncContext): Promise<void> {
  try {
    const alerts = await context.provider.fetchDependabotAlerts()
    if (alerts.length === 0)
      return

    const securityDir = join(context.storageDirAbsolute, SECURITY_DIR_NAME)
    const dependabotDir = join(securityDir, DEPENDABOT_DIR_NAME)
    await mkdir(dependabotDir, { recursive: true })
    await writeFile(
      join(dependabotDir, DEPENDABOT_FILE_NAME),
      `${JSON.stringify(alerts, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
    // Silently skip if Dependabot unavailable or not enabled
  }
}

async function writeCodeScanningData(context: SyncContext): Promise<void> {
  try {
    const alerts = await context.provider.fetchCodeScanningAlerts()
    if (alerts.length === 0)
      return

    const securityDir = join(context.storageDirAbsolute, SECURITY_DIR_NAME)
    const codeScanningDir = join(securityDir, CODE_SCANNING_DIR_NAME)
    await mkdir(codeScanningDir, { recursive: true })
    await writeFile(
      join(codeScanningDir, CODE_SCANNING_FILE_NAME),
      `${JSON.stringify(alerts, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
    // Silently skip if code scanning unavailable or not configured
  }
}
