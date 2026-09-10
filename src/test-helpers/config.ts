import type { GhfsResolvedConfig } from '../types'

export function createTestSyncConfig(overrides: Partial<GhfsResolvedConfig['sync']> = {}): GhfsResolvedConfig['sync'] {
  return {
    issues: true,
    pulls: true,
    closed: false,
    patches: 'open',
    meta: true,
    labelsAndMilestones: true,
    releases: true,
    rulesets: true,
    constitution: true,
    actions: true,
    pullIntelligence: {
      reviews: true,
      checks: true,
      files: true,
      gate: true,
    },
    ...overrides,
  }
}
