import { ConfigProvider, Effect, Redacted } from 'effect'
import { describe, expect, it } from 'vitest'
import { GhfsConfig } from './config'

describe('ghfsConfig', () => {
  it('loads config with all required values', async () => {
    const testProvider = ConfigProvider.fromEnvRecord({
      GHFS_DIRECTORY: '/test/dir',
      GITHUB_TOKEN: 'ghp_testtoken123',
      GHFS_REPO: 'agustif/ghfs',
    })

    const program = Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(config.directory).toBe('/test/dir')
      expect(Redacted.value(config.token)).toBe('ghp_testtoken123')
      expect(config.repo).toBe('agustif/ghfs')
      expect(config.syncIssues).toBe(true)
      expect(config.syncPulls).toBe(true)
      expect(config.syncClosed).toBe('existing')
      expect(config.syncPatches).toBe('open')
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(ConfigProvider.layer(testProvider)),
    )

    await Effect.runPromise(program)
  })

  it('uses default values for optional config', async () => {
    const testProvider = ConfigProvider.fromEnvRecord({
      GITHUB_TOKEN: 'ghp_testtoken123',
      GHFS_REPO: 'agustif/ghfs',
    })

    const program = Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(config.directory).toBe('.ghfs')
      expect(config.syncIssues).toBe(true)
      expect(config.syncPulls).toBe(true)
      expect(config.syncClosed).toBe('existing')
      expect(config.syncPatches).toBe('open')
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(ConfigProvider.layer(testProvider)),
    )

    await Effect.runPromise(program)
  })

  it('accepts GH_TOKEN as fallback for GITHUB_TOKEN', async () => {
    const testProvider = ConfigProvider.fromEnvRecord({
      GH_TOKEN: 'gh_fallbacktoken',
      GHFS_REPO: 'agustif/ghfs',
    })

    const program = Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(Redacted.value(config.token)).toBe('gh_fallbacktoken')
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(ConfigProvider.layer(testProvider)),
    )

    await Effect.runPromise(program)
  })

  it('accepts syncClosed = \'all\'', async () => {
    const testProvider = ConfigProvider.fromEnvRecord({
      GITHUB_TOKEN: 'ghp_testtoken123',
      GHFS_REPO: 'agustif/ghfs',
      GHFS_SYNC_CLOSED: 'all',
    })

    const program = Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(config.syncClosed).toBe('all')
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(ConfigProvider.layer(testProvider)),
    )

    await Effect.runPromise(program)
  })

  it('accepts syncClosed = \'false\' as boolean false', async () => {
    const testProvider = ConfigProvider.fromEnvRecord({
      GITHUB_TOKEN: 'ghp_testtoken123',
      GHFS_REPO: 'agustif/ghfs',
      GHFS_SYNC_CLOSED: 'false',
    })

    const program = Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(config.syncClosed).toBe(false)
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(ConfigProvider.layer(testProvider)),
    )

    await Effect.runPromise(program)
  })

  it('fails when GITHUB_TOKEN and GH_TOKEN are missing', async () => {
    const testProvider = ConfigProvider.fromEnvRecord({
      GHFS_REPO: 'agustif/ghfs',
    })

    const program = Effect.gen(function* () {
      yield* GhfsConfig
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(ConfigProvider.layer(testProvider)),
      Effect.flip,
      Effect.map((error) => {
        expect(String(error)).toContain('GITHUB_TOKEN')
        return error
      }),
    )

    await Effect.runPromise(program)
  })

  it('fails when GHFS_REPO is missing', async () => {
    const testProvider = ConfigProvider.fromEnvRecord({
      GITHUB_TOKEN: 'ghp_testtoken123',
    })

    const program = Effect.gen(function* () {
      yield* GhfsConfig
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(ConfigProvider.layer(testProvider)),
      Effect.flip,
      Effect.map((error) => {
        expect(String(error)).toContain('GHFS_REPO')
        return error
      }),
    )

    await Effect.runPromise(program)
  })
})
