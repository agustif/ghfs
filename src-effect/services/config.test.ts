import { expect, it } from '@effect/vitest'
import { ConfigProvider, Effect, Exit, Redacted } from 'effect'
import { GhfsConfig } from './config'

it.effect('loads config with all required values', () =>
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
  ))

it.effect('uses default values for optional config', () =>
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
  ))

it.effect('accepts GH_TOKEN as fallback for GITHUB_TOKEN', () =>
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
  ))

it.effect('accepts syncClosed = \'all\'', () =>
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
  ))

it.effect('accepts syncClosed = \'false\' as boolean false', () =>
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
  ))

it.effect('fails when GITHUB_TOKEN and GH_TOKEN are missing', () =>
  Effect.gen(function* () {
    const exit = yield* Effect.exit(GhfsConfig)

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain('GITHUB_TOKEN')
    }
  }).pipe(
    Effect.provide(GhfsConfig.layer),
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnvRecord({
          GHFS_REPO: 'agustif/ghfs',
        }),
      ),
    ),
  ))

it.effect('fails when GHFS_REPO is missing', () =>
  Effect.gen(function* () {
    const exit = yield* Effect.exit(GhfsConfig)

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain('GHFS_REPO')
    }
  }).pipe(
    Effect.provide(GhfsConfig.layer),
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnvRecord({
          GITHUB_TOKEN: 'ghp_testtoken123',
        }),
      ),
    ),
  ))
