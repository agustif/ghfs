# ARCHITECTURE: Context Packs

## Overview

Context packs are prompt-sized, tiered bundles of issue/PR data designed for AI agent consumption. They provide stable chunk IDs and graduated levels of detail (small/medium/large) so agents can efficiently scan, triage, and deep-dive without loading full mirrored data.

## Design Goals

1. **Agent-first**: Optimized for LLM context window constraints
2. **Stable chunk IDs**: Persistent identifiers for caching and reference
3. **Tiered detail**: Progressive disclosure based on agent needs
4. **Fast generation**: Generated during sync with minimal overhead
5. **Extensible**: Foundation for richer gate/check digests (depends on PR #2)

## Directory Structure

```
.ghfs/
  packs/
    small/
      issue-123.md    # Title + state + gate + file list
      pr-456.md
    medium/
      issue-123.md    # + body + check status
      pr-456.md
    large/
      issue-123.md    # + comments + reviews + owners
      pr-456.md
```

## Pack Tiers

### Small (Queue Scanning)

**Target use case**: Agent scans queue to find actionable items

**Contents**:
- Number, kind, title, state
- URL
- Gate summary (PRs only): mergeable, review decision, checks status
- File list placeholder (stub for PR #2 file metadata)

**Typical size**: 200-500 tokens

### Medium (Triage)

**Target use case**: Agent decides whether to act or skip

**Contents**: All of small, plus:
- Body/description
- Author
- Labels
- Created/updated timestamps

**Typical size**: 500-1500 tokens

### Large (Deep Dive)

**Target use case**: Agent implements fix, writes review, or takes concrete action

**Contents**: All of medium, plus:
- Assignees
- Milestone
- Closed timestamp
- Comment count and summary
- Linked issues (stub for graph system, epic #4)
- Owners list (author + assignees + reviewers)
- PR details: draft, merged, base/head refs, requested reviewers, review summary

**Typical size**: 1500-4000 tokens

## Stable Chunk IDs

Each pack has a stable `chunk_id` frontmatter field following the pattern:

```
ghfs:issue:123:body       # Issue #123 body
ghfs:pull:456:body        # PR #456 body
ghfs:pull:456:review:789  # PR #456 review #789 (future)
ghfs:pull:456:comment:101 # PR #456 comment #101 (future)
```

Agents can reference these IDs for:
- Context caching
- Cross-agent coordination
- Incremental updates
- Prompt optimization

## Generation Flow

Packs are generated automatically during sync:

1. **Sync item** — `syncRepository` processes issue/PR
2. **Update tracked state** — `SyncItemState` stores canonical data
3. **Materialize markdown** — `materializePreparedIssue` writes `.ghfs/issues/**/*.md` or `.ghfs/pulls/**/*.md`
4. **Generate packs** — `writeAllPackSizes` creates all three tiers in `.ghfs/packs/{small,medium,large}/`

Generation is **non-blocking**: pack write failures are logged but do not fail the sync.

## Implementation

### Type System

- `src/types/pack.ts`: Pack types, metadata, content interfaces
- `PackSize`: `'small' | 'medium' | 'large'`
- `Pack<T>`: Generic pack container with metadata + content
- `PackSmallContent`, `PackMediumContent`, `PackLargeContent`: Tier-specific content shapes

### Core Modules

- `src/pack/chunk-id.ts`: Stable chunk ID generation
- `src/pack/generate.ts`: Pack content generation from `SyncItemState`
- `src/pack/render.ts`: Markdown rendering for each tier
- `src/pack/paths.ts`: File path resolution (`.ghfs/packs/{size}/{kind}-{number}.md`)
- `src/pack/write.ts`: Filesystem write orchestration

### Integration Points

- `src/sync/sync-repository-item.ts`: Calls `writeAllPackSizes` after markdown write
- `src/types/index.ts`: Exports pack types for public API

## Stub Fields (Depend on PR #2)

The following pack fields are **stubs** pending gate/check implementation:

- `PackGateSummary.checksStatus`: Hardcoded to `'unknown'`
- `PackGateSummary.checksDigestPlaceholder`: Links to PR #2
- `PackSmallContent.fileList`: Not yet populated (requires file metadata from PR #2)

When PR #2 merges:
1. Replace `checksStatus: 'unknown'` with actual CI status derivation
2. Replace placeholder with digest of failing checks
3. Populate `fileList` from PR file metadata

## Future Extensions (Epic #4)

- **Graph links**: `PackLargeContent.linkedIssues` will pull from graph system
- **Review summaries**: `pr.reviewSummary` will aggregate timeline review events
- **Provenance**: Track which agent/run generated each pack
- **Freshness**: Annotate pack age and staleness buckets
- **Locks**: Coordinate multi-agent access to same pack

## Testing

- `src/pack/*.test.ts`: Unit tests for chunk IDs, generation, rendering, paths
- Coverage: Chunk ID patterns, tier content correctness, stub field presence
- Run with: `pnpm test src/pack`

## Coordination with Foundation Agent

Per issue #21 instructions:

> Coordinate with foundation agent if they own packs — if foundation PR exists, extend it; else ship packs PR and note overlap.

**Status**: No foundation PR found (checked PR list). This PR introduces packs as a standalone feature. If foundation agent lands first, we'll rebase and integrate.

## Related Issues

- **Issue #21**: Context packs implementation (this PR)
- **Epic #4**: Agent Intelligence Context Layer (parent epic)
- **PR #2**: Gate/checks implementation (dependency for stub fields)

## Design Decisions

1. **Why three tiers?** Balance between agent scan efficiency (small), triage accuracy (medium), and deep-dive completeness (large).
2. **Why separate files?** Agents can fetch exactly the tier they need without parsing/filtering.
3. **Why stable IDs?** Enable caching, incremental updates, and cross-agent coordination.
4. **Why generate during sync?** Packs are derived views — keeping them in sync with source ensures consistency.
5. **Why non-blocking?** Pack generation is an optimization; sync must not fail if packs fail.

## Performance Impact

- **Sync overhead**: ~10-30ms per item (3 file writes + JSON stringify)
- **Disk usage**: ~2-10KB per item per tier (~6-30KB total)
- **Cold start**: No impact (packs generated on first sync)
- **Incremental sync**: Packs regenerated only for updated items

## Migration Notes

- **Backward compatible**: Existing `.ghfs/` directories work unchanged
- **No schema version bump**: Packs are an additive feature
- **Safe to delete**: `.ghfs/packs/` can be removed and regenerated on next sync
