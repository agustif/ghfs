# Alchemy Fork Extension Roadmap

## Overview

This document outlines the roadmap for extending the GitHub provider in the forked `agustif/alchemy` repository to enable two-way synchronization with ghfs.

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
- **Responsibilities**:
  - Extend GitHub provider with declarative two-way sync capabilities
  - Implement resource types matching upstream patterns from [alchemy.run/github/](https://alchemy.run/github/)
  - Apply filesystem changes back to GitHub
  - Infrastructure-as-Effects using Effect v4 RC

## Technology Stack

- **Effect v4 RC**: Used throughout both repositories
- **Alchemy**: Infrastructure-as-Effects framework (forked)
- **TypeScript**: Primary language
- **GitHub API**: Via Octokit or native fetch

## Extension Roadmap

The following GitHub resources need to be implemented in the extended provider, following upstream Alchemy patterns:

### Phase 1: Core Issue & PR Management
Extend beyond the current upstream resources (Repository, Secrets, Variables, Environment, Webhook, Comment):

1. **Label** - Manage issue/PR labels
   - Create, update, delete labels
   - Apply labels to issues/PRs
   - Sync with `.ghfs/labels/` representation

2. **Milestone** - Manage milestones
   - Create, update, delete milestones
   - Assign issues/PRs to milestones
   - Sync with `.ghfs/milestones/` representation

3. **Issue** - Full issue lifecycle
   - Create, update, close/reopen issues
   - Manage assignees, labels, milestones
   - Sync with `.ghfs/issues/` representation
   - Handle issue comments (beyond current Comment resource)

4. **PullRequest** - Full PR lifecycle
   - Create, update, merge PRs
   - Manage reviewers, labels, milestones
   - Sync with `.ghfs/pulls/` representation
   - Handle PR reviews and review comments

### Phase 2: Repository Configuration

5. **Branch** - Branch management
   - Create, delete branches
   - Branch protection rules

6. **Ruleset** - Repository rulesets
   - Create, update rulesets
   - Apply rules to branches/tags
   - Sync with `.ghfs/rulesets/` representation

7. **Team** - Team management (if org-scoped)
   - Create, update teams
   - Manage team members
   - Repository permissions

### Phase 3: Advanced Features

8. **Project** (GitHub Projects v2)
   - Create, update projects
   - Manage project items
   - Custom fields and views

9. **WikiPage** - Wiki management
   - Create, update wiki pages
   - Sync with `.ghfs/wiki/` representation

10. **Release** - Release management
    - Create releases
    - Upload release assets
    - Generate release notes

### Phase 4: Integration & Sync

11. **Two-Way Sync Engine**
    - Detect changes in `.ghfs/` filesystem
    - Apply changes via Alchemy provider
    - Conflict resolution strategy
    - Dry-run mode for validation

12. **CLI Integration**
    - Bridge ghfs CLI to Alchemy apply operations
    - Batch operation support
    - Progress reporting

## Implementation Patterns

Following upstream Alchemy patterns from [alchemy.run/github/](https://alchemy.run/github/):

### Resource Definition Pattern

```typescript
export const Label = (id: string, config: LabelConfig) =>
  Effect.gen(function* () {
    // Resource implementation using Effect
    yield* Effect.log(`Managing label ${config.name}`)
    
    // Converge to desired state
    const label = yield* convergeLabelState(config)
    
    // Return resource output
    return {
      id: label.id,
      name: label.name,
      color: label.color,
      description: label.description,
    }
  })
```

### State Convergence Pattern

```typescript
function* convergeLabelState(config: LabelConfig) {
  const existing = yield* getLabelIfExists(config.owner, config.repository, config.name)
  
  if (!existing) {
    return yield* createLabel(config)
  }
  
  if (needsUpdate(existing, config)) {
    return yield* updateLabel(existing.id, config)
  }
  
  return existing
}
```

### Destruction Handling Pattern

```typescript
export interface LabelConfig {
  owner: string
  repository: string
  name: string
  color: string
  description?: string
  retainOnDestroy?: boolean // Default: false for labels
}
```

## Integration with ghfs

### Filesystem Mapping

The `.ghfs/` structure maps to Alchemy resources:

```
.ghfs/
├── issues/
│   ├── 123.json          → Issue resource
│   └── 123/
│       └── comments/     → Comment resources
├── pulls/
│   ├── 456.json          → PullRequest resource
│   └── 456/
│       ├── comments/     → Comment resources
│       └── reviews/      → Review resources
├── labels/
│   └── *.json            → Label resources
├── milestones/
│   └── *.json            → Milestone resources
└── rulesets/
    └── *.json            → Ruleset resources
```

### Sync Flow

1. **ghfs → alchemy**: Filesystem changes trigger Alchemy apply
2. **GitHub → ghfs**: ghfs sync pulls latest state
3. **Conflict resolution**: Last-write-wins with user notification

## Repository Links

- **Upstream Alchemy**: https://github.com/alchemy-run/alchemy
- **Fork** (to be created): https://github.com/agustif/alchemy
- **ghfs**: https://github.com/agustif/ghfs
- **Alchemy GitHub Provider Docs**: https://alchemy.run/github/

## Manual Setup Steps Required

Due to GitHub token limitations in the cloud agent environment, the following steps need to be performed manually:

### 1. Create Fork

```bash
# Via GitHub CLI (requires appropriate permissions)
gh repo fork alchemy-run/alchemy --clone=false

# Or via GitHub web UI:
# Navigate to https://github.com/alchemy-run/alchemy
# Click "Fork" button
# Select "agustif" as owner
```

### 2. Enable Issues on Fork

```bash
gh repo edit agustif/alchemy --enable-issues
```

### 3. Create Epic Issue on Fork

Create an issue on `agustif/alchemy` with the following content:

**Title**: Extend GitHub provider for ghfs two-way sync

**Body**:
```markdown
# Epic: Extend GitHub provider for ghfs two-way sync

This epic tracks the extension of the GitHub provider to enable declarative two-way synchronization with ghfs.

## Goals

- Implement additional GitHub resource types (Label, Milestone, Issue, PullRequest, etc.)
- Enable apply operations from filesystem state
- Maintain compatibility with upstream Alchemy patterns
- Use Effect v4 RC throughout

## Architecture

- **ghfs**: Observe (sync to .ghfs) + CLI bridge
- **agustif/alchemy fork**: Declare/apply (extended GitHub provider)
- **Effect v4 RC**: Throughout both repositories

## Roadmap

See detailed roadmap in linked PR/issue from ghfs repository.

## Resources to Implement

- [ ] Phase 1: Label, Milestone, Issue, PullRequest
- [ ] Phase 2: Branch, Ruleset, Team
- [ ] Phase 3: Project, WikiPage, Release
- [ ] Phase 4: Two-way sync engine, CLI integration

## Reference

- Upstream patterns: https://alchemy.run/github/
- ghfs repository: https://github.com/agustif/ghfs
```

### 4. Clone Fork Locally (Optional)

If you need to work on the fork locally:

```bash
gh repo clone agustif/alchemy
cd alchemy
# Set up development environment
```

## Next Steps

1. ✅ Document roadmap (this file)
2. ⏳ Create fork manually (see steps above)
3. ⏳ Enable issues on fork
4. ⏳ File epic issue on fork
5. ⏳ Create tracking issue on ghfs linking to fork
6. Start Phase 1 implementation

## Notes

- The fork should track upstream Alchemy releases
- Keep the GitHub provider extension in a separate package/module for clarity
- Consider upstreaming useful additions back to alchemy-run/alchemy
- Document any deviations from upstream patterns
