# Effect-Native ghfs Architecture

This directory contains the **tabula rasa** Effect v4 rewrite of ghfs.

## Structure

```
src-effect/
├── domain/          # Pure domain models (Schema.Class)
├── services/        # Effect services with Layer composition
├── cli/             # effect/unstable/cli commands
└── index.ts         # Public API
```

## Services

### Core Services
- **GhfsConfig** - Configuration with Effect Config + Redacted
- **GitHubClient** - HTTP-based GitHub API client
- **MirrorFs** - FileSystem service for .ghfs/ management

### Sync Services
- **SyncEngineStreaming** - Stream.paginate based sync
- **SyncCache** - Effect Cache for hot metadata
- **SyncConcurrency** - Semaphore-bounded parallelism
- **GitHubResolver** - RequestResolver batching

### Execute Services
- **ExecutionEngine** - YAML parse + operation execution

## Layer Composition

```typescript
const AppLayer = Layer.mergeAll(
  GhfsConfig.layer,
  GitHubClient.layer,
  GitHubResolver.layer,
  MirrorFs.layer,
  SyncEngineStreaming.layer,
  SyncCache.layer,
  SyncConcurrency.layer,
  ExecutionEngine.layer
).pipe(Layer.provide(NodeContext.layer))
```

## CLI

Entry point: `cli/main.ts`

Uses `effect/unstable/cli` with:
- Command.make for all commands
- Args.text for positional args
- Options.* for flags
- NodeRuntime.runMain at edge

### Commands
- `sync` - Stream-based sync with watch mode
- `status` - Mirror freshness
- `watch` - Daemon mode with Schedule
- `doctor` - Validate .ghfs/ via Schema
- `config` - Show effective config (redacted)
- `execute` - Run operations

## Testing

Tests use `@effect/vitest` with Layer test doubles:

```bash
pnpm vitest -c vitest.config.effect.ts
```

## Effect Superpowers

1. **Stream pagination** - Backpressure, no giant arrays
2. **RequestResolver** - Batch API calls
3. **Semaphore** - Bounded concurrency
4. **Cache** - TTL-based metadata caching
5. **Schedule** - Watch/daemon mode
6. **Scope** - Resource cleanup on interrupt
7. **Config + Redacted** - Secrets never leak
8. **Schema** - Type-safe everywhere
9. **Tracing** - Effect.withSpan observability
10. **CLI** - First-class effect/unstable/cli

## Documentation

See [`../docs/effect-principles.md`](../docs/effect-principles.md) for complete principles and patterns.
