# Epic #99 Index Comment - Copy to Issue

> **Note**: Copy this content to Epic #99 as a comment to maintain the child issue index.

---

## Child Issues Index for Epic #99: Comprehensive Agent-Oriented Filesystem Sync

### Core Sync Surfaces (3 issues)
- #100 - Add Wiki sync
- #101 - Add Discussions sync
- #102 - Add Merge Queue sync

### Configuration & Toggles (1 issue)
- #103 - Add comprehensive sync config toggles + INDEX.md generation

### PR Intelligence (8 issues)
- #8 - Add PR review state intelligence *(superseded by Epic #45)*
- #9 - Add PR CI/check status intelligence *(superseded by Epic #45)*
- #10 - Add PR merge gate status intelligence *(superseded by Epic #45)*
- #11 - Add PR file list and diff intelligence *(superseded by Epic #45)*
- #33 - Add tiering for PR intelligence (hot/warm/cold)
- #34 - Feed context-pack inputs from PR intelligence
- #35 - Align gate.json with foundation policy DSL
- #36 - Add graph edges for PR intelligence (review_requested, approved, checks, references)

### Agent Ergonomics (12 issues)
- #18 - Security summaries under security/
- #25 - Graph system: nodes + edges for agent navigation
- #26 - README Excerpt: Add repository README excerpt to meta.json
- #28 - Pinned Issues: Sync pinned issues list
- #29 - me.md - personal summary
- #30 - sync-state.json - incremental sync metadata
- #31 - Cross-reference graph (refs.json)
- #32 - search.jsonl - fast local search index
- #39 - activity.md - last N repository events
- #40 - deployments/ - environment and deployment status
- #41 - agent-hints.md - detect test/lint/build commands

### UI & Performance (2 issues)
- #118 - feat: UI display for metadata surfaces in ghfs ui and ghfs hub
- #121 - perf: Consider incremental updates for frequently-changing metadata

### Testing (1 issue)
- #112 - test: Add tests for metadata sync surfaces

## Related PRs

### Core Implementation
- #3 - feat: Add Wiki and Discussions sync support
- #42 - docs: Document new sync surfaces
- #98 - feat: Actions catalog + rule suites + pages + autolinks
- #105 - feat: implement full GitHub metadata sync surfaces

### Agent Ergonomics Implementation
- #19 - feat: agent ergonomics - security summaries, refs graph, me.md, sync-state, search index
- #43 - feat: Context pack generator (issue #21)

### PR Intelligence Implementation
- #2 - feat: Add PR intelligence (reviews, checks, files, gate)

## Overlap with Epic #45

Epic #99 and Epic #45 have significant overlap. Many issues serve both epics:
- Activity tracking (#39, #46, #49)
- Merge queue (#37, #91, #102)
- Security surfaces (#18, #75-79, #96, #123, #125)
- Metadata (#5-7, #26, #28)

## Status Summary

**Total Child Issues**: ~25  
**Active PRs**: 5  
**Overlap with Epic #45**: High (many issues serve both epics)

## Success Criteria

- [ ] All surfaces available via config
- [ ] INDEX.md generated listing what's present
- [ ] Full test coverage maintained
- [ ] Documentation complete (README + skill)
- [ ] No regressions to existing sync
