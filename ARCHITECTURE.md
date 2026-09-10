# ghfs Agent Intelligence Context Architecture

**Status**: Foundation track (stubs OK, contracts stable)  
**Epic**: https://github.com/agustif/ghfs/issues/4

## Mission

Make ghfs **agent-swarm-native**, not just "API dump on disk."

An agent swarm operating on a GitHub repository needs, **offline and skim-cheap**:

1. **Inventory**: what exists
2. **Graph**: what's related
3. **Gates**: what blocks action (policy)
4. **Freshness**: what's changed / stale
5. **Context packs**: prompt-sized task bundles
6. **Coordination**: locks so agents don't collide

This document defines the **canonical contracts** for these layers. Other sync adapters (wiki, discussions, merge queue, PR reviews/checks, meta/rulesets, security) plug into these contracts.

---

## Canonical Layout

```
.ghfs/
  INDEX.md                  # human-readable generated view
  meta.json                 # repo metadata (existing)
  sync-state.json           # sync cursors + tier timestamps (evolved schema)
  provenance.jsonl          # path → fetched_at, source, content_hash
  graph.jsonl               # nodes + edges for navigation
  policy.json               # machine-readable contrib/merge rules
  agent-hints.md            # generated tips for agents (links to packs, gates)
  
  packs/                    # prompt-sized context bundles
    small/
      pr-123.md
      issue-456.md
    medium/
      pr-123.md
      issue-456.md
    large/
      pr-123.md
      issue-456.md
  
  locks/                    # local-only claim files (gitignored)
    pr-123.lock
    issue-456.lock
  
  notes/                    # local-only agent scratch (gitignored)
    pr-123.md
    analysis.md
  
  issues/                   # existing mirrored markdown
    00123-bug.md
    closed/
      00124-fixed.md
  
  pulls/                    # existing mirrored markdown + patches
    00042-feat.md
    00042-feat.patch
    closed/
      00043-done.md
```

**Flat layout preferred**: Single mirrored tree + tier metadata in `sync-state.json`. No dual `hot/warm/cold/` trees.

---

## 1. Graph System

**Contract**: `.ghfs/graph.jsonl` (JSONL: one node/edge per line)  
**Issue**: https://github.com/agustif/ghfs/issues/25

### Schema

```typescript
// Node
interface GraphNode {
  id: string // e.g. "issue:123", "pull:42", "person:octocat"
  type: GraphNodeType
  label: string // human-readable
  url?: string // GitHub URL when applicable
  state?: string // open, closed, merged, etc.
  metadata?: Record<string, unknown>
}

type GraphNodeType
  = | 'issue'
    | 'pull'
    | 'discussion'
    | 'commit'
    | 'check'
    | 'person'
    | 'label'
    | 'milestone'
    | 'release'
    | 'workflow'
    | 'file_path'

// Edge
interface GraphEdge {
  from: string // node id
  to: string // node id
  type: GraphEdgeType
  metadata?: Record<string, unknown>
}

type GraphEdgeType
  = | 'references'
    | 'fixes'
    | 'review_requested'
    | 'owns' // CODEOWNERS
    | 'checks'
    | 'merges'
    | 'labels'
    | 'discusses'
    | 'assigned_to'
    | 'milestone_tracks'
```

### Builder contract

- **Input**: existing synced markdown/json (issues, pulls, repo.json)
- **Output**: `.ghfs/graph.jsonl`
- **Hooks**: other sync adapters call `addNode(node)` / `addEdge(edge)` before graph write

### Example

```jsonl
{"id":"issue:123","type":"issue","label":"#123: Fix memory leak","state":"open","url":"https://github.com/owner/repo/issues/123"}
{"id":"pull:42","type":"pull","label":"#42: Add caching","state":"open","url":"https://github.com/owner/repo/pull/42"}
{"id":"person:octocat","type":"person","label":"@octocat"}
{"from":"pull:42","to":"issue:123","type":"fixes"}
{"from":"person:octocat","to":"pull:42","type":"review_requested"}
```

---

## 2. Context Packs

**Contract**: `.ghfs/packs/{small,medium,large}/{pr|issue}-N.md`  
**Issue**: https://github.com/agustif/ghfs/issues/21

### Tiers

| Tier   | Use case               | Contents                                           |
|--------|------------------------|----------------------------------------------------|
| small  | Queue scanning         | title + state + gate summary + file list          |
| medium | Triage                 | small + body + check status                        |
| large  | Deep-dive              | medium + comments + reviews + timeline             |

### Stable chunk IDs

Embed in pack markdown for targeted retrieval:

```
<!-- chunk:ghfs:pull:123:body -->
<!-- chunk:ghfs:pull:123:review:4 -->
<!-- chunk:ghfs:issue:456:comment:7 -->
```

### Schema (pack structure)

```markdown
---
pack_size: small
item_type: pull
number: 123
generated_at: "2026-09-10T09:30:00Z"
---

# PR #123: Add caching

**State**: open  
**Gate status**: ⚠️ missing required reviews (need 2, have 0)  
**Risk**: changes workflow files

## Files changed (3)
- `.github/workflows/ci.yml`
- `src/cache.ts`
- `tests/cache.test.ts`

## Linked issues
- Fixes #100

## Owners
- @octocat (workflow changes)
```

### Generator contract

- **Input**: sync-state items, graph.jsonl, policy.json
- **Output**: pack files per issue/PR
- **Hooks**: other sync adapters can extend pack sections (e.g., check logs, discussion threads)

---

## 3. Policy + Gate DSL

**Contract**: `.ghfs/policy.json`  
**Issue**: https://github.com/agustif/ghfs/issues/20

### Schema

```typescript
interface Policy {
  version: 1
  repo: string
  source: string[] // where parsed from: constitution.md, rulesets API, etc.
  rules: PolicyRule[]
  gates: Gate[]
  danger_paths: string[] // glob patterns for risky files
}

interface PolicyRule {
  id: string
  title: string
  description?: string
  severity: 'error' | 'warning' | 'info'
  eval: GatePredicate
}

interface Gate {
  id: string
  title: string
  applies_to: 'issue' | 'pull' | 'all'
  conditions: GatePredicate[]
}

// DSL (evaluable offline)
type GatePredicate
  = | { op: 'requires_review_count', min: number }
    | { op: 'blocks_paths', patterns: string[] }
    | { op: 'requires_label', labels: string[] }
    | { op: 'requires_check', check: string, state: 'success' | 'failure' }
    | { op: 'author_in', logins: string[] }
    | { op: 'and', predicates: GatePredicate[] }
    | { op: 'or', predicates: GatePredicate[] }
```

### Sources (priority order)

1. `.github/constitution.md` (parsed)
2. GitHub branch protection rules (via API when available)
3. `.github/CODEOWNERS` (for `owns` edges + danger paths)
4. Rulesets API (when available)

### Evaluator contract

```typescript
// Agents can check gates offline
function evaluateGate(gate: Gate, context: ItemContext): GateResult {
  // returns { passed: boolean, failures: string[] }
}
```

---

## 4. Tiered Freshness

**Contract**: evolved `sync-state.json` schema  
**Issue**: https://github.com/agustif/ghfs/issues/24

### Schema additions

```typescript
interface SyncState {
  version: 2
  // ... existing fields ...
  tiers?: {
    hot: TierState
    warm: TierState
    cold: TierState
  }
}

interface TierState {
  lastSyncedAt: string
  surfaces: SurfaceState[]
}

interface SurfaceState {
  name: string // 'issues', 'pulls', 'wiki', 'discussions', 'checks', etc.
  lastSyncedAt: string
  cursor?: string // pagination cursor
  etag?: string // HTTP ETag for conditional requests
}
```

### Tier definitions

| Tier | Sync frequency | Surfaces                                    |
|------|----------------|---------------------------------------------|
| hot  | Every run      | open PRs, my queue items, failing checks   |
| warm | If stale > 1h  | issues, discussions, closed PRs            |
| cold | If stale > 24h | wiki, constitution, rulesets, security     |

### Sync strategy

```typescript
async function shouldSync(surface: string, tier: 'hot' | 'warm' | 'cold'): Promise<boolean> {
  const state = syncState.tiers?.[tier]
  if (!state)
    return true

  const age = Date.now() - new Date(state.lastSyncedAt).getTime()

  if (tier === 'hot')
    return true
  if (tier === 'warm')
    return age > 3600_000 // 1h
  if (tier === 'cold')
    return age > 86400_000 // 24h

  return false
}
```

---

## 5. Provenance Tracking

**Contract**: `.ghfs/provenance.jsonl`  
**Issue**: https://github.com/agustif/ghfs/issues/23

### Schema

```typescript
interface ProvenanceEntry {
  path: string // relative to .ghfs/
  fetched_at: string // ISO 8601
  source: string // e.g. "github:issues:123", "github:pulls:42:patch"
  content_hash: string // sha256:... for integrity
  etag?: string // HTTP ETag if available
  metadata?: Record<string, unknown>
}
```

### Example

```jsonl
{"path":"issues/00123-bug.md","fetched_at":"2026-09-10T09:30:00Z","source":"github:issues:123","content_hash":"sha256:abc123..."}
{"path":"pulls/00042-feat.patch","fetched_at":"2026-09-10T09:31:00Z","source":"github:pulls:42:patch","content_hash":"sha256:def456..."}
{"path":"graph.jsonl","fetched_at":"2026-09-10T09:32:00Z","source":"local:graph-builder","content_hash":"sha256:789abc..."}
```

### Usage

- Agents read provenance to know data freshness
- Verify file integrity before trusting cached data
- Debug stale context issues ("when was this synced?")

---

## 6. Local Coordination (Locks + Notes)

**Contract**: `.ghfs/locks/` and `.ghfs/notes/` (both gitignored)  
**Issue**: https://github.com/agustif/ghfs/issues/22

### Lock schema

```typescript
interface Lock {
  agent: string // agent identifier
  claimed_at: string // ISO 8601
  task: string // human-readable task description
  timeout_at?: string // optional expiry
}
```

### File structure

```
.ghfs/locks/pr-123.lock       # JSON lock file
.ghfs/notes/pr-123.md         # markdown scratch space
```

### Protocol

1. **Claim**: check `locks/pr-123.lock` doesn't exist or is expired, write new lock
2. **Release**: delete lock file
3. **Notes**: agents write analysis/scratch to `notes/pr-123.md` (ephemeral)

### CLI helpers (minimal)

```bash
ghfs lock claim pr-123 --task "reviewing PR 123"
ghfs lock release pr-123
ghfs note pr-123 "WIP: found memory leak in cache.ts"
ghfs lock list
```

### Multi-agent coordination

- Check locks before claiming work
- Respect lock timeouts (default 30min)
- Notes are **local-only** scratch space (never committed)

---

## 7. Generated Files

### INDEX.md

Human-readable overview linking to packs, graph, policy:

```markdown
# ghfs Repository Mirror

**Repo**: owner/name  
**Last synced**: 2026-09-10T09:30:00Z

## Quick links
- [Policy](.ghfs/policy.json)
- [Graph](.ghfs/graph.jsonl)
- [Context packs](.ghfs/packs/)

## Stats
- **Issues**: 42 open, 100 closed
- **PRs**: 5 open, 50 merged
- **Graph**: 500 nodes, 1200 edges

## Agent hints
See [agent-hints.md](.ghfs/agent-hints.md) for triage tips.
```

### agent-hints.md

Generated tips for agents:

```markdown
# Agent Hints

## High-priority items
- PR #123: failing checks, blocks release
- Issue #456: assigned to you, needs triage

## Risky changes
- PR #42: touches workflow files (see policy.json)

## Context packs
- Quick scan: `.ghfs/packs/small/`
- Triage: `.ghfs/packs/medium/`
- Deep-dive: `.ghfs/packs/large/`

## Gates
- All PRs require 2 approvals (see policy.json)
- Workflow changes require @octocat review
```

---

## Implementation Strategy

### Phase 1: Contracts + stubs (this PR)

Ship **stable contracts** with minimal/stub implementations:

1. Type definitions (`src/types/graph.ts`, `src/types/policy.ts`, `src/types/provenance.ts`, `src/types/coordination.ts`)
2. Evolved `sync-state.ts` schema (tiers)
3. Stub generators (create empty files with TODO comments)
4. `ARCHITECTURE.md` (this document)
5. Updated `README.md` and `skills/ghfs/SKILL.md`

**Goal**: Other agents can start conforming to contracts immediately.

### Phase 2: Builders (parallel PRs)

Each track implemented independently:

- Graph builder (#25)
- Context pack generator (#21)
- Policy parser (#20)
- Tiered sync (#24)
- Provenance writer (#23)
- Lock/note CLI (#22)

### Phase 3: Integration

- Wire builders into sync pipeline
- E2E tests with real repos
- Performance tuning (bounds, toggles)

---

## Constraints

1. **No regressions**: existing issue/PR sync must keep working
2. **Stubs fine**: ship contracts before implementations
3. **No secrets**: never write tokens/keys to the tree
4. **Bounds**: all generators respect size limits (configurable)
5. **Toggles**: every feature can be disabled via config

---

## Configuration Extensions

Add to `ghfs.config.ts`:

```typescript
export default defineConfig({
  // existing fields...

  intelligence: {
    graph: true, // enable graph generation
    packs: {
      enabled: true,
      sizes: ['small', 'medium', 'large'],
    },
    policy: {
      enabled: true,
      sources: ['constitution', 'codeowners', 'rulesets'],
    },
    provenance: true, // enable provenance tracking
    tiers: {
      hot: ['issues:open', 'pulls:open', 'checks:failing'],
      warm: ['issues:closed', 'pulls:closed', 'discussions'],
      cold: ['wiki', 'constitution', 'rulesets'],
    },
    coordination: {
      enabled: true,
      lockTimeout: 1800, // 30min in seconds
    },
  },
})
```

---

## Other Agents: Integration Guide

### Registering graph nodes/edges

```typescript
import { addGraphEdge, addGraphNode } from '@ghfs/cli/intelligence/graph'

// After syncing discussions
await addGraphNode({
  id: 'discussion:789',
  type: 'discussion',
  label: 'Discussion #789: Architecture',
  url: 'https://github.com/owner/repo/discussions/789',
})

await addGraphEdge({
  from: 'pull:42',
  to: 'discussion:789',
  type: 'discusses',
})
```

### Extending context packs

```typescript
import { extendContextPack } from '@ghfs/cli/intelligence/packs'

// Add check logs to medium/large packs
await extendContextPack('pull', 123, 'medium', {
  section: 'Check logs',
  content: '...',
  chunkId: 'ghfs:pull:123:check:ci',
})
```

### Recording provenance

```typescript
import { recordProvenance } from '@ghfs/cli/intelligence/provenance'

await recordProvenance({
  path: 'discussions/00789-architecture.md',
  source: 'github:discussions:789',
  contentHash: computeSha256(content),
})
```

---

## Success Criteria

1. ✅ Issues filed under epic #4
2. ✅ `ARCHITECTURE.md` lands with stable contracts
3. ✅ Type definitions for all layers
4. ✅ Stub generators (TODOs linking to issues)
5. ✅ Draft PR open
6. ✅ Other agents can read contracts and start conforming

**Next**: Parallel implementation PRs for each track.
