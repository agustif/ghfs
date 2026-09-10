# Foundation Agent Coordination Note

## Foundation Issues (Dedicated Agent Owns)

The 5th agent landing the foundation architecture will own these issues:

- **#110** - graph.jsonl nodes/edges + registration hooks
- **#109** - sync-state tiers (hot/warm/cold) + provenance metadata  
- **#107** - policy.json + gate DSL for merge readiness
- **#106** - context packs (small/medium/large)
- **#108** - locks + notes (gitignored) for agent collaboration
- **#111** - INDEX.md as computed view (not stored state)

## Current Implementation Compatibility

**PR #3** (Wiki/Discussions/Merge Queue agent):
- ✅ Added tier tags: wiki=COLD, discussions=WARM, merge-queue=HOT
- ✅ Added TODO hooks for graph.jsonl registration
- ✅ Additive compatibility - no breaking changes
- ✅ Ready to integrate with foundation when it lands

## Integration Contract

When foundation agent lands:

1. **Graph Registration**: Call `graph.addNode()` / `graph.addEdge()` from TODO hooks
2. **Tier Metadata**: Foundation will read tier tags from sync module comments
3. **Directory Layout**: Current layout is compatible - foundation adds new files
4. **INDEX.md**: Will transition from stored to computed view
5. **Provenance**: Foundation will extend sync-state.json with etag/timestamps

## Non-Breaking Additions

Foundation can add without breaking existing code:
- `.ghfs/graph.jsonl` (new file)
- `.ghfs/policy.json` (new file)
- `.ghfs/packs/` (new directory)
- `.ghfs/.locks/` (new gitignored directory)
- `.ghfs/.notes/` (new gitignored directory)
- Extended sync-state.json schema (backward compatible)

Current PR #3 continues to work as foundation layers in.
