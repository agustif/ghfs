import type { GhfsResolvedConfig } from '../types/config'
import process from 'node:process'

export function createTestConfig(overrides: Partial<GhfsResolvedConfig> = {}): GhfsResolvedConfig {
  return {
    cwd: process.cwd(),
    repo: 'owner/repo',
    directory: '.ghfs',
    bots: [],
    auth: {
      token: '',
    },
    sync: {
      issues: true,
      pulls: true,
      closed: false,
      patches: 'open',
      actions: false,
      actionsRunsPerWorkflow: 30,
    },
    ...overrides,
  }
}
