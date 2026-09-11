import { expect, it } from '@effect/vitest'
import { ConfigProvider, Effect, Exit, Redacted } from 'effect'
import { GhfsConfig } from './config'

it('loads config with all required values', async () =>
  Effect.runPromise(
    Effect.gen(function* () {
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
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromEnvRecord({
            GHFS_DIRECTORY: '/test/dir',
            GITHUB_TOKEN: 'ghp_testtoken123',
            GHFS_REPO: 'agustif/ghfs',
          }),
        ),
      ),
    ),
  ))

it('uses default values for optional config', async () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(config.directory).toBe('.ghfs')
      expect(config.syncIssues).toBe(true)
      expect(config.syncPulls).toBe(true)
      expect(config.syncClosed).toBe('existing')
      expect(config.syncPatches).toBe('open')
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromEnvRecord({
            GITHUB_TOKEN: 'ghp_testtoken123',
            GHFS_REPO: 'agustif/ghfs',
          }),
        ),
      ),
    ),
  ))

it('accepts GH_TOKEN as fallback for GITHUB_TOKEN', async () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(Redacted.value(config.token)).toBe('gh_fallbacktoken')
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromEnvRecord({
            GH_TOKEN: 'gh_fallbacktoken',
            GHFS_REPO: 'agustif/ghfs',
          }),
        ),
      ),
    ),
  ))

it('accepts syncClosed = \'all\'', async () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(config.syncClosed).toBe('all')
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromEnvRecord({
            GITHUB_TOKEN: 'ghp_testtoken123',
            GHFS_REPO: 'agustif/ghfs',
            GHFS_SYNC_CLOSED: 'all',
          }),
        ),
      ),
    ),
  ))

it('accepts syncClosed = \'false\' as boolean false', async () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(config.syncClosed).toBe(false)
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromEnvRecord({
            GITHUB_TOKEN: 'ghp_testtoken123',
            GHFS_REPO: 'agustif/ghfs',
            GHFS_SYNC_CLOSED: 'false',
          }),
        ),
      ),
    ),
  ))

it('fails when GITHUB_TOKEN and GH_TOKEN are missing', async () => {
  const exit = await Effect.runPromiseExit(
    Effect.gen(function* () {
      return yield* GhfsConfig
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromEnvRecord({
            GHFS_REPO: 'agustif/ghfs',
          }),
        ),
      ),
    ),
  )

  expect(Exit.isFailure(exit)).toBe(true)
  if (Exit.isFailure(exit)) {
    expect(String(exit.cause)).toMatch(/GITHUB_TOKEN|GH_TOKEN|Config/)
  }
})

it('fails when GHFS_REPO is missing', async () => {
  const exit = await Effect.runPromiseExit(
    Effect.gen(function* () {
      return yield* GhfsConfig
    }).pipe(
      Effect.provide(GhfsConfig.layer),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromEnvRecord({
            GITHUB_TOKEN: 'ghp_testtoken123',
          }),
        ),
      ),
    ),
  )

  expect(Exit.isFailure(exit)).toBe(true)
  if (Exit.isFailure(exit)) {
    expect(String(exit.cause)).toMatch(/GHFS_REPO|Config/)
  }
})
