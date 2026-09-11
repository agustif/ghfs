# Alchemy Fork Resource Inventory

**Fork URL**: https://github.com/agustif/alchemy  
**Base Branch**: main  
**Purpose**: GitHub provider for Infrastructure-as-Effects and ghfs two-way sync  
**Epic**: [alchemy#6 - Extend GitHub provider for ghfs two-way sync](https://github.com/agustif/alchemy/issues/6)

## Overview

The `agustif/alchemy` fork extends alchemy-run/alchemy with a comprehensive GitHub provider for declarative infrastructure management. This enables ghfs to use alchemy's apply/plan/deploy workflow for GitHub resources.

**ghfs consumes this fork directly** via `package.json` dependency:

```json
{
  "dependencies": {
    "alchemy": "github:agustif/alchemy#main&path:/packages/alchemy"
  }
}
```

All `import { Alchemy } from "alchemy"` statements in ghfs resolve to the agustif/alchemy fork, not the upstream alchemy-run/alchemy package.

## GitHub Provider Resources (Available in Fork)

Located in `packages/alchemy/src/GitHub/`:

### Core Resources (Apply/Declare)

| Resource | File | Status | Description |
|----------|------|--------|-------------|
| **Label** | `Label.ts` | ✅ Available | Repository labels with color and description |
| **Milestone** | `Milestone.ts` | ✅ Available | Project milestones with due dates |
| **Issue** | `Issue.ts` | ✅ Available | Repository issues |
| **PullRequest** | `PullRequest.ts` | ✅ Available | Pull requests |
| **WikiPage** | `WikiPage.ts` | ✅ Available | Repository wiki pages |
| **Release** | `Release.ts` | ✅ Available | GitHub releases with tags |
| **Collaborator** | `Collaborator.ts` | ✅ Available | Repository collaborators and permissions |
| **TeamAccess** | `TeamAccess.ts` | ✅ Available | Organization team access to repositories |
| **Ruleset** | `Ruleset.ts` | ✅ Available | Branch protection and repository rulesets |
| **BranchProtection** | `BranchProtection.ts` | ✅ Available | Branch protection rules |
| **Environment** | `Environment.ts` | ✅ Available | Deployment environments |
| **Secret** | `Secret.ts` | ✅ Available | Repository secrets (encrypted) |
| **Secrets** | `Secrets.ts` | ✅ Available | Secret collection management |
| **Variable** | `Variable.ts` | ✅ Available | Repository variables |
| **Variables** | `Variables.ts` | ✅ Available | Variable collection management |
| **Webhook** | `Webhook.ts` | ✅ Available | Repository webhooks |
| **Comment** | `Comment.ts` | ✅ Available | Issue/PR comments |

### Infrastructure Resources

| Resource | File | Description |
|----------|------|-------------|
| **Repository** | `Repository.ts` | Repository metadata and configuration |
| **Octokit** | `Octokit.ts` | Authenticated GitHub API client layer |
| **AuthProvider** | `AuthProvider.ts` | GitHub authentication strategies |
| **Credentials** | `Credentials.ts` | Credential management (token/app) |
| **BaseUrl** | `BaseUrl.ts` | GitHub API base URL configuration |
| **Env** | `Env.ts` | Environment context for resources |
| **Providers** | `Providers.ts` | Provider layer composition |
| **Query** | `Query.ts` | GraphQL query utilities |
| **RepositoryEventSource** | `RepositoryEventSource.ts` | Event-driven resource updates |

### Exported API

From `packages/alchemy/src/GitHub/index.ts`:

```typescript
export * as Auth from "./AuthProvider.ts"
export * from "./BranchProtection.ts"
export * from "./Collaborator.ts"
export * from "./Comment.ts"
export { GitHubCredentials, fromEnv, fromToken } from "./Credentials.ts"
export * from "./Env.ts"
export * from "./Environment.ts"
export * from "./Issue.ts"
export * from "./Label.ts"
export * from "./Milestone.ts"
export * from "./PullRequest.ts"
export * from "./Providers.ts"
export * from "./Query.ts"
export * from "./Release.ts"
export * from "./Repository.ts"
export * from "./RepositoryEventSource.ts"
export * from "./Ruleset.ts"
export * from "./Secret.ts"
export * from "./Secrets.ts"
export * from "./TeamAccess.ts"
export * from "./Variable.ts"
export * from "./Variables.ts"
export * from "./Webhook.ts"
export * from "./WikiPage.ts"
```

## Fork Metadata (as of 2026-09-10)

### Labels (10 default GitHub labels)

| Name | Color | Description |
|------|-------|-------------|
| accessibility | f143ab | Barrier affecting people with disabilities |
| bug | d73a4a | Something isn't working |
| documentation | 0075ca | Improvements or additions to documentation |
| duplicate | cfd3d7 | This issue or pull request already exists |
| enhancement | a2eeef | New feature or request |
| good first issue | 7057ff | Good for newcomers |
| help wanted | 008672 | Extra attention is needed |
| invalid | e4e669 | This doesn't seem right |
| question | d876e3 | Further information is requested |
| wontfix | ffffff | This will not be worked on |

### Other Resources

- **Milestones**: None
- **Issues**: None (except epic #6)
- **Pull Requests**: None (merged to main)
- **Releases**: None
- **Rulesets**: None (403 access / not accessible via token)
- **Collaborators**: Not accessible (403)
- **Wiki Pages**: Not checked (would need to clone)

### Epic #6 Status

**Title**: Epic: Extend GitHub provider for ghfs two-way sync  
**URL**: https://github.com/agustif/alchemy/issues/6  
**Status**: Open (Phase 1 Apply/Declare ✅ Complete, Phase 2 Observe/Sync 🔄 In Progress)

**Goals**:
- ✅ Add Issue and PullRequest resources (PR #1)
- 🔄 Implement ghfs integration layer for read operations
- 🔄 Add observation/import capabilities for existing Issues/PRs
- 🔄 Support for filtering and querying GitHub resources
- 🔄 Two-way sync reconciliation patterns

## Integration Pattern

The agustif/alchemy fork provides the **apply** side of the two-way sync:

```
┌─────────────────────────────────────────────────────┐
│                      ghfs                            │
│                                                      │
│  Observe/Read    ┌──────────────────────┐  Apply   │
│  (ghfs sync) ────▶  .ghfs/ filesystem   ◀──── (ghfs apply) │
│                   └──────────────────────┘           │
│                                                      │
│                           │                          │
│                           │                          │
│                           ▼                          │
│                   ┌──────────────────────┐           │
│                   │   GitHub REST API    │           │
│                   └──────────────────────┘           │
│                                                      │
└─────────────────────────────────────────────────────┘

Apply Path: ghfs → alchemy fork → GitHub API
Observe Path: GitHub API → ghfs (read-only sync)
```

### Usage Example (Planned)

```typescript
// ghfs.run.ts (alchemy Stack)
import { Alchemy } from "alchemy"  // from agustif/alchemy fork
import * as GitHub from "alchemy/GitHub"

export default Alchemy.Stack(
  "my-repo",
  {
    providers: [GitHub.Providers],
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    // Declare desired state
    yield* GitHub.Label({
      name: "priority:high",
      color: "d93f0b",
      description: "High priority issues"
    })

    yield* GitHub.Milestone({
      title: "v2.0",
      description: "Version 2.0 release",
      due_on: "2026-12-31"
    })

    yield* GitHub.Issue({
      title: "Example issue from alchemy",
      body: "Created via alchemy fork apply",
      labels: ["priority:high"],
      milestone: "v2.0"
    })
  })
)
```

## Fork Consumption Strategy

### Package Dependency

```json
{
  "dependencies": {
    "alchemy": "github:agustif/alchemy#main&path:/packages/alchemy"
  }
}
```

Or via pnpm workspace / override if needed.

### User Decision (2026-09-10)

**Fork-first**: agustif/ghfs consumes agustif/alchemy fork directly. Upstream contribution PRs to alchemy-run/alchemy are non-blocking and optional.

**Rationale**:
- Two-way sync (alchemy deploy via fork; ghfs observes directly)
- Upstream PRs optional (not blocking ghfs development)
- Clean separation: apply logic in alchemy fork, observe logic in ghfs

## Next Steps

1. ✅ Inventory complete
2. 🔄 Wire ghfs to consume fork dependency
3. 🔄 Add alchemy program stub/example
4. 🔄 Update README with fork integration notes
5. 🔄 Create PR linking to alchemy#6 epic

## Resources

- Fork: https://github.com/agustif/alchemy
- Epic: https://github.com/agustif/alchemy/issues/6
- Upstream: https://github.com/alchemy-run/alchemy
- Alchemy docs: https://alchemy.run/
