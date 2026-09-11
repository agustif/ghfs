import type { DependabotAlert } from '../types/security'
// @ts-nocheck
import { describe, expect, it } from 'vitest'
import { summarizeDependabotAlerts } from './dependency-intelligence'

describe('summarizeDependabotAlerts', () => {
  it('should return empty summary for no alerts', () => {
    const summary = summarizeDependabotAlerts([])
    expect(summary.total).toBe(0)
    expect(summary.open).toBe(0)
    expect(summary.bySeverity).toEqual({})
    expect(summary.top10).toEqual([])
  })

  it('should return empty summary for undefined alerts', () => {
    const summary = summarizeDependabotAlerts(undefined)
    expect(summary.total).toBe(0)
    expect(summary.open).toBe(0)
    expect(summary.bySeverity).toEqual({})
    expect(summary.top10).toEqual([])
  })

  it('should count alerts by severity', () => {
    const alerts: DependabotAlert[] = [
      createAlert(1, 'open', 'critical'),
      createAlert(2, 'open', 'high'),
      createAlert(3, 'open', 'high'),
      createAlert(4, 'open', 'moderate'),
      createAlert(5, 'dismissed', 'critical'),
    ]

    const summary = summarizeDependabotAlerts(alerts)
    expect(summary.total).toBe(5)
    expect(summary.open).toBe(4)
    expect(summary.bySeverity).toEqual({
      critical: 1,
      high: 2,
      moderate: 1,
    })
  })

  it('should sort top10 by severity', () => {
    const alerts: DependabotAlert[] = [
      createAlert(1, 'open', 'low', 'Package A'),
      createAlert(2, 'open', 'critical', 'Package B'),
      createAlert(3, 'open', 'moderate', 'Package C'),
      createAlert(4, 'open', 'high', 'Package D'),
    ]

    const summary = summarizeDependabotAlerts(alerts)
    expect(summary.top10.length).toBe(4)
    expect(summary.top10[0].severity).toBe('critical')
    expect(summary.top10[0].package).toBe('Package B')
    expect(summary.top10[1].severity).toBe('high')
    expect(summary.top10[2].severity).toBe('moderate')
    expect(summary.top10[3].severity).toBe('low')
  })

  it('should limit to top 10 alerts', () => {
    const alerts: DependabotAlert[] = Array.from({ length: 20 }, (_, i) =>
      createAlert(i + 1, 'open', 'high'))

    const summary = summarizeDependabotAlerts(alerts)
    expect(summary.total).toBe(20)
    expect(summary.open).toBe(20)
    expect(summary.top10.length).toBe(10)
  })
})

function createAlert(
  number: number,
  state: 'open' | 'dismissed' | 'fixed',
  severity: 'low' | 'moderate' | 'high' | 'critical',
  packageName = 'test-package',
): DependabotAlert {
  return {
    number,
    state,
    dependency: {
      name: packageName,
      version: '1.0.0',
      packageManager: 'npm',
    },
    vulnerability: {
      severity,
      summary: `Test vulnerability ${number}`,
      advisoryUrl: `https://github.com/advisories/GHSA-${number}`,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    url: `https://github.com/test/repo/security/dependabot/${number}`,
  }
}
