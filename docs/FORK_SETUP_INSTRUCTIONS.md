# Fork Setup Instructions

This document contains instructions for creating and configuring the agustif/alchemy fork.

## Prerequisites

- GitHub account with fork permissions
- GitHub CLI authenticated with appropriate permissions, OR
- Access to GitHub web UI

## Step 1: Create the Fork

### Option A: GitHub CLI

```bash
gh repo fork alchemy-run/alchemy --clone=false --default-branch-only
```

### Option B: GitHub Web UI

1. Navigate to https://github.com/alchemy-run/alchemy
2. Click the "Fork" button in the top-right
3. Select "agustif" as the owner
4. Optionally uncheck "Copy the main branch only" if you want all branches
5. Click "Create fork"

## Step 2: Enable Issues

```bash
gh repo edit agustif/alchemy --enable-issues
```

Or via GitHub web UI:
1. Navigate to https://github.com/agustif/alchemy/settings
2. Scroll to "Features"
3. Check "Issues"
4. Click "Save"

## Step 3: Create Epic Issue

Create a new issue on https://github.com/agustif/alchemy/issues/new with the following:

**Title:**
```
Extend GitHub provider for ghfs two-way sync
```

**Body:**
```markdown
# Epic: Extend GitHub provider for ghfs two-way sync

This epic tracks the extension of the GitHub provider to enable declarative two-way synchronization with ghfs.

## Goals

- Implement additional GitHub resource types (Label, Milestone, Issue, PullRequest, etc.)
- Enable apply operations from filesystem state
- Maintain compatibility with upstream Alchemy patterns
- Use Effect v4 RC throughout

## Architecture

- **ghfs**: Observe (sync to .ghfs) + CLI bridge → https://github.com/agustif/ghfs
- **agustif/alchemy fork**: Declare/apply (extended GitHub provider)
- **Effect v4 RC**: Throughout both repositories

## Roadmap

See detailed roadmap: https://github.com/agustif/ghfs/blob/main/docs/alchemy-fork-roadmap.md

## Resources to Implement

### Phase 1: Core Issue & PR Management
- [ ] Label - Manage issue/PR labels
- [ ] Milestone - Manage milestones
- [ ] Issue - Full issue lifecycle
- [ ] PullRequest - Full PR lifecycle

### Phase 2: Repository Configuration
- [ ] Branch - Branch management
- [ ] Ruleset - Repository rulesets
- [ ] Team - Team management (if org-scoped)

### Phase 3: Advanced Features
- [ ] Project (GitHub Projects v2)
- [ ] WikiPage - Wiki management
- [ ] Release - Release management

### Phase 4: Integration & Sync
- [ ] Two-Way Sync Engine
- [ ] CLI Integration

## Reference

- Upstream Alchemy: https://github.com/alchemy-run/alchemy
- Upstream patterns: https://alchemy.run/github/
- ghfs repository: https://github.com/agustif/ghfs
- Effect v4 RC: https://effect.website/

## Related

- ghfs tracking issue: [to be linked]
```

**Labels:** `epic`, `enhancement`

## Step 4: Create Tracking Issue on ghfs

After the fork and epic issue are created, file a tracking issue on ghfs:

Navigate to https://github.com/agustif/ghfs/issues/new

**Title:**
```
Track alchemy fork extension for two-way sync
```

**Body:**
```markdown
# Track alchemy fork extension for two-way sync

This issue tracks the work being done in the forked alchemy repository to extend the GitHub provider for declarative two-way synchronization.

## Architecture Split

### ghfs (this repository)
- **Role**: Observe + CLI bridge
- **Responsibilities**:
  - Sync GitHub issues/PRs to `.ghfs/` filesystem representation
  - Provide CLI interface for batch operations
  - Read-only view of GitHub state
  - Human and agent-friendly offline access

### agustif/alchemy (forked)
- **Role**: Declare + Apply (extended GitHub provider)
- **Repositories**: https://github.com/agustif/alchemy
- **Responsibilities**:
  - Extend GitHub provider with declarative two-way sync capabilities
  - Implement resource types matching upstream patterns
  - Apply filesystem changes back to GitHub
  - Infrastructure-as-Effects using Effect v4 RC

## Technology Stack

- **Effect v4 RC**: Used throughout both repositories
- **Alchemy**: Infrastructure-as-Effects framework (forked from https://github.com/alchemy-run/alchemy)
- **TypeScript**: Primary language

## Links

- **Fork repository**: https://github.com/agustif/alchemy
- **Epic issue on fork**: [link to issue created in step 3]
- **Detailed roadmap**: [alchemy-fork-roadmap.md](./docs/alchemy-fork-roadmap.md)
- **Upstream Alchemy**: https://github.com/alchemy-run/alchemy
- **Upstream docs**: https://alchemy.run/github/

## Status

- [ ] Fork created at https://github.com/agustif/alchemy
- [ ] Issues enabled on fork
- [ ] Epic issue filed on fork
- [ ] Tracking issue filed on ghfs (this issue)
- [ ] Phase 1 implementation started

## Notes

The fork extends Alchemy's GitHub provider to support declarative management of:
- Labels, Milestones, Issues, Pull Requests
- Branch protection, Rulesets
- Projects, Wiki pages, Releases
- Two-way sync with ghfs filesystem representation

This enables a workflow where changes to `.ghfs/` files can be applied back to GitHub declaratively, while maintaining the observe/sync capabilities of ghfs.
```

**Labels:** `documentation`, `enhancement`

## Verification

After completing all steps, verify:

1. Fork exists at https://github.com/agustif/alchemy
2. Issues are enabled on the fork
3. Epic issue exists on fork with proper roadmap
4. Tracking issue exists on ghfs linking to fork
5. Roadmap document exists at `docs/alchemy-fork-roadmap.md`

## Next Steps

Once the fork is set up:

1. Clone the fork locally if needed
2. Review upstream Alchemy codebase structure
3. Start Phase 1 implementation (Label resource)
4. Set up CI/CD for the fork
5. Document development workflow
