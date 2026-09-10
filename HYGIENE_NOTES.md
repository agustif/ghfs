# Repository Hygiene Notes

This document tracks repository hygiene tasks that require issue/PR write permissions.

## Duplicate Issues to Close

### #6 vs #16 - Enhanced Metadata: meta.json

Both issues have identical content. **Action**: Close #6 as duplicate of #16.

**Suggested comment for #6**:
```
Duplicate of #16. Closing in favor of #16 to consolidate discussion.
```

**Note**: #16 should be kept because it was referenced in the original agent work and PR #1 already closes #16.

### #7 vs #12 - Enhanced Metadata: labels.json and milestones.json

Both issues have identical content. **Action**: Close #7 as duplicate of #12.

**Suggested comment for #7**:
```
Duplicate of #12. Closing in favor of #12 to consolidate discussion.
```

**Note**: #12 should be kept for consistency with which issue numbers are referenced in PRs.

## Epic #4 Checklist Update

Epic #4 "[Epic] Agent Intelligence Context Layer" currently has placeholder `#TBD` values. These should be updated with real issue numbers:

### Current:
```markdown
## Foundation tracks:
- [ ] #TBD Graph system (nodes/edges)
- [ ] #TBD Context packs (small/medium/large)
- [ ] #TBD Policy + gate DSL
- [ ] #TBD Tiered freshness (hot/warm/cold)
- [ ] #TBD Provenance tracking
- [ ] #TBD Local coordination (locks/notes)
- [ ] #TBD Sync-state evolution
```

### Should be updated to:
```markdown
## Foundation tracks:
- [x] #25 Graph system (nodes/edges) - implemented in #19 as graph.jsonl
- [ ] #21 Context packs (small/medium/large)
- [ ] #20 Policy + gate DSL
- [ ] #24 Tiered freshness (hot/warm/cold)
- [ ] #23 Provenance tracking
- [ ] #22 Local coordination (locks/notes)
- [x] #30 Sync-state evolution - implemented in #19 as sync-state.json

See: https://github.com/agustif/ghfs/pull/19 (foundation-compatible implementation)
```

**Note**: #25 and #30 should be marked as completed with checkboxes because they're already implemented in PR #19.

## Additional Notes

- All these tasks require GitHub API write permissions which the cloud agent gh CLI does not have
- These are tracked here for manual completion or for an agent with appropriate permissions
- The docs PR #42 has been successfully created and is ready for review
