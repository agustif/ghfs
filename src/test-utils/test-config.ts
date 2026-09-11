import type { GhfsResolvedConfig } from '../types/config'

export function createTestConfig(overrides: Partial<GhfsResolvedConfig> = {}): GhfsResolvedConfig {
  return {
    cwd: overrides.cwd ?? '/tmp/ghfs-test',
    repo: overrides.repo ?? 'owner/repo',
    directory: overrides.directory ?? '.ghfs',
    bots: overrides.bots ?? [],
    auth: { token: overrides.auth?.token ?? 'test-token' },
    sync: {
      issues: true,
      pulls: true,
      ...(overrides.sync ?? {}),
    },
    search: {
      codeTodos: false,
      commitRefs: false,
      issueQueries: {},
      mentions: false,
      maxResults: 100,
      syncState: false,
      ...(overrides.search ?? {}),
    },
    extended: {
      ...(overrides.extended ?? {}),
    },
  } as GhfsResolvedConfig
}
