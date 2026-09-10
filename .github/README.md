# .github Documentation

This directory contains epic index updates and maintenance documentation for the ghfs project.

## Files

### EPIC_*_UPDATE.md
Pre-formatted index content for updating epic issue bodies. Copy-paste these into the respective epic issues as comments or update the issue body directly.

- **EPIC_4_UPDATE.md** - Epic #4: Agent Intelligence Context Layer (15 issues)
- **EPIC_45_UPDATE.md** - Epic #45: API Surface Map (60+ issues)
- **EPIC_99_UPDATE.md** - Epic #99: Comprehensive Agent-Oriented Filesystem Sync (25 issues)

### LEDGER_WALKTHROUGH.md
Comprehensive user guide for the LEDGER system:
- Contributor workflows (filing issues, opening PRs)
- Maintainer workflows (weekly/monthly maintenance)
- Duplicate detection guide
- Epic structure explanation
- Troubleshooting

## Usage

### Updating Epic Issues

When new child issues are filed for an epic:

1. **Option A: Add as comment**
   - Copy content from `EPIC_*_UPDATE.md`
   - Add as new comment on the epic issue
   - Keeps history of updates

2. **Option B: Update issue body**
   - Copy content from `EPIC_*_UPDATE.md`
   - Edit the epic issue body directly
   - Replace or append to existing child list

### Keeping Epic Updates Current

When filing a new child issue:

```markdown
Title: Add X sync support
Body: ...

Part of Epic #45 (API Surface Map)
```

Then either:
1. Comment on epic: "Please add #XXX to epic index"
2. Submit PR updating `EPIC_*_UPDATE.md` with new issue

Maintainer then:
1. Updates `LEDGER.md` with new issue
2. Updates `EPIC_*_UPDATE.md` with new issue
3. Copies updated content to epic issue

### Weekly Maintenance

Follow the checklist in `LEDGER_WALKTHROUGH.md`:

1. Update `LEDGER.md` statistics
2. Update `EPIC_*_UPDATE.md` files with new issues
3. Copy to epic issues if needed
4. Execute any actions from `../HYGIENE_ACTIONS.md`

## Related Files

In repository root:
- `LEDGER.md` - Master issue/PR index (authoritative source)
- `LEDGER_SUMMARY.md` - Visual quick reference
- `HYGIENE_ACTIONS.md` - Executable action checklist

## Epic References

- [Epic #4: Agent Intelligence Context Layer](https://github.com/agustif/ghfs/issues/4)
- [Epic #45: API Surface Map](https://github.com/agustif/ghfs/issues/45)
- [Epic #99: Comprehensive Agent-Oriented Filesystem Sync](https://github.com/agustif/ghfs/issues/99)

## Questions?

Read the walkthrough: `LEDGER_WALKTHROUGH.md`
