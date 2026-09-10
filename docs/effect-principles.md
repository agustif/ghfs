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
This document establishes the Effect-native architecture principles for ghfs, following [Effect Solutions](https://www.effect.solutions/) and [LLMS.md](https://raw.githubusercontent.com/Effect-TS/effect/main/LLMS.md).

## Core Tenets

### 1. Programs as Values

Every operation in ghfs is an `Effect<Success, Error, Requirements>` value that fully describes:
- **Success type**: what data the program produces
- **Error channel**: typed failures (no untyped throws)
- **Requirements**: services needed to run

```typescript
// Good: typed program value
const syncIssues: Effect.Effect<SyncResult, SyncError, GitHubProvider | FileSystem> = ...

// Bad: untyped Promise
const syncIssues: Promise<SyncResult> = ...
```

### 2. Context.Service + Layer Onion

All dependencies are Effect services wired through `Context`:

```typescript
// Service definition
export class GitHubProvider extends Context.Service<GitHubProvider, {
  fetchIssue(number: number): Effect.Effect<Issue, GitHubError>
}>()(
  "ghfs/providers/GitHubProvider"
) {
  static readonly layer = Layer.effect(
    GitHubProvider,
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      return GitHubProvider.of({
        fetchIssue: Effect.fn("GitHubProvider.fetchIssue")(function*(number: number) {
          // implementation
        })
      })
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
### 3. Schema-First Domain Modeling

All data types use `Schema` for:
- Runtime validation
- Type derivation
- JSON codec generation
- Error boundaries

```typescript
import { Schema } from "effect"

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

## CLI: effect/unstable/cli (First-Class)

**The CLI is a primary product surface built with `effect/unstable/cli` (bleeding edge / unstable is intentional).**

- Typed commands with `Command.make`
- Args with `Args.text`, `Args.integer`, `Args.optional`
- Options with `Options.boolean`, `Options.text`, `Options.withDefault`
- Nested subcommands with `Command.withSubcommands`
- Help text with `Command.withDescription`, `Command.withHelp`
- Single edge execution with `NodeRuntime.runMain`

### Commands

- `ghfs sync [repo] [--full] [--since ISO] [--watch] [--concurrency N]`
- `ghfs status` - Mirror freshness / sync state
- `ghfs watch [--interval DURATION]` - Schedule-based repeat sync
- `ghfs doctor [--fix]` - Validate `.ghfs` artifacts via Schema
- `ghfs config` - Show effective Config (redacts secrets)
- `ghfs execute [--run] [--continue-on-error]` - Execute operations

### Environment Config

All configuration via Effect Config (no config file parser needed):
- `GITHUB_TOKEN` / `GH_TOKEN` - Auth token (Redacted)
- `GHFS_REPO` - Repository (owner/repo)
- `GHFS_DIRECTORY` - Mirror directory (default: .ghfs)
- `GHFS_SYNC_ISSUES` - Sync issues (default: true)
- `GHFS_SYNC_PULLS` - Sync PRs (default: true)
- `GHFS_SYNC_CLOSED` - Sync closed (existing/all/false)
- `GHFS_SYNC_PATCHES` - Sync patches (open/all/false)

No parallel hand-rolled argv parser. No old CLI wrapped in Effect.runPromise. Pure effect/unstable/cli.

## Package Versions

- `effect@^4.0.0-rc.113` (v4 RC)
- `@effect/platform@^0.97.2`
- `@effect/platform-node@^0.108.2`
- `@effect/cli@^0.77.1` (`effect/unstable/cli` - bleeding edge OK)
- `@effect/vitest@^0.14.9`

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
**This document is the architectural foundation for all ghfs Effect code.**

**Last Updated**: 2026-09-10
}) {}
```

### 4. TaggedError Hierarchy

All failures are `Schema.TaggedError` with discriminated unions:

```typescript
export class GitHubRateLimitError extends Schema.TaggedError<GitHubRateLimitError>()(
  "GitHubRateLimitError",
  {
    resetAt: Schema.DateTimeUtc,
    limit: Schema.Int,
  }
) {}

export class GitHubNotFoundError extends Schema.TaggedError<GitHubNotFoundError>()(
  "GitHubNotFoundError",
  {
    resource: Schema.String,
    identifier: Schema.Union(Schema.String, Schema.Int),
  }
) {}

export type GitHubError = GitHubRateLimitError | GitHubNotFoundError | GitHubNetworkError
```

### 5. Effect.fn + Effect.gen

Use `Effect.fn("name")` for traced functions, `Effect.fnUntraced` for hot paths:

```typescript
// Traced (user-facing operations)
export const syncRepository = Effect.fn("syncRepository")(
  function*(repo: string): Effect.fn.Return<SyncResult, SyncError, GitHubProvider> {
    yield* Effect.logInfo("Starting sync for", repo)
    const issues = yield* fetchAllIssues(repo)
    yield* writeIssuesToDisk(issues)
    return { synced: issues.length }
  }
)

// Untraced (library internals)
export const parseIssueNumber = Effect.fnUntraced(
  function*(filename: string): Effect.fn.Return<number, ParseError> {
    const match = filename.match(/^(\d{5})-/)
    if (!match) return yield* new ParseError({ input: filename })
    return Number.parseInt(match[1], 10)
  }
)
```

### 6. Stream Pagination

Use `Stream.paginate` for paginated GitHub API responses:

```typescript
export const streamAllIssues = Effect.fn("streamAllIssues")(function*(repo: string) {
  return Stream.paginate(1, (page) =>
    Effect.gen(function*() {
      const response = yield* fetchIssuesPage(repo, page)
      const hasMore = response.length === 100
      return [response, hasMore ? Option.some(page + 1) : Option.none()]
    })
  ).pipe(
    Stream.flatMap(Stream.fromIterable),
    Stream.take(1000) // safety limit
  )
})
```

### 7. RequestResolver Batching

Batch GitHub API calls with `RequestResolver`:

```typescript
import { Request, RequestResolver } from "effect"

export class FetchIssue extends Request.Class<
  FetchIssue,
  Issue,
  GitHubError
>()({
  number: Schema.Int,
}) {}

export const IssueResolver = RequestResolver.makeBatched(
  (requests: Array<FetchIssue>) =>
    Effect.gen(function*() {
      const numbers = requests.map(r => r.number)
      const issues = yield* fetchIssuesBatch(numbers)
      return Request.completeAll(
        requests.map((req, i) => Request.complete(req, Effect.succeed(issues[i])))
      )
    })
).pipe(RequestResolver.contextFromServices(GitHubProvider))
```

### 8. Schedule + Retry

Use `Schedule` for retries and polling:

```typescript
const retryPolicy = Schedule.exponential("100 millis").pipe(
  Schedule.union(Schedule.spaced("10 seconds")),
  Schedule.upTo("1 minute")
)

export const fetchWithRetry = (url: string) =>
  HttpClient.get(url).pipe(
    Effect.retry(retryPolicy),
    Effect.catchTag("HttpError", err => 
      Effect.logError("HTTP request failed after retries", err)
    )
  )
```

### 9. Scope for Resource Safety

All acquired resources use `Scope` for guaranteed cleanup:

```typescript
export const withTempDirectory = Effect.fn("withTempDirectory")(
  function*<A, E, R>(
    f: (dir: string) => Effect.Effect<A, E, R>
  ): Effect.fn.Return<A, E, R | FileSystem> {
    const dir = yield* FileSystem.makeTempDirectory()
    return yield* Effect.acquireUseRelease(
      Effect.succeed(dir),
      f,
      (dir) => FileSystem.removeDirectory(dir)
    )
  }
)
```

### 10. CLI with effect/unstable/cli

CLI commands are first-class Effect programs:

```typescript
import { Args, Command, Options } from "effect/unstable/cli"

const syncCommand = Command.make("sync", {
  repo: Options.text("repo").pipe(Options.optional),
  force: Options.boolean("force").pipe(Options.withDefault(false)),
}).pipe(
  Command.withHandler(({ repo, force }) =>
    Effect.gen(function*() {
      const resolvedRepo = repo ?? (yield* detectRepository())
      yield* syncRepository(resolvedRepo, { force })
    })
  )
)

const statusCommand = Command.make("status").pipe(
  Command.withHandler(() =>
    Effect.gen(function*() {
      const state = yield* loadSyncState()
      yield* Effect.logInfo("Last sync:", state.lastSync)
    })
  )
)

const cli = Command.make("ghfs").pipe(
  Command.withSubcommands([syncCommand, statusCommand])
)
```

## Architecture Layers

### Layer Onion (outside → inside)

```
┌─────────────────────────────────────┐
│ CLI Layer (effect/unstable/cli)     │
├─────────────────────────────────────┤
│ Application Services                │
│ - SyncOrchestrator                  │
│ - ExecuteOrchestrator               │
│ - WatchService                      │
├─────────────────────────────────────┤
│ Domain Services                     │
│ - GitHubProvider                    │
│ - FileSystem                        │
│ - Config                            │
├─────────────────────────────────────┤
│ Platform Services                   │
│ - HttpClient (@effect/platform)     │
│ - FileSystem (@effect/platform)     │
│ - Terminal (@effect/platform)       │
└─────────────────────────────────────┘
```

### Dependency Flow

```typescript
// Main entry point
const MainLive = Layer.mergeAll(
  GitHubProvider.layer,
  FileSystem.layer,
  Config.layer
).pipe(
  Layer.provide(HttpClient.layer),
  Layer.provide(NodeFileSystem.layer)
)

// Run CLI
Effect.gen(function*() {
  yield* Command.run(cli, process.argv.slice(2))
}).pipe(
  Effect.provide(MainLive),
  NodeRuntime.runMain
)
```

## Product Contract: .ghfs/ Layout

The `.ghfs/` directory layout is a **product contract** that must be preserved:

```
.ghfs/
  repo.json           # repository metadata (Schema-validated)
  issues.md           # issue index (generated from Issues[])
  pulls.md            # PR index (generated from PullRequests[])
  execute.md          # queued operations (parsed via Schema)
  execute.yml         # structured operations (Schema-validated)
  sync-state.json     # sync metadata (Schema-validated)
  issues/
    <number>-<slug>.md
    closed/
      <number>-<slug>.md
  pulls/
    <number>-<slug>.md
    <number>-<slug>.patch
    closed/
      <number>-<slug>.md
```

All file I/O goes through the `FileSystem` service, all schemas validate via `Schema.decodeUnknown`.

## No Bespoke Apply Engine

Per user mandate: **no bespoke mutation stack**. The execute engine:
1. Parses operations via `Schema`
2. Calls `GitHubProvider` service methods directly
3. Each method is an `Effect.Effect<void, GitHubError, never>`

Future: delegate to alchemy.run v2 resources where they exist.

## Effect RC Versions

Use bleeding-edge Effect:
- `effect@rc` (v4.x)
- `@effect/platform@rc`
- `effect/unstable/cli` (first-class)
- `effect/unstable/sql` (future, for local cache)

## Testing Strategy

Use `@effect/vitest`:

```typescript
import { it } from "@effect/vitest"

it.effect("syncs issues to disk", () =>
  Effect.gen(function*() {
    const result = yield* syncRepository("owner/repo")
    expect(result.synced).toBeGreaterThan(0)
  }).pipe(
    Effect.provide(TestGitHubProvider.layer),
    Effect.provide(TestFileSystem.layer)
  )
)
```

## Migration Strategy

This is a **tabula rasa rewrite**:
1. ✅ Write this document FIRST
2. Create new Effect-native implementations alongside old code
3. Preserve `.ghfs/` contract (read/write same files)
4. Delete old Promise-based code once Effect version works
5. No migration layer, no compatibility shims

## References

- [Effect Solutions](https://www.effect.solutions/)
- [Effect Website Docs](https://effect.website/docs)
- [Effect LLMS.md](https://raw.githubusercontent.com/Effect-TS/effect/main/LLMS.md)
- [Effect GitHub](https://github.com/Effect-TS/effect)

---

**This document is the architectural foundation for all ghfs Effect code.**
