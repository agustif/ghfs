# Effect Principles for ghfs

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
