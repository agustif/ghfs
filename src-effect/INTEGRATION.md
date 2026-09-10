# Integrating Effect-Native ghfs

This guide shows how to use ghfs as a library in your Effect applications.

## Installation

```bash
pnpm add @ghfs/cli
```

## Basic Usage

### Programmatic Sync

```typescript
import { Effect, Layer } from "effect"
import { NodeContext } from "@effect/platform-node"
import { GhfsConfig, SyncEngineStreaming } from "@ghfs/cli"

const program = Effect.gen(function* () {
  const syncEngine = yield* SyncEngineStreaming
  
  const summary = yield* syncEngine.sync({
    full: false,
    since: undefined
  })
  
  return summary
})

// Provide configuration via environment variables
const AppLayer = Layer.mergeAll(
  GhfsConfig.layer,
  // ... other services
).pipe(Layer.provide(NodeContext.layer))

const runnable = program.pipe(Effect.provide(AppLayer))
```

### Environment Configuration

```bash
export GITHUB_TOKEN="ghp_..."
export GHFS_REPO="owner/repo"
export GHFS_DIRECTORY=".ghfs"
```

## Watch Mode Integration

```typescript
import { Effect, Schedule } from "effect"

const watchProgram = Effect.gen(function* () {
  const syncEngine = yield* SyncEngineStreaming
  
  const syncOnce = syncEngine.sync({ full: false })
  
  yield* syncOnce.pipe(
    Effect.repeat(Schedule.spaced("5 minutes")),
    Effect.catchAll((error) => 
      Effect.logError("Sync failed, will retry", error)
    )
  )
})
```

## Using Individual Services

### GitHub Client

```typescript
import { GitHubClient } from "@ghfs/cli"

const program = Effect.gen(function* () {
  const github = yield* GitHubClient
  
  const issue = yield* github.fetchIssue(123)
  const prs = yield* github.fetchPullRequests({ state: "open" })
  
  yield* github.addComment(123, "Hello from Effect!")
})
```

### Mirror Filesystem

```typescript
import { MirrorFs } from "@ghfs/cli"

const program = Effect.gen(function* () {
  const mirror = yield* MirrorFs
  
  yield* mirror.ensureDirectory()
  
  const state = yield* mirror.readSyncState()
  
  if (state) {
    console.log(`Last synced: ${state.lastSyncedAt}`)
  }
})
```

### Cache Layer

```typescript
import { SyncCache } from "@ghfs/cli"

const program = Effect.gen(function* () {
  const cache = yield* SyncCache
  
  // Cached for 5 minutes
  const repo = yield* cache.getRepo
  
  // Cached for 30 seconds
  const rateLimit = yield* cache.getRateLimit
  
  console.log(`Rate limit: ${rateLimit.remaining}/${rateLimit.limit}`)
})
```

## Layer Composition

Build custom layers for your application:

```typescript
import { Layer } from "effect"
import {
  GhfsConfig,
  GitHubClient,
  MirrorFs,
  SyncEngineStreaming
} from "@ghfs/cli"

// Minimal sync layer
const MinimalSyncLayer = Layer.mergeAll(
  GhfsConfig.layer,
  GitHubClient.layer,
  MirrorFs.layer,
  SyncEngineStreaming.layer
)

// Full application layer with all services
const FullAppLayer = Layer.mergeAll(
  GhfsConfig.layer,
  GitHubClient.layer,
  GitHubResolver.layer,
  MirrorFs.layer,
  SyncEngineStreaming.layer,
  SyncCache.layer,
  SyncConcurrency.layer,
  ExecutionEngine.layer
)
```

## Testing

Use Layer test doubles:

```typescript
import { Layer, Effect } from "effect"
import { describe, it } from "@effect/vitest"
import { GitHubClient } from "@ghfs/cli"

const MockGitHubClient = Layer.succeed(
  GitHubClient,
  GitHubClient.of({
    fetchIssue: (number) => Effect.succeed({
      number,
      title: "Mock issue",
      // ... other fields
    })
  })
)

describe("My App", () => {
  it.effect("uses mocked GitHub client", () =>
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const issue = yield* github.fetchIssue(123)
      expect(issue.title).toBe("Mock issue")
    }).pipe(Effect.provide(MockGitHubClient))
  )
})
```

## Error Handling

All services use typed errors:

```typescript
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const github = yield* GitHubClient
  
  const result = yield* Effect.either(
    github.fetchIssue(999)
  )
  
  if (result._tag === "Left") {
    // Handle GitHubError
    yield* Effect.logError("Failed to fetch issue", result.left)
  } else {
    yield* Effect.log("Got issue", result.right)
  }
})
```

## Stream Processing

Process items as they're fetched:

```typescript
import { Stream } from "effect"

const program = Effect.gen(function* () {
  const syncEngine = yield* SyncEngineStreaming
  
  const stream = yield* syncEngine.syncStream({
    full: false
  })
  
  yield* stream.pipe(
    Stream.tap((summary) => 
      Effect.log("Sync iteration", summary)
    ),
    Stream.runDrain
  )
})
```

## Examples

See [`examples/`](./examples/) directory:
- `basic-sync.ts` - Simple sync example
- `watch-mode.ts` - Daemon mode with Schedule
- More examples coming soon

## Resources

- [Effect Documentation](https://effect.website/docs)
- [Effect Solutions](https://www.effect.solutions/)
- [ghfs Effect Principles](../docs/effect-principles.md)
