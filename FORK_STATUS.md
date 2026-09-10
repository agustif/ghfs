# Alchemy Fork Status

## Current Status

✅ **Documentation Complete**
- Comprehensive roadmap created: `docs/alchemy-fork-roadmap.md`
- Setup instructions created: `docs/FORK_SETUP_INSTRUCTIONS.md`
- PR opened on ghfs: https://github.com/agustif/ghfs/pull/115

⏳ **Manual Steps Required**
Due to GitHub token limitations in the cloud agent environment, the following steps must be completed manually:

## Required Manual Actions

### 1. Create the Fork ⏳

**Option A: GitHub CLI**
```bash
gh repo fork alchemy-run/alchemy --clone=false
```

**Option B: GitHub Web UI**
1. Visit https://github.com/alchemy-run/alchemy
2. Click "Fork" button
3. Select "agustif" as owner
4. Create fork

**Expected Result**: https://github.com/agustif/alchemy

### 2. Enable Issues ⏳

```bash
gh repo edit agustif/alchemy --enable-issues
```

Or via Settings → Features → Check "Issues"

### 3. File Epic Issue on Fork ⏳

Create issue at https://github.com/agustif/alchemy/issues/new

**Title**: `Extend GitHub provider for ghfs two-way sync`

**Body**: See template in `docs/FORK_SETUP_INSTRUCTIONS.md` (Step 3)

**Labels**: `epic`, `enhancement`

### 4. File Tracking Issue on ghfs ⏳

Create issue at https://github.com/agustif/ghfs/issues/new

**Title**: `Track alchemy fork extension for two-way sync`

**Body**: See template in `docs/FORK_SETUP_INSTRUCTIONS.md` (Step 4)

**Labels**: `documentation`, `enhancement`

## Architecture Summary

### ghfs (this repository)
- **URL**: https://github.com/agustif/ghfs
- **Role**: Observe + CLI bridge
- **Functions**:
  - Sync GitHub issues/PRs to `.ghfs/` filesystem
  - CLI interface for batch operations
  - Read-only view of GitHub state

### agustif/alchemy (fork to be created)
- **URL**: https://github.com/agustif/alchemy (to be created)
- **Fork of**: https://github.com/alchemy-run/alchemy
- **Role**: Declare + Apply (extended GitHub provider)
- **Functions**:
  - Declarative GitHub resource management
  - Apply filesystem changes to GitHub
  - Two-way sync capabilities
  - Infrastructure-as-Effects with Effect v4 RC

## Extension Roadmap Phases

### Phase 1: Core Issue & PR Management
- Label resource
- Milestone resource
- Issue resource (full lifecycle)
- PullRequest resource (full lifecycle)

### Phase 2: Repository Configuration
- Branch management
- Ruleset management
- Team management (org-scoped)

### Phase 3: Advanced Features
- Project (GitHub Projects v2)
- WikiPage management
- Release management

### Phase 4: Integration & Sync
- Two-way sync engine
- CLI integration with ghfs
- Conflict resolution
- Dry-run mode

## Technical Details

### Technology Stack
- **Effect v4 RC**: Core framework throughout
- **Alchemy**: Infrastructure-as-Effects (forked)
- **TypeScript**: Primary language
- **GitHub API**: Via Octokit

### Implementation Patterns
Following upstream Alchemy conventions from https://alchemy.run/github/:
- Resource definition using Effect generators
- State convergence patterns
- Destruction handling with `retainOnDestroy` options
- Output interpolation for dynamic values

## Verification Checklist

Once manual steps are complete:

- [ ] Fork exists at https://github.com/agustif/alchemy
- [ ] Issues enabled on fork
- [ ] Epic issue filed on fork with roadmap
- [ ] Tracking issue filed on ghfs linking to fork
- [ ] Roadmap PR merged on ghfs
- [ ] Development can begin on Phase 1

## References

- **PR with Documentation**: https://github.com/agustif/ghfs/pull/115
- **Roadmap Document**: `docs/alchemy-fork-roadmap.md`
- **Setup Instructions**: `docs/FORK_SETUP_INSTRUCTIONS.md`
- **Upstream Alchemy**: https://github.com/alchemy-run/alchemy
- **Upstream Docs**: https://alchemy.run/github/
- **Effect v4 RC**: https://effect.website/

## Why Manual Steps Are Required

The GitHub token used by this cloud agent has read-only permissions and does not include the `repo` scope required to create forks via the API. This is a security feature to prevent unauthorized repository creation.

The manual steps ensure proper authorization and ownership of the forked repository.

## Next Steps After Fork Creation

1. Clone fork locally
2. Review upstream Alchemy codebase structure
3. Set up development environment
4. Start Phase 1 implementation (Label resource)
5. Establish CI/CD for the fork
6. Document development workflow

---

**Created**: 2026-09-10  
**Status**: Awaiting manual fork creation  
**Contact**: See `docs/FORK_SETUP_INSTRUCTIONS.md` for detailed steps
