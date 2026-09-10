# Desired-State DSL Design

## Purpose

This document specifies the desired-state declarative resource system for `ghfs`, aligned with **alchemy.run v2 Stack resources** and **Effect v4 RC** patterns. The system enables Infrastructure-as-Code style management of GitHub issues, pull requests, labels, milestones, and other repository resources.

## Core Philosophy

Like alchemy.run treats cloud resources as Effect programs with reconcile/delete lifecycles, `ghfs` treats GitHub repository entities as declarative resources. Users declare desired state in `.ghfs/_desired/` files; `ghfs` computes drift, plans changes, and applies them via GitHub's API.

### Key Parallels

| Concept | alchemy.run | ghfs |
|---------|-------------|------|
| **Stack** | `Alchemy.Stack()` with providers + state | `.ghfs/_desired/` directory with resource files |
| **Resource** | `yield* Bucket("Bucket", { props })` | Resource declaration in `.ghfs/_desired/issue-123.yml` |
| **Provider** | `Cloudflare.providers()` implements reconcile/delete | GitHub provider implements reconcile/delete via Octokit |
| **Plan** | `alchemy plan` compares desired vs state | `ghfs status` shows drift; `ghfs plan` shows operations |
| **Apply** | `alchemy deploy` executes reconcile/delete | `ghfs apply` executes operations via GitHub API |
| **Output** | Lazy typed reference resolved at deploy time | Resource references via `ghfs:issue:123` URIs |
| **State** | Persistent state store (local/cloud) | `.ghfs/.sync.json` tracks observed state |
| **Stage** | `dev_$USER`, `staging`, `prod` isolation | Repository-scoped (future: multi-repo stages) |

## Resource Types

### GitHub Resource Hierarchy

```
GitHub Repository (implicit root)
├── Issue
├── Pull
├── Label
├── Milestone
├── Project (future)
├── Wiki (future)
└── RepoSettings (future)
```

Each resource type has:
- **Logical ID**: stable identifier within the repository (e.g. issue number, label name)
- **Input Props**: desired configuration (title, state, labels, etc)
- **Output Attrs**: observed attributes from GitHub (created_at, updated_at, urls, etc)

### Resource URIs

Resource addressing follows `ghfs:<kind>:<id>` pattern:

```
ghfs:issue:123
ghfs:pull:456
ghfs:label:bug
ghfs:milestone:v1.0
ghfs:wiki:Home
```

Used for:
- Targeting specific resources: `ghfs apply --target ghfs:issue:123`
- Cross-resource references: `closes: ghfs:issue:123` in PR resource
- CLI operations: `ghfs show ghfs:issue:123`

## Desired State Files

### Directory Structure

```
.ghfs/
  _desired/                    # Desired state declarations
    issues/
      00123-add-feature.yml    # Desired state for issue #123
      00124-fix-bug.yml        # Desired state for issue #124
    pulls/
      00456-implement-x.yml    # Desired state for PR #456
    labels/
      bug.yml                  # Desired state for label "bug"
      enhancement.yml          # Desired state for label "enhancement"
    milestones/
      v1.0.yml                 # Desired state for milestone "v1.0"
    _stack.yml                 # Optional: Stack-level config
```

### Resource File Format

Each resource file is a YAML declaration with:

```yaml
# .ghfs/_desired/issues/00123-add-feature.yml
schema: ghfs/v1/Issue
id: 123  # logical ID (issue number)
props:
  title: "Add feature X"
  state: open
  labels:
    - feature
    - priority-high
  assignees:
    - octocat
  milestone: v1.0
  body: |
    ## Description
    We need feature X because...
    
    ## Acceptance Criteria
    - [ ] Criterion 1
    - [ ] Criterion 2
```

### Label Resource Example

```yaml
# .ghfs/_desired/labels/bug.yml
schema: ghfs/v1/Label
id: bug  # logical ID (label name)
props:
  name: bug
  color: d73a4a
  description: "Something isn't working"
```

### Pull Request Resource Example

```yaml
# .ghfs/_desired/pulls/00456-implement-x.yml
schema: ghfs/v1/Pull
id: 456
props:
  title: "Implement feature X"
  state: open
  base: main
  head: feature/x
  draft: false
  labels:
    - feature
  reviewers:
    - reviewer1
    - reviewer2
  body: |
    Implements #123
    
    ## Changes
    - Added X
    - Updated Y
```

### Milestone Resource Example

```yaml
# .ghfs/_desired/milestones/v1.0.yml
schema: ghfs/v1/Milestone
id: v1.0  # logical ID (milestone title)
props:
  title: "v1.0"
  state: open
  due_on: "2026-12-31T00:00:00Z"
  description: "First major release"
```

## Provider Implementation

### Resource Lifecycle

Following alchemy.run's provider pattern, each resource type has:

1. **`reconcile`**: Converge actual GitHub state to desired state
   - Called for create, update, and adoption
   - Idempotent: repeated calls with same desired state are safe
   - Returns output attributes

2. **`delete`**: Remove resource from GitHub
   - Called when resource removed from desired state
   - Idempotent: deleting non-existent resource is success

3. **`diff`** (optional): Determine if change requires replacement
   - Most GitHub resources support in-place update
   - Some changes (e.g., changing issue to PR) require replacement

4. **`read`** (optional): Read current state from GitHub
   - Used for state recovery and adoption
   - Checks if resource exists and ownership

### Reconcile Logic Example (Issue)

```typescript
async function reconcileIssue(
  provider: GitHubProvider,
  id: number,
  desired: IssueProps,
  current: IssueState | undefined
): Promise<IssueOutput> {
  // Case 1: Create new issue
  if (!current) {
    const issue = await provider.issues.create({
      title: desired.title,
      body: desired.body,
      labels: desired.labels,
      assignees: desired.assignees,
      milestone: resolveMilestone(desired.milestone),
    })
    return {
      number: issue.number,
      url: issue.html_url,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    }
  }

  // Case 2: Update existing issue
  const updates: Partial<IssueUpdateParams> = {}
  
  if (desired.title !== current.title) {
    updates.title = desired.title
  }
  if (desired.state !== current.state) {
    updates.state = desired.state
  }
  if (!arraysEqual(desired.labels, current.labels)) {
    updates.labels = desired.labels
  }
  // ... more field comparisons
  
  if (Object.keys(updates).length > 0) {
    const issue = await provider.issues.update(id, updates)
    return {
      number: issue.number,
      url: issue.html_url,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    }
  }
  
  // No changes needed
  return current.output
}
```

## CLI Commands

### `ghfs status` - Show Drift

Shows difference between desired state (`.ghfs/_desired/`) and observed state (`.ghfs/.sync.json`):

```bash
$ ghfs status

Repository: owner/repo
Last sync: 2 minutes ago

Drift summary:
  3 resources to create
  2 resources to update
  1 resource to delete
  15 resources in sync

Changes:
  + ghfs:issue:125      (create)   - Not yet created
  ~ ghfs:issue:123      (update)   - Title changed
  ~ ghfs:label:bug      (update)   - Color changed
  - ghfs:milestone:v0.9 (delete)   - No longer declared

Run 'ghfs plan' for detailed operation plan.
Run 'ghfs apply' to apply changes.
```

### `ghfs plan` - Show Operation Plan

Shows detailed operations that would be executed:

```bash
$ ghfs plan

Plan for repository owner/repo:

Resources: +3 ~2 -1 (6 operations)

  + create ghfs:issue:125
      title: "New feature request"
      labels: [feature, priority-high]
      
  ~ update ghfs:issue:123
      ~ title: "Add feature" => "Add feature X"
      ~ labels: [feature] => [feature, priority-high]
      
  ~ update ghfs:label:bug
      ~ color: "fc2929" => "d73a4a"
      
  - delete ghfs:milestone:v0.9
      reason: no longer declared in _desired/

Run 'ghfs apply' to execute this plan.
Run 'ghfs apply --auto-approve' to skip confirmation.
```

### `ghfs apply` - Apply Changes

Executes the operations to converge GitHub to desired state:

```bash
$ ghfs apply

Plan: +3 ~2 -1

Do you want to apply these changes? (yes/no): yes

Applying changes...

  ✓ Created ghfs:issue:125
  ✓ Updated ghfs:issue:123
  ✓ Updated ghfs:label:bug
  ✓ Deleted ghfs:milestone:v0.9

Apply complete! 4 operations succeeded, 0 failed.

Run 'ghfs sync' to refresh observed state.
```

#### Scoped Apply

Target specific resources:

```bash
# Apply changes to single resource
$ ghfs apply --target ghfs:issue:123

# Apply changes to all issues
$ ghfs apply --target-kind issue

# Apply changes to multiple resources
$ ghfs apply --target ghfs:issue:123 --target ghfs:issue:124

# Apply changes to resources matching pattern
$ ghfs apply --target 'ghfs:issue:*'
```

### `ghfs import` - Import Existing Resources

Adopt existing GitHub resources into desired state:

```bash
# Import single issue
$ ghfs import ghfs:issue:123

# Import all open issues
$ ghfs import --kind issue --state open

# Import with custom path
$ ghfs import ghfs:issue:123 --output .ghfs/_desired/issues/custom-name.yml
```

Creates desired-state file from current GitHub state:

```yaml
# Generated by: ghfs import ghfs:issue:123
# Date: 2026-09-10T09:44:00Z
schema: ghfs/v1/Issue
id: 123
props:
  title: "Current issue title"
  state: open
  labels:
    - bug
  # ... current state from GitHub
```

### `ghfs generate` - Generate Desired State Files

Create new desired-state files interactively:

```bash
# Generate new issue
$ ghfs generate issue

# Generate with template
$ ghfs generate issue --template feature-request

# Generate from execute.md operation
$ ghfs generate --from-execute execute.md
```

## State Management

### `.sync.json` Structure (Enhanced)

```json
{
  "version": 1,
  "repo": "owner/repo",
  "lastSyncedAt": "2026-09-10T09:44:00Z",
  "items": {
    "issue-123": {
      "number": 123,
      "kind": "issue",
      "state": "open",
      "lastUpdatedAt": "2026-09-10T09:00:00Z",
      "lastSyncedAt": "2026-09-10T09:44:00Z",
      "filePath": "issues/00123-add-feature.md",
      "desiredPath": "_desired/issues/00123-add-feature.yml",
      "managedBy": "desired-state",
      "drift": "in-sync"
    }
  },
  "desiredState": {
    "lastPlanAt": "2026-09-10T09:43:00Z",
    "resources": {
      "ghfs:issue:123": {
        "schema": "ghfs/v1/Issue",
        "desiredPath": "_desired/issues/00123-add-feature.yml",
        "observedHash": "sha256:abc123...",
        "desiredHash": "sha256:abc123...",
        "drift": "in-sync"
      },
      "ghfs:issue:125": {
        "schema": "ghfs/v1/Issue", 
        "desiredPath": "_desired/issues/00125-new-feature.yml",
        "observedHash": null,
        "desiredHash": "sha256:def456...",
        "drift": "not-created"
      }
    }
  }
}
```

### Drift Detection

Drift is computed by comparing:
1. **Desired state**: Parsed from `.ghfs/_desired/**/*.yml`
2. **Observed state**: Current GitHub state from last sync
3. **Semantic diff**: Field-level comparison ignoring timestamps/ordering

Drift states:
- `in-sync`: Observed matches desired
- `update-needed`: Observed differs from desired
- `not-created`: Desired but not observed (needs create)
- `not-declared`: Observed but not desired (needs delete)
- `conflicted`: Both changed since last plan (manual resolution needed)

## Migration from Execute Model

### Coexistence Strategy

Both models can coexist during migration:

1. **Execute model** (`.ghfs/execute.yml` + `execute.md`):
   - Imperative: explicit operations in order
   - Best for: one-off operations, bulk updates, scripts

2. **Desired-state model** (`.ghfs/_desired/`):
   - Declarative: declare end state, ghfs computes operations
   - Best for: ongoing management, infrastructure-as-code

### Conversion

```bash
# Convert execute.yml operations to desired state
$ ghfs convert execute.yml --to-desired

# Convert desired state to execute.yml (one-time operations)
$ ghfs convert _desired/ --to-execute
```

### Frontmatter as Desired State

Per-item frontmatter editing (existing feature) becomes syntactic sugar for desired state:

```markdown
---
# .ghfs/issues/00123-add-feature.md
title: "Add feature X"
state: open
labels: [feature, priority-high]
---

Issue body content...
```

On `ghfs execute`, ghfs generates operations from frontmatter diff. This is equivalent to maintaining `.ghfs/_desired/issues/00123-add-feature.yml` but more ergonomic for manual editing.

## Resource Declaration Format

### Full Specification

```typescript
interface ResourceDeclaration<T extends ResourceType> {
  schema: `ghfs/v1/${T}`  // e.g. "ghfs/v1/Issue"
  id: string | number     // logical ID
  props: ResourceProps<T>  // typed props for resource type
  meta?: {
    managedBy?: string    // e.g. "ghfs", "terraform-github"
    source?: string       // where this declaration came from
    annotations?: Record<string, string>
  }
}
```

### Props by Resource Type

#### Issue Props

```yaml
props:
  title: string
  state: "open" | "closed"
  body?: string
  labels?: string[]
  assignees?: string[]
  milestone?: string | null
  # Future:
  # locked?: boolean
  # lock_reason?: string
```

#### Pull Props

```yaml
props:
  title: string
  state: "open" | "closed"
  body?: string
  base: string
  head: string
  draft?: boolean
  labels?: string[]
  assignees?: string[]
  reviewers?: string[]
  milestone?: string | null
  # Future:
  # auto_merge?: boolean
  # merge_method?: "merge" | "squash" | "rebase"
```

#### Label Props

```yaml
props:
  name: string
  color: string  # hex without #
  description?: string
```

#### Milestone Props

```yaml
props:
  title: string
  state: "open" | "closed"
  description?: string
  due_on?: string  # ISO 8601 datetime
```

## Comparison to Other IaC Tools

### vs Terraform

| Feature | Terraform | ghfs |
|---------|-----------|------|
| **State** | terraform.tfstate (explicit) | .ghfs/.sync.json (automatic) |
| **Plan** | `terraform plan` | `ghfs plan` |
| **Apply** | `terraform apply` | `ghfs apply` |
| **Import** | `terraform import` | `ghfs import` |
| **Language** | HCL | YAML (simpler, more accessible) |
| **Providers** | Many (AWS, GCP, etc) | GitHub-focused |
| **Use case** | General infrastructure | GitHub repository management |

### vs Ansible

| Feature | Ansible | ghfs |
|---------|---------|------|
| **Model** | Playbooks (imperative) | Desired state (declarative) |
| **Idempotence** | Module-dependent | Built-in via reconcile |
| **Inventory** | External hosts | GitHub repository |
| **State** | None (stateless) | .sync.json tracks state |
| **Drift** | Not tracked | `ghfs status` shows drift |

### vs alchemy.run

| Feature | alchemy.run | ghfs |
|---------|-------------|------|
| **Target** | Cloud infrastructure | GitHub repositories |
| **Language** | TypeScript + Effect | CLI + YAML |
| **Resources** | Cloudflare, AWS, etc | Issues, PRs, Labels, etc |
| **Reconcile** | Provider.reconcile | Same pattern |
| **Stack** | Alchemy.Stack() | .ghfs/_desired/ directory |
| **Output** | Typed Output references | Resource URIs |

## Write Coverage Matrix

### Current Coverage (Execute Model)

- ✅ Issues: close, reopen, set-title, set-body, add-comment
- ✅ Labels: add-labels, remove-labels, set-labels
- ✅ Assignees: add-assignees, remove-assignees, set-assignees
- ✅ Milestones: set-milestone, clear-milestone
- ✅ Pull Requests: reviewers, ready/draft, approve, merge
- ✅ Reactions: add-reaction, remove-reaction
- ✅ Lock/unlock

### Desired Coverage (Desired-State Model)

| Resource | Create | Update | Delete | Import | Priority |
|----------|--------|--------|--------|--------|----------|
| Issue | ✅ | ✅ | ✅ | ✅ | P0 |
| Pull | ⚠️ | ✅ | ✅ | ✅ | P0 |
| Label | ✅ | ✅ | ✅ | ✅ | P0 |
| Milestone | ✅ | ✅ | ✅ | ✅ | P0 |
| Project | ❌ | ❌ | ❌ | ❌ | P1 |
| Wiki | ❌ | ❌ | ❌ | ❌ | P1 |
| RepoSettings | ❌ | ❌ | ❌ | ❌ | P2 |
| Branch Protection | ❌ | ❌ | ❌ | ❌ | P2 |
| Webhooks | ❌ | ❌ | ❌ | ❌ | P2 |

⚠️ = Partial support (cannot create PRs via API without head branch)

## Implementation Plan

### Phase 1: Core Infrastructure (P0)

1. Resource type definitions (Issue, Pull, Label, Milestone)
2. Provider interface with reconcile/delete
3. Desired-state file parser (YAML)
4. Drift detection engine
5. Plan generation
6. Apply execution

### Phase 2: CLI Commands (P0)

1. `ghfs status` - show drift
2. `ghfs plan` - show operation plan
3. `ghfs apply` - execute plan
4. `ghfs import` - adopt existing resources

### Phase 3: Migration & Coexistence (P1)

1. Execute ↔ Desired-state conversion
2. Frontmatter as desired-state syntactic sugar
3. Backward compatibility with existing execute model
4. Migration guide

### Phase 4: Extended Resources (P1-P2)

1. Projects (GitHub Projects v2)
2. Wiki pages
3. Repository settings
4. Branch protection rules
5. Webhooks

## Example Workflows

### Workflow 1: Manage Labels Declaratively

```yaml
# .ghfs/_desired/labels/bug.yml
schema: ghfs/v1/Label
id: bug
props:
  name: bug
  color: d73a4a
  description: "Something isn't working"
```

```yaml
# .ghfs/_desired/labels/feature.yml
schema: ghfs/v1/Label
id: feature
props:
  name: feature
  color: a2eeef
  description: "New feature or request"
```

```bash
$ ghfs apply
Plan: +2 ~0 -0
  + create ghfs:label:bug
  + create ghfs:label:feature

Apply complete! 2 labels created.
```

### Workflow 2: Bulk Issue Management

```yaml
# .ghfs/_desired/issues/00123-feature-x.yml
schema: ghfs/v1/Issue
id: 123
props:
  title: "Implement feature X"
  state: open
  labels: [feature, v1.0]
  milestone: v1.0
  assignees: [developer1]
```

```yaml
# .ghfs/_desired/issues/00124-fix-bug-y.yml
schema: ghfs/v1/Issue
id: 124
props:
  title: "Fix bug Y"
  state: open
  labels: [bug, priority-high]
  milestone: v1.0
  assignees: [developer2]
```

```bash
$ ghfs apply
Plan: +0 ~2 -0
  ~ update ghfs:issue:123 (milestone: null => v1.0)
  ~ update ghfs:issue:124 (labels: [bug] => [bug, priority-high])
  
Apply complete! 2 issues updated.
```

### Workflow 3: Milestone Lifecycle

```yaml
# .ghfs/_desired/milestones/v1.0.yml
schema: ghfs/v1/Milestone
id: v1.0
props:
  title: "v1.0"
  state: open
  due_on: "2026-12-31T00:00:00Z"
  description: "First major release"
```

```bash
# Create milestone
$ ghfs apply
  + create ghfs:milestone:v1.0

# Later: close milestone when done
$ vim .ghfs/_desired/milestones/v1.0.yml  # change state: closed
$ ghfs apply
  ~ update ghfs:milestone:v1.0 (state: open => closed)

# Later: archive milestone
$ rm .ghfs/_desired/milestones/v1.0.yml
$ ghfs apply
  - delete ghfs:milestone:v1.0
```

## Next Steps

1. ✅ Complete design document
2. ⏳ Implement resource type system
3. ⏳ Implement GitHub provider with reconcile/delete
4. ⏳ Implement drift detection
5. ⏳ Implement `ghfs status`, `ghfs plan`, `ghfs apply` commands
6. ⏳ Write tests for reconcile logic
7. ⏳ Create migration guide
8. ⏳ File epic + child issues for write coverage
9. ⏳ Open draft PR

## References

- [alchemy.run v2 Documentation](https://alchemy.run/)
- [alchemy.run Resource Lifecycle](https://alchemy.run/infrastructure-as-code/resource-lifecycle/)
- [Effect v4 RC](https://effect.website/blog/effect-v4-rc-august-recap)
- [Terraform GitHub Provider](https://registry.terraform.io/providers/integrations/github/)
- [Ansible GitHub Modules](https://docs.ansible.com/ansible/latest/collections/community/general/github_repo_module.html)
