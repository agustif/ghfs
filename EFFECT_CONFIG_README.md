# Effect Config + @effect/vitest Adoption

This PR demonstrates proper Effect Config usage and establishes Effect-native testing patterns using @effect/vitest.

## What's Implemented

### ✅ Effect Config (Already Complete)
The `GhfsConfig` service in `src-effect/services/config.ts` already demonstrates proper Effect Config usage:
- `Config.redacted()` for secure GitHub token handling (GITHUB_TOKEN with GH_TOKEN fallback)
- `Config.string()` with validation for repo and directory settings
- `Config.boolean()` for feature toggles (syncIssues, syncPulls)
- Custom validation for `syncClosed` and `syncPatches` enum values
- Proper default values using `Config.withDefault()`
- ConfigProvider wired only at CLI edge in `src-effect/cli/main.ts`

### ✅ Effect Testing with @effect/vitest
Added comprehensive tests using **@effect/vitest 4.0.0-rc.112** (compatible with Effect 4.0):
- Uses `it.effect()` for Effect-native test execution
- Uses `Effect.exit()` for testing failure cases
- Uses `ConfigProvider.layer()` with `ConfigProvider.fromEnvRecord()` for test isolation
- Tests all config options, validation, defaults, and error cases
- 7 passing tests demonstrating proper Effect testing patterns

### ✅ Updated Dependencies
- `@effect/vitest@4.0.0-rc.112` - Compatible with Effect 4.0 and Vitest 4.1+
- Previous version (0.14.9) was for Effect 3.x

## Example: Testing with @effect/vitest

```typescript
import { expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Exit } from "effect"
import { GhfsConfig } from "./config"

// Test successful config loading
it.effect("loads config with all required values", () =>
  Effect.gen(function* () {
    const config = yield* GhfsConfig
    
    expect(config.repo).toBe("owner/repo")
    expect(Redacted.value(config.token)).toBe("test_token")
  }).pipe(
    Effect.provide(GhfsConfig.layer),
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnvRecord({
          GITHUB_TOKEN: "test_token",
          GHFS_REPO: "owner/repo"
        })
      )
    )
  ))

// Test validation failures
it.effect("fails when GHFS_REPO is missing", () =>
  Effect.gen(function* () {
    const exit = yield* Effect.exit(GhfsConfig)
    
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain("GHFS_REPO")
    }
  }).pipe(
    Effect.provide(GhfsConfig.layer),
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnvRecord({
          GITHUB_TOKEN: "test_token"
        })
      )
    )
  ))
```

## Config Architecture

Config is properly wired only at the CLI edge (`src-effect/cli/main.ts`):

```typescript
const AppLayer = Layer.mergeAll(
  GhfsConfig.layer,  // Loads from ConfigProvider
  GitHubClient.layer,
  MirrorFs.layer,
  SyncEngine.layer,
  ExecutionEngine.layer
).pipe(Layer.provide(NodeContext.layer))
```

Services depend on `GhfsConfig` rather than reading `process.env` directly, maintaining proper Effect architecture.

## Following Effect Documentation

This implementation follows official Effect patterns from:
- [effect.website/docs/v4/config](https://effect.website/docs/configuration)
- [@effect/vitest documentation](https://effect.website/docs/v4/api/vitest)
- Effect 4.0 best practices for Config + ConfigProvider

## Addresses Issue #183

Checklist items completed:
- [x] Effect Config properly implemented (already was!)
- [x] @effect/vitest adopted for Effect services (4.0-compatible version)
- [x] Testing patterns documented with examples
- [x] ConfigProvider wired only at CLI edge

## Test Results

```bash
$ pnpm test src-effect
# 7 GhfsConfig tests pass with @effect/vitest
```

All Effect config tests passing. Legacy non-Effect tests have unrelated failures (missing nostics package, etc.).

## Files Changed
- `package.json` - Updated @effect/vitest to 4.0.0-rc.112
- `src-effect/services/config.test.ts` - Comprehensive test suite using `it.effect()`
- `vitest.config.ts` - Added `globals: true`
- This README

## Next Steps for #183

Remaining work items (not in this PR scope):
- Add @effect/vitest tests for GitHubClient, MirrorFs, SyncEngine
- Implement `ghfs doctor` command with runtime validation
- Implement `ghfs config` command to show effective configuration
- Wire up OpenTelemetry tracing
- Complete execute.md parser migration to Effect
