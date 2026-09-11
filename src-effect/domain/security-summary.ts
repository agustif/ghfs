/**
 * Security summary snapshot (Schema-first) — lean Dependabot / code-scanning /
 * secret-scanning counts + slim topAlerts for security-summary.json.
 *
 * Copy to: src-effect/domain/security-summary.ts
 * Then export from domain/index.ts: `export * from "./security-summary"`
 *
 * Matches legacy `buildSecuritySummary` shape in src/sync/security-summary.ts:
 * `{ dependabot, codeScanning, secretScanning, syncedAt }`.
 *
 * LEAN by design:
 * - topAlerts are slim rows (number, severity?, package|rule|secretType, url)
 * - Do NOT embed full DependabotAlert / CodeScanningAlert / SecretScanningAlert
 *   kitchen-sink (securityAdvisory blobs, locations, secret cleartext, …)
 * - Secret rows never carry `secret` — redact by omission
 *
 * Snapshot path this slice: `security-summary/security-summary.json`
 * Legacy also wrote `security/summary.json` (+ markdown) via sync-security —
 * sibling-style dir under security-summary/ matches interaction-limits / metadata.
 * MirrorFs markdown OOS.
 *
 * Wire via additive GitHubClient.fetchDependabotAlerts /
 * fetchCodeScanningAlerts / fetchSecretScanningAlerts — see snippet.
 */
import { Schema } from 'effect'

/** Alert severity used for Dependabot / code-scanning counts + sort. */
export const SecuritySeverity = Schema.Literals([
  'low',
  'medium',
  'high',
  'critical',
])
export type SecuritySeverity = typeof SecuritySeverity.Type

/** Wire alert state (secret-scanning `resolved` is mapped to `dismissed` in client). */
export const SecurityAlertState = Schema.Literals([
  'open',
  'dismissed',
  'fixed',
])
export type SecurityAlertState = typeof SecurityAlertState.Type

/**
 * Lean Dependabot alert row returned by fetchDependabotAlerts (NOT kitchen-sink).
 * Enough to aggregate counts + slim topAlerts.
 */
export class DependabotAlertLean extends Schema.Class<DependabotAlertLean>(
  'DependabotAlertLean',
)({
  number: Schema.Int,
  state: SecurityAlertState,
  severity: SecuritySeverity,
  /** Vulnerable package name (wire security_vulnerability.package.name). */
  package: Schema.String,
  url: Schema.String,
}) {}

/**
 * Lean code-scanning alert row returned by fetchCodeScanningAlerts.
 */
export class CodeScanningAlertLean extends Schema.Class<CodeScanningAlertLean>(
  'CodeScanningAlertLean',
)({
  number: Schema.Int,
  state: SecurityAlertState,
  /** Prefer rule.security_severity_level; fall back to rule.severity / low. */
  severity: SecuritySeverity,
  /** Rule id or name. */
  rule: Schema.String,
  url: Schema.String,
}) {}

/**
 * Lean secret-scanning alert row — NEVER includes secret cleartext.
 */
export class SecretScanningAlertLean extends Schema.Class<SecretScanningAlertLean>(
  'SecretScanningAlertLean',
)({
  number: Schema.Int,
  state: SecurityAlertState,
  secretType: Schema.String,
  url: Schema.String,
}) {}

/** Slim Dependabot topAlert (open, severity-sorted, max 10). */
export const DependabotTopAlert = Schema.Struct({
  number: Schema.Int,
  severity: SecuritySeverity,
  package: Schema.String,
  url: Schema.String,
})
export type DependabotTopAlert = typeof DependabotTopAlert.Type

/** Slim code-scanning topAlert (open, severity-sorted, max 10). */
export const CodeScanningTopAlert = Schema.Struct({
  number: Schema.Int,
  severity: SecuritySeverity,
  rule: Schema.String,
  url: Schema.String,
})
export type CodeScanningTopAlert = typeof CodeScanningTopAlert.Type

/** Slim secret-scanning topAlert (open, first 10) — no secret field. */
export const SecretScanningTopAlert = Schema.Struct({
  number: Schema.Int,
  secretType: Schema.String,
  url: Schema.String,
})
export type SecretScanningTopAlert = typeof SecretScanningTopAlert.Type

/** Dependabot bucket matching legacy buildSecuritySummary.dependabot. */
export const DependabotSummaryBucket = Schema.Struct({
  total: Schema.Int,
  open: Schema.Int,
  critical: Schema.Int,
  high: Schema.Int,
  medium: Schema.Int,
  low: Schema.Int,
  topAlerts: Schema.Array(DependabotTopAlert),
})
export type DependabotSummaryBucket = typeof DependabotSummaryBucket.Type

/** Code-scanning bucket matching legacy buildSecuritySummary.codeScanning. */
export const CodeScanningSummaryBucket = Schema.Struct({
  total: Schema.Int,
  open: Schema.Int,
  critical: Schema.Int,
  high: Schema.Int,
  medium: Schema.Int,
  low: Schema.Int,
  topAlerts: Schema.Array(CodeScanningTopAlert),
})
export type CodeScanningSummaryBucket = typeof CodeScanningSummaryBucket.Type

/** Secret-scanning bucket matching legacy buildSecuritySummary.secretScanning. */
export const SecretScanningSummaryBucket = Schema.Struct({
  total: Schema.Int,
  open: Schema.Int,
  topAlerts: Schema.Array(SecretScanningTopAlert),
})
export type SecretScanningSummaryBucket = typeof SecretScanningSummaryBucket.Type

/**
 * Lean security-summary snapshot (single resource written after three limited fetches).
 * Wire via additive fetch*Alerts — see snippet.
 */
export class SecuritySummary extends Schema.Class<SecuritySummary>(
  'SecuritySummary',
)({
  dependabot: DependabotSummaryBucket,
  codeScanning: CodeScanningSummaryBucket,
  secretScanning: SecretScanningSummaryBucket,
  syncedAt: Schema.String,
}) {}

const SEVERITY_ORDER: Record<SecuritySeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

/**
 * Pure aggregator — mirrors legacy src/sync/security-summary.ts buildSecuritySummary
 * but emits slim topAlerts (no kitchen-sink alert blobs / no secret cleartext).
 */
export function buildSecuritySummary(input: {
  readonly dependabotAlerts: ReadonlyArray<DependabotAlertLean>
  readonly codeScanningAlerts: ReadonlyArray<CodeScanningAlertLean>
  readonly secretScanningAlerts: ReadonlyArray<SecretScanningAlertLean>
  readonly syncedAt: string
}): SecuritySummary {
  const dependabotAlerts = input.dependabotAlerts
  const codeScanningAlerts = input.codeScanningAlerts
  const secretScanningAlerts = input.secretScanningAlerts

  const dependabot = {
    total: dependabotAlerts.length,
    open: dependabotAlerts.filter((a) => a.state === 'open').length,
    critical: dependabotAlerts.filter(
      (a) => a.state === 'open' && a.severity === 'critical',
    ).length,
    high: dependabotAlerts.filter(
      (a) => a.state === 'open' && a.severity === 'high',
    ).length,
    medium: dependabotAlerts.filter(
      (a) => a.state === 'open' && a.severity === 'medium',
    ).length,
    low: dependabotAlerts.filter(
      (a) => a.state === 'open' && a.severity === 'low',
    ).length,
    topAlerts: dependabotAlerts
      .filter((a) => a.state === 'open')
      .slice()
      .sort(
        (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
      )
      .slice(0, 10)
      .map((a) => ({
        number: a.number,
        severity: a.severity,
        package: a.package,
        url: a.url,
      })),
  }

  const codeScanning = {
    total: codeScanningAlerts.length,
    open: codeScanningAlerts.filter((a) => a.state === 'open').length,
    critical: codeScanningAlerts.filter(
      (a) => a.state === 'open' && a.severity === 'critical',
    ).length,
    high: codeScanningAlerts.filter(
      (a) => a.state === 'open' && a.severity === 'high',
    ).length,
    medium: codeScanningAlerts.filter(
      (a) => a.state === 'open' && a.severity === 'medium',
    ).length,
    low: codeScanningAlerts.filter(
      (a) => a.state === 'open' && a.severity === 'low',
    ).length,
    topAlerts: codeScanningAlerts
      .filter((a) => a.state === 'open')
      .slice()
      .sort(
        (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
      )
      .slice(0, 10)
      .map((a) => ({
        number: a.number,
        severity: a.severity,
        rule: a.rule,
        url: a.url,
      })),
  }

  const secretScanning = {
    total: secretScanningAlerts.length,
    open: secretScanningAlerts.filter((a) => a.state === 'open').length,
    topAlerts: secretScanningAlerts
      .filter((a) => a.state === 'open')
      .slice(0, 10)
      .map((a) => ({
        number: a.number,
        secretType: a.secretType,
        url: a.url,
      })),
  }

  return new SecuritySummary({
    dependabot,
    codeScanning,
    secretScanning,
    syncedAt: input.syncedAt,
  })
}
