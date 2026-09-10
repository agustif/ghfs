# Effect Principles for ghfs

This document captures the Effect-native coding principles we follow in the ghfs codebase rewrite.

## Core Principles

### 1. Programs as Values
- All effects are `Effect<A, E, R>` where:
  - `A` = success type
  - `E` = error type (typed failures)
  - `R` = requirements (context/dependencies)
- Execute ONLY at the edge: `NodeRuntime.runMain` or `Layer.launch`
- **Never** use `runPromise` inside services

### 2. Effect Construction

#### Prefer `Effect.gen` for inline code
```ts
Effect.gen(function*() {
  yield* Effect.log("Starting...")
  const result = yield* someEffect
  return result
})
```

#### Use `Effect.fn("name")` for reusable functions
```ts
export const syncIssue = Effect.fn("syncIssue")(
  function*(number: number): Effect.fn.Return<Issue, SyncError> {
    yield* Effect.log("Syncing issue", number)
    return yield* fetchIssue(number)
  }
)
```

#### Use `Effect.fnUntraced` for library/hot-path functions
```ts
export const validateNumber = Effect.fnUntraced(
  function*(n: number): Effect.fn.Return<number, ValidationError> {
    if (n <= 0) return yield* new ValidationError({ message: "Must be positive" })
    return n
  }
)
```

#### AVOID functions that only wrap Effect.gen
```ts
// ❌ Bad
function doSomething() {
  return Effect.gen(function*() { ... })
}

// ✅ Good
const doSomething = Effect.fn("doSomething")(function*() { ... })
```

### 3. Services & Dependency Injection

#### Extend `Context.Service`
```ts
export class GitHubClient extends Context.Service<GitHubClient, {
  fetchIssue(number: number): Effect.Effect<Issue, GitHubError>
}>()(
  "ghfs/providers/github/GitHubClient"
) {
  static readonly layer = Layer.effect(
    GitHubClient,
    Effect.gen(function*() {
      const config = yield* GhfsConfig
      const fetchIssue = Effect.fn("GitHubClient.fetchIssue")(
        function*(number: number) {
          // implementation
        }
      )
      return GitHubClient.of({ fetchIssue })
    })
  )
}
```

#### Compose layers
- Use `Layer.provide` / `Layer.provideMerge` / `Layer.mergeAll`
- Keep layer graphs flat
- Build focused service layers, compose based on needs

### 4. Domain Modeling with Schema

#### Use `Schema.Class` for domain models
```ts
export class Issue extends Schema.Class<Issue>("Issue")({
  number: Schema.Int,
  title: Schema.String,
  state: Schema.Literal("open", "closed"),
  labels: Schema.Array(Schema.String),
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc
}) {}
```

#### Tagged errors with `Schema.TaggedError`
```ts
export class SyncError extends Schema.TaggedError<SyncError>()("SyncError", {
  message: Schema.String,
  number: Schema.optional(Schema.Int)
}) {}

export class GitHubError extends Schema.TaggedError<GitHubError>()("GitHubError", {
  status: Schema.Int,
  message: Schema.String
}) {}
```

#### Brands for refined types
```ts
export const IssueNumber = Schema.Int.pipe(Schema.positive(), Schema.brand("IssueNumber"))
export type IssueNumber = Schema.Schema.Type<typeof IssueNumber>
```

### 5. Error Handling

#### Always return when yielding errors
```ts
// ✅ Correct
if (number <= 0) {
  return yield* new ValidationError({ message: "Invalid number" })
}

// ❌ Wrong (TypeScript won't know execution stops)
if (number <= 0) {
  yield* new ValidationError({ message: "Invalid number" })
}
```

#### Use `Effect.catchTag` / `Effect.catchTags`
```ts
program.pipe(
  Effect.catchTag("SyncError", (e) => Effect.logError("Sync failed", e)),
  Effect.catchTag("GitHubError", (e) => Effect.logError("GitHub API failed", e))
)
```

### 6. Platform Integration

#### Use `@effect/platform` / `@effect/platform-node`
- **File system**: `FileSystem` service, not `node:fs`
- **Path operations**: `Path` service, not `node:path` or `pathe`
- **HTTP**: `HttpClient` service, not `node:http` or `fetch`
- **Command execution**: `Command` from platform, not raw `child_process`

```ts
import { FileSystem, Path } from "@effect/platform"

const readFile = Effect.fn("readFile")(function*(path: string) {
  const fs = yield* FileSystem
  const content = yield* fs.readFileString(path)
  return content
})
```

### 7. Configuration

#### Use Effect `Config`
```ts
import { Config } from "effect"

export const GithubToken = Config.redacted("GITHUB_TOKEN")
export const RepoOwner = Config.string("REPO_OWNER")
export const SyncDirectory = Config.string("SYNC_DIR").pipe(
  Config.withDefault(".ghfs")
)
```

#### Config layers
```ts
export class GhfsConfig extends Context.Service<GhfsConfig, {
  readonly directory: string
  readonly token: Redacted.Redacted
  readonly repo: string
}>()(
  "ghfs/config/GhfsConfig"
) {
  static readonly layer = Layer.effect(
    GhfsConfig,
    Effect.gen(function*() {
      const directory = yield* SyncDirectory
      const token = yield* GithubToken
      const repo = yield* RepoOwner
      return GhfsConfig.of({ directory, token, repo })
    })
  )
}
```

### 8. CLI with `effect/unstable/cli`

```ts
import { Command, Options, Args } from "effect/unstable/cli"

const syncCommand = Command.make(
  "sync",
  { repo: Options.text("repo").pipe(Options.optional) },
  Effect.fn("syncCommand")(function*({ repo }) {
    yield* Effect.log("Syncing", repo)
    // implementation
  })
)
```

### 9. Testing with `@effect/vitest`

```ts
import { it } from "@effect/vitest"

it.effect("syncs issue successfully", () =>
  Effect.gen(function*() {
    const client = yield* GitHubClient
    const issue = yield* client.fetchIssue(123)
    expect(issue.number).toBe(123)
  }).pipe(Effect.provide(GitHubClient.layer))
)
```

### 10. Resource Management

#### Use `Effect.acquireRelease`
```ts
const withFile = Effect.fn("withFile")(function*(path: string) {
  const fs = yield* FileSystem
  return yield* Effect.acquireRelease(
    fs.open(path),
    (fd) => fs.close(fd)
  )
})
```

## Architecture Layers (Onion)

```
┌─────────────────────────────────────┐
│ CLI (effect/unstable/cli)           │
│  - Commands, Args, Options          │
│  - NodeRuntime.runMain              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ Services Layer                      │
│  - SyncEngine                       │
│  - GitHubClient                     │
│  - MirrorFs                         │
│  - ExecutionEngine                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ Domain Layer (Schema)               │
│  - Issue, PullRequest, Repo         │
│  - SyncState, ExecuteOp             │
│  - Tagged Errors                    │
└─────────────────────────────────────┘
```

## Package Versions

- `effect@^4.0.0-rc` (v4 RC/canary)
- `@effect/platform@^0.x.x` (latest RC)
- `@effect/platform-node@^0.x.x` (latest RC)
- `effect/unstable/cli` (bleeding edge, OK per user)
- `@effect/vitest@^0.x.x`
- `@effect/schema@^0.x.x`

## Migration from Old Codebase

### What We Preserve
- **Product contract**: `.ghfs/` mirror layout, paths, INDEX semantics
- **External API**: CLI commands (`sync`, `execute`, `ui`, `hub`, `status`)
- **Filesystem contract**: `issues/`, `pulls/`, `execute.yml`, `.sync.json`
- **README/docs** as external spec

### What We Replace
- All internal implementation
- Provider abstraction → Effect services
- Valibot → Effect Schema
- Raw promises → Effect
- Manual error handling → typed Effect errors
- `cac` → `effect/unstable/cli`
- `pathe` → `@effect/platform` Path
- Raw fs → `@effect/platform` FileSystem

## Key Services

### GhfsConfig
- Resolves configuration from file, env, CLI args
- Manages secrets with `Redacted`

### GitHubClient
- HTTP-based GitHub API client using `HttpClient`
- Rate limiting, retry, throttling built-in
- Returns typed errors (GitHubError)

### MirrorFs
- Manages `.ghfs/` directory structure
- Writes markdown files, patches, state
- Uses FileSystem service

### SyncEngine
- Orchestrates full sync flow
- Fetches from GitHubClient
- Writes to MirrorFs
- Updates SyncState

### ExecutionEngine
- Parses execute.yml / execute.md
- Validates operations
- Executes via GitHubClient
- Updates mirror via SyncEngine

## Observability

- Use Effect built-in logging: `Effect.log`, `Effect.logInfo`, `Effect.logError`
- Tracing spans via `Effect.withSpan`
- Consider `effect/unstable/observability` Otlp for production telemetry

## Rules Summary

1. ✅ Programs are values, execute at edge only
2. ✅ `Effect.gen` inline, `Effect.fn` for reusable
3. ✅ Services extend `Context.Service` with static `layer`
4. ✅ Domain modeling with `Schema.Class` and `Schema.TaggedError`
5. ✅ Platform services over raw Node APIs
6. ✅ Effect `Config` for configuration
7. ✅ `effect/unstable/cli` for CLI
8. ✅ `@effect/vitest` for tests
9. ✅ Always return when yielding errors
10. ✅ Effect v4 RC packages, not scared of unstable

## Effect-native extras beyond old ghfs

The Effect rewrite unlocks capabilities the old codebase never had. These are **first-class architectural wins**, not just refactors.

### ✅ Implemented in this PR

1. **Stream-based sync** - `Stream.paginate` for GitHub pagination; backpressure instead of giant arrays in memory
2. **Scope + acquireRelease** - HTTP clients, file handles cleaned up even on interrupt/failure
3. **Structured concurrency with Semaphore** - Bounded parallel sync with fiber interruption; no unbounded Promise.all
4. **Config + Redacted** - Token never leaks in logs; layered Config for all toggles
5. **Schema round-trip** - Decode API JSON + encode `.ghfs` artifacts through Schema (type-safe, branded IDs)
6. **Schedule** - Composed retry with exponential backoff + jitter; `--watch` mode via Effect.repeat
7. **Effect.withSpan** - Tracing on every service method for observability
8. **RequestResolver batching** - Batch GitHub lookups (issues/PRs) so N reads become fewer API calls
9. **Cache** - Effect Cache for hot metadata (repo, rate-limit) within a sync run
10. **CLI with effect/unstable/cli** - Typed Args/Options; `sync`, `execute`, `status`, `watch`, `doctor` commands

### 🚧 Follow-up issues (enhances, not MVP blockers)

11. **PubSub domain events** - In-process `IssueSynced`, `RateLimited` events for hooks/digests
12. **Otlp observability layer** - `effect/unstable/observability` for production trace export
13. **@effect/vitest Layer test doubles** - No-network unit tests with fake GitHubClient layers
14. **GraphQL batching** - RequestResolver for multi-item lookups (when we add GraphQL support)

### Key wins for users

- **Backpressure** - Sync 10k issues without OOM; streams process incrementally
- **Interruptible** - Ctrl+C during sync cleans up temp files, closes HTTP connections
- **Retry intelligence** - Auto-retry with exponential backoff on transient failures
- **Observability** - `--trace` flag shows sync spans in console (Jaeger export later)
- **Watch mode** - `ghfs sync --watch` polls GitHub on a schedule (no cron needed)
- **Type-safe everywhere** - Schema validation at boundaries; branded types prevent ID confusion
- **No token leaks** - Redacted config prevents secrets in logs/errors
- **Bounded concurrency** - Sync surfaces in parallel but never overwhelm API

---

**Last Updated**: 2026-09-10  
**Author**: Cloud Agent  
**Phase**: 0 (Principles Documentation) + 2 (Enhanced Implementation)
