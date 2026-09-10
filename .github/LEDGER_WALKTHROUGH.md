# LEDGER LIBRARIAN Walkthrough

**For repository maintainers and contributors**

This guide walks you through using the LEDGER system established in PR #153.

---

## Quick Start

### 1. Check for Duplicates Before Filing
Before creating a new issue, check `LEDGER.md`:
```bash
# Search for keywords in LEDGER.md
grep -i "contributor" LEDGER.md
grep -i "traffic" LEDGER.md
```

### 2. Link PRs to Issues
When opening a PR, include in the description:
```markdown
Closes #123
Fixes #456
```

### 3. Check Epic Coverage
Before filing a "missing API surface" issue, verify it's not already tracked:
- Check Epic #45 for API surfaces
- Check Epic #99 for sync features
- Check Epic #4 for agent intelligence

---

## For Maintainers

### Weekly Maintenance (5 min)

1. **Update LEDGER.md** with new/closed issues:
```bash
# Get new issues since last update
gh issue list --limit 100 --json number,title,createdAt --state open

# Check for closed issues this week
gh issue list --limit 50 --json number,title,closedAt --state closed

# Update LEDGER.md manually with changes
```

2. **Check for new duplicates**:
```bash
# Search for common keywords
grep -i "contributor\|traffic\|language\|release\|merge" LEDGER.md
```

3. **Verify epic child lists remain current**:
- Review Epic #4, #45, #99 issue bodies
- Add newly filed child issues to epic index

### Monthly Maintenance (30 min)

1. **Review stale PRs**:
```bash
# List PRs older than 3 months
gh pr list --json number,title,createdAt --state open | \
  jq '.[] | select(.createdAt < (now - 7776000))'
```

2. **Audit epic coverage**:
- Compare LEDGER.md child lists with actual epic issues
- Add missing links
- Remove closed issues

3. **Update HYGIENE_ACTIONS.md** priorities based on:
- Newly identified duplicates
- Stale issues
- PRs without links

### After PR Merge

When a PR that closes issues merges:

1. **Verify auto-close worked**:
```bash
# Check if linked issues closed
gh issue view 131  # Should show "closed"
```

2. **Update LEDGER.md**:
- Remove closed issues from open list
- Add to closed/archived section if needed

---

## For Contributors

### Before Filing an Issue

1. **Search existing issues**:
```bash
gh issue list --search "keyword" --state all
```

2. **Check LEDGER.md** for:
- Duplicate coverage
- Epic tracking
- Related issues

3. **Choose the right epic parent**:
- **Epic #4**: Agent intelligence, graph, context packs, policy
- **Epic #45**: GitHub API surfaces (REST/GraphQL)
- **Epic #99**: Comprehensive sync features, UI, config

### When Opening a PR

1. **Link to parent issue**:
```markdown
Closes #123
```

2. **If no issue exists**, either:
- Create tracking issue first
- Or mention in PR: "No parent issue - exploratory work"

3. **Tag epic if relevant**:
```markdown
Related to Epic #45 (API Surface Map)
```

### After Your PR Merges

If your PR closed issues:
1. Verify they auto-closed
2. Comment if they didn't (maintainer will close manually)

---

## Understanding the Epic Structure

### Epic #4: Agent Intelligence Context Layer
**Purpose**: Foundation for agent-swarm-native ghfs  
**Scope**: Graph, context packs, policy DSL, tiering, coordination  
**Tag issues**: `agent-intelligence`, `foundation`

**File issues here for**:
- Graph/edges between entities
- Context pack generation
- Policy evaluation
- Sync tiering/freshness
- Agent coordination (locks/notes)

### Epic #45: API Surface Map
**Purpose**: Exhaustive GitHub API coverage  
**Scope**: REST 2026-03-10 + GraphQL surfaces  
**Tag issues**: `api-surface`, `github-api`

**File issues here for**:
- Missing GitHub API endpoints
- New GitHub features to sync
- API version updates
- GraphQL queries/mutations

### Epic #99: Comprehensive Sync
**Purpose**: Transform ghfs into full mirror  
**Scope**: Wiki, discussions, config, UI, tests  
**Tag issues**: `sync`, `features`

**File issues here for**:
- New sync surfaces (wiki, discussions)
- Config toggles
- UI features
- Performance improvements

---

## Duplicate Detection Checklist

Before filing, search LEDGER.md for:

### Common Duplicate Topics
- Contributors / contributor stats / collaborators
- Traffic / views / clones
- Languages / language breakdown
- Releases / tags
- Stargazers / watchers / forks
- Actions / workflows / runs / jobs
- Security alerts (Dependabot, code scanning, secret scanning)
- Merge queue / queue entries
- Projects / ProjectsV2
- Issues / sub-issues / dependencies / fields

### How to Check
```bash
# Search LEDGER.md for your topic
grep -i "your-topic" LEDGER.md

# Search open issues
gh issue list --search "your-topic" --state open

# Search closed issues (might have been rejected)
gh issue list --search "your-topic" --state closed
```

---

## Epic Update Process

When filing a child issue for an epic:

1. **File the issue normally** with:
```markdown
Title: Add X sync support
Body: Description of X...

Part of Epic #45 (API Surface Map)
```

2. **Notify maintainer** to update epic index:
- Comment on epic: "Please add #XXX to epic index"
- Or submit PR updating `.github/EPIC_XX_UPDATE.md`

3. **Maintainer updates**:
- Add to LEDGER.md child list
- Copy from `.github/EPIC_XX_UPDATE.md` to epic issue

---

## Reading the LEDGER

### Section Guide

1. **Summary Statistics** - Quick overview
2. **Epic Issues** - Parent/child relationships
3. **Duplicate Issues** - What to close and why
4. **PR → Issue Mapping** - Which PRs close which issues
5. **Alchemy Fork Issues** - Separate concern
6. **Missing Coverage** - Gaps to fill (usually empty)
7. **Issues Without PRs** - Open work by category
8. **Stale/Old Issues** - Needs review
9. **Actions Required** - What maintainers should do

### How to Use It

**As a contributor**:
- Check "Duplicate Issues" before filing
- Review "Issues Without PRs" for work to pick up
- Check "Epic Issues" to see the big picture

**As a maintainer**:
- Execute "Actions Required"
- Keep "Summary Statistics" current
- Update epic sections weekly

**As an agent**:
- Use as authoritative source of open work
- Check duplicates before creating issues
- Update after bulk operations

---

## Common Workflows

### Workflow 1: Filing a New Issue

1. Search existing: `gh issue list --search "topic"`
2. Check LEDGER.md duplicates
3. Choose epic parent (#4, #45, or #99)
4. File issue with epic reference
5. Notify maintainer to update epic index

### Workflow 2: Opening a PR

1. Check if issue exists: search LEDGER.md
2. If not, create tracking issue first
3. Open PR with `Closes #XXX`
4. Tag epic if relevant

### Workflow 3: Weekly Maintenance

1. Pull latest: `git pull origin main`
2. Get new issues: `gh issue list --limit 100 --state open`
3. Update LEDGER.md statistics
4. Check for duplicates
5. Execute HYGIENE_ACTIONS.md if needed
6. Commit: `git commit -m "docs: update LEDGER.md"`

### Workflow 4: Monthly Audit

1. Review all open PRs: `gh pr list --state open`
2. Close stale/abandoned PRs
3. Verify epic coverage is current
4. Update HYGIENE_ACTIONS.md priorities
5. Run API surface check (see LEDGER_SUMMARY.md)

---

## Troubleshooting

### "I filed a duplicate by accident"

Close your issue with:
```
Duplicate of #XXX (canonical issue)
```

### "My PR should have closed an issue but didn't"

Check PR description:
- Must say `Closes #XXX` or `Fixes #XXX`
- Case-insensitive
- Works with multiple: `Closes #1, #2, #3`

If it didn't work, comment on the issue:
```
Closed by PR #YYY
```
And manually close.

### "LEDGER.md is out of date"

Submit PR updating it:
1. Update statistics
2. Add new issues to epic sections
3. Remove closed issues
4. Commit with: `docs: update LEDGER.md`

### "Epic index comment doesn't match LEDGER.md"

Priority order:
1. LEDGER.md is authoritative
2. `.github/EPIC_XX_UPDATE.md` is pre-formatted for copy-paste
3. Epic issue comment is user-facing (update from LEDGER)

Update epic comment from `.github/EPIC_XX_UPDATE.md`.

---

## Files Reference

```
LEDGER.md
  └── Authoritative source of truth
      Single file to check for everything

LEDGER_SUMMARY.md
  └── Visual quick reference
      Read this first for overview

HYGIENE_ACTIONS.md
  └── Executable action checklist
      Copy-paste bash commands

.github/EPIC_45_UPDATE.md
  └── Pre-formatted Epic #45 index
      Copy-paste to issue #45

.github/EPIC_99_UPDATE.md
  └── Pre-formatted Epic #99 index
      Copy-paste to issue #99

.github/EPIC_4_UPDATE.md
  └── Pre-formatted Epic #4 index
      Copy-paste to issue #4

.github/LEDGER_WALKTHROUGH.md (this file)
  └── User guide
      How to use the LEDGER system
```

---

## Questions?

- Check LEDGER_SUMMARY.md for visual overview
- Read LEDGER.md for detailed tracking
- Review HYGIENE_ACTIONS.md for actions
- This walkthrough for processes

**Still stuck?** Comment on PR #153 or ping maintainers.

---

*LEDGER LIBRARIAN system - Obsessive issue hygiene* 📚✅
