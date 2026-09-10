# Issue Hygiene Actions - Manual Steps Required

**Generated**: 2026-09-10  
**By**: LEDGER LIBRARIAN agent

This document contains the specific actions needed to clean up issue/PR hygiene. Since gh CLI is read-only, these require manual execution or approval.

---

## Priority 1: Close Duplicate Issues

### Contributors Coverage Duplicates
```bash
# Close #136 as duplicate of #83
gh issue close 136 --comment "Duplicate of #83 (Contributor Stats — detailed weekly activity metrics)"

# Close #80 as duplicate of #83
gh issue close 80 --comment "Duplicate of #83 (Contributor Stats — detailed weekly activity metrics)"
```

### Traffic Stats Duplicate
```bash
# Close #135 as duplicate of #93
gh issue close 135 --comment "Duplicate of #93 (Traffic Stats — views, clones, paths, referrers). Will also be closed by PR #130."
```

### Languages Coverage Duplicate
```bash
# Close #82 as duplicate of #52 (if #52 covers languages)
gh issue close 82 --comment "Duplicate of #52 (Add languages and contributors summaries)"
```

---

## Priority 2: Close Alchemy Fork Issue

```bash
# Close #114 as wontfix
gh issue close 114 --comment "Apply logic belongs in alchemy fork, not ghfs core. See PR #115, #120, #137 for alchemy integration design."
```

---

## Priority 3: Update Epic Issue Bodies

### Epic #45: API Surface Map

Copy content from `.github/EPIC_45_UPDATE.md` and add as comment to https://github.com/agustif/ghfs/issues/45

Or update the issue body directly with the child issue index.

### Epic #99: Comprehensive Agent-Oriented Filesystem Sync

Copy content from `.github/EPIC_99_UPDATE.md` and add as comment to https://github.com/agustif/ghfs/issues/99

Or update the issue body directly with the child issue index.

### Epic #4: Agent Intelligence Context Layer

Copy content from `.github/EPIC_4_UPDATE.md` and add as comment to https://github.com/agustif/ghfs/issues/4

Or update the issue body directly with the child issue index.

---

## Priority 4: Monitor PR #130

When PR #130 merges, these issues will auto-close:
- #131 - Add stargazers sync support
- #132 - Add watchers/subscribers sync support
- #133 - Add forks list sync support
- #135 - Add traffic statistics sync support (duplicate, handled above)
- #136 - Add contributors statistics sync support (duplicate, handled above)

**Action**: Verify auto-close happened after merge. If not, close manually.

---

## Priority 5: Link PRs to Issues (Lower Priority)

These PRs have no explicit issue links. Consider:
1. Linking to existing issues
2. Creating tracking issues
3. Closing if abandoned/superseded

**PRs Without Issue Links**:
#2, #3, #19, #42, #43, #44, #47, #48, #51, #54, #61, #62, #66, #73, #74, #81, #98, #105, #113, #115, #116, #117, #119, #120, #122, #127, #129, #134, #137, #138, #139

**Recommendation**: Start with oldest PRs (#2, #3, #19) and work forward.

---

## Priority 6: Consider Consolidating Epics

Epic #45 and Epic #99 have significant overlap. Many issues serve both epics.

**Option A**: Keep separate (observe path vs. comprehensive sync)
**Option B**: Merge into single "Comprehensive GitHub Sync" epic
**Option C**: Create hierarchy with #99 as parent, #45 as child

**Recommendation**: Keep separate for now, but cross-reference in both epic bodies.

---

## Priority 7: Close Superseded Issues

Epic #45 supersedes these older issues:
```bash
gh issue close 8 --comment "Superseded by Epic #45 comprehensive API coverage. See https://github.com/agustif/ghfs/issues/45"
gh issue close 9 --comment "Superseded by Epic #45 comprehensive API coverage. See https://github.com/agustif/ghfs/issues/45"
gh issue close 10 --comment "Superseded by Epic #45 comprehensive API coverage. See https://github.com/agustif/ghfs/issues/45"
gh issue close 11 --comment "Superseded by Epic #45 comprehensive API coverage. See https://github.com/agustif/ghfs/issues/45"
```

---

## Summary of Actions

| Action | Count | Effort |
|--------|-------|--------|
| Close duplicates | 4 issues | Low |
| Close alchemy fork issue | 1 issue | Low |
| Update epic comments | 3 epics | Medium |
| Monitor PR #130 auto-close | 5 issues | Low (automated) |
| Link PRs to issues | 33 PRs | High |
| Consolidate epics | 2 epics | Medium (design decision) |
| Close superseded issues | 4 issues | Low |

**Immediate actions** (can be done now):
1. Close duplicates (5 commands)
2. Close alchemy fork issue (1 command)
3. Close superseded issues (4 commands)
4. Update epic comments (3 manual copy-pastes)

**Monitoring** (check after events):
- Monitor PR #130 merge auto-close

**Long-term** (requires investigation):
- Link PRs to issues (needs per-PR review)
- Consolidate epics (design decision)
