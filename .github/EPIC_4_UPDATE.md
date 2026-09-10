# Epic #4 Index Comment - Copy to Issue

> **Note**: Copy this content to Epic #4 as a comment to maintain the child issue index.

---

## Child Issues Index for Epic #4: Agent Intelligence Context Layer

### Foundation: Graph System (2 issues)
- #25 - Graph system: nodes + edges for agent navigation
- #31 - Cross-reference graph (refs.json)
- #36 - Add graph edges for PR intelligence (review_requested, approved, checks, references)
- #110 - Foundation: graph.jsonl nodes/edges + registration hooks

### Foundation: Context Packs (2 issues)
- #21 - Context packs: prompt-sized bundles per issue/PR
- #34 - Feed context-pack inputs from PR intelligence
- #106 - Foundation: context packs (small/medium/large) for agent consumption

### Foundation: Policy & Gates (2 issues)
- #20 - Policy + gate DSL for offline evaluation
- #35 - Align gate.json with foundation policy DSL
- #107 - Foundation: policy.json + gate DSL for merge readiness

### Foundation: Sync State & Tiering (3 issues)
- #23 - Provenance tracking: record fetch metadata per file
- #24 - Tiered freshness: hot/warm/cold sync strategy
- #30 - sync-state.json - incremental sync metadata
- #33 - Add tiering for PR intelligence (hot/warm/cold)
- #109 - Foundation: sync-state tiers (hot/warm/cold) + provenance metadata

### Foundation: Agent Coordination (1 issue)
- #22 - Local coordination: locks + notes for agent swarms
- #108 - Foundation: locks + notes (gitignored) for agent collaboration

### Foundation: Index Generation (1 issue)
- #111 - Foundation: INDEX.md as computed view (not stored state)

## Related PRs

### Implementation PRs
- #19 - feat: agent ergonomics - security summaries, refs graph, me.md, sync-state, search index
- #43 - feat: Context pack generator (issue #21)
- #81 - feat: implement graph + policy builders (real implementations)

### Design/Planning PRs
- #42 - docs: Document new sync surfaces

## Architecture Tracks

### 1. Inventory (What Exists)
- INDEX.md generation (#111)
- Graph nodes (#25, #110)

### 2. Graph (What's Related)
- Nodes + edges (#25, #110)
- Cross-references (#31)
- PR intelligence edges (#36)

### 3. Gates (What Blocks Action)
- Policy DSL (#20, #107)
- Gate evaluation (#35)

### 4. Freshness (What's Stale)
- Tiered sync (#24, #109)
- Provenance tracking (#23)
- Sync-state metadata (#30)

### 5. Context Packs (Prompt-Sized Bundles)
- Generator (#21, #106)
- PR intelligence inputs (#34)

### 6. Coordination (Agent Collaboration)
- Locks + notes (#22, #108)

## Status Summary

**Total Child Issues**: ~15  
**Foundation Issues**: 6 (#106-111)  
**Active PRs**: 3 (#19, #43, #81)  
**Priority**: First-principles foundation for agent swarm intelligence

## Success Criteria

- [ ] Architectural PR with contracts + stubs
- [ ] Other sync agents can conform to foundation
- [ ] Graph system operational
- [ ] Context packs generated
- [ ] Policy DSL defined
- [ ] Tiering implemented
- [ ] Coordination primitives available
