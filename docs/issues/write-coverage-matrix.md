# Write Coverage Matrix

## Overview

Comprehensive tracking of GitHub API write operations supported by ghfs across both the imperative execute model and the declarative desired-state model.

## Current State (Execute Model)

### Issues

| Operation | Execute Action | Status | Notes |
|-----------|---------------|--------|-------|
| Create | N/A | ❌ | GitHub issues can only be created via API |
| Close | `close` | ✅ | Fully implemented |
| Reopen | `reopen` | ✅ | Fully implemented |
| Update title | `set-title` | ✅ | Fully implemented |
| Update body | `set-body` | ✅ | Fully implemented |
| Add comment | `add-comment` | ✅ | Fully implemented |
| Close with comment | `close-with-comment` | ✅ | Fully implemented |
| Add labels | `add-labels` | ✅ | Fully implemented |
| Remove labels | `remove-labels` | ✅ | Fully implemented |
| Set labels | `set-labels` | ✅ | Fully implemented |
| Add assignees | `add-assignees` | ✅ | Fully implemented |
| Remove assignees | `remove-assignees` | ✅ | Fully implemented |
| Set assignees | `set-assignees` | ✅ | Fully implemented |
| Set milestone | `set-milestone` | ✅ | Fully implemented |
| Clear milestone | `clear-milestone` | ✅ | Fully implemented |
| Lock | `lock` | ✅ | Fully implemented |
| Unlock | `unlock` | ✅ | Fully implemented |
| Delete | N/A | ❌ | GitHub API doesn't support issue deletion |

### Pull Requests

| Operation | Execute Action | Status | Notes |
|-----------|---------------|--------|-------|
| Create | N/A | ❌ | Requires head branch (out of scope) |
| Close | `close` | ✅ | Same as issues |
| Reopen | `reopen` | ✅ | Same as issues |
| Update title | `set-title` | ✅ | Same as issues |
| Update body | `set-body` | ✅ | Same as issues |
| Add comment | `add-comment` | ✅ | Same as issues |
| Request reviewers | `request-reviewers` | ✅ | Fully implemented |
| Remove reviewers | `remove-reviewers` | ✅ | Fully implemented |
| Mark ready for review | `mark-ready-for-review` | ✅ | Fully implemented |
| Convert to draft | `convert-to-draft` | ✅ | Fully implemented |
| Approve | `approve` | ✅ | Fully implemented |
| Request changes | `request-changes` | ✅ | Fully implemented |
| Review comment | `review-comment` | ✅ | Fully implemented |
| Merge | `merge` | ✅ | Fully implemented |
| Enqueue merge | `enqueue-merge` | ✅ | Fully implemented |
| Delete | N/A | ❌ | Same as issues |

### Labels

| Operation | Execute Action | Status | Notes |
|-----------|---------------|--------|-------|
| Create | N/A | ❌ | Not exposed in execute model |
| Update | N/A | ❌ | Not exposed in execute model |
| Delete | N/A | ❌ | Not exposed in execute model |

### Milestones

| Operation | Execute Action | Status | Notes |
|-----------|---------------|--------|-------|
| Create | N/A | ❌ | Not exposed in execute model |
| Update | N/A | ❌ | Not exposed in execute model |
| Close | N/A | ❌ | Not exposed in execute model |
| Delete | N/A | ❌ | Not exposed in execute model |

### Reactions

| Operation | Execute Action | Status | Notes |
|-----------|---------------|--------|-------|
| Add reaction | `add-reaction` | ✅ | Fully implemented |
| Remove reaction | `remove-reaction` | ✅ | Fully implemented |

## Target State (Desired-State Model)

### Issues

| Operation | Provider Method | Priority | Implementation Status |
|-----------|----------------|----------|----------------------|
| Create | `reconcile` | P0 | ⏳ Planned |
| Update | `reconcile` | P0 | ⏳ Planned |
| Delete | `delete` | P0 | ⏳ Planned |
| Import | `read` | P0 | ⏳ Planned |

**Supported Fields**:
- title (string)
- state (open/closed)
- body (string, optional)
- labels (string[], optional)
- assignees (string[], optional)
- milestone (string/null, optional)

**Not Supported** (GitHub API limitations):
- Actual deletion (closes instead with state_reason: "not_planned")

### Pull Requests

| Operation | Provider Method | Priority | Implementation Status |
|-----------|----------------|----------|----------------------|
| Create | `reconcile` | P1 | ❌ Not planned (requires head branch) |
| Update | `reconcile` | P0 | ⏳ Planned |
| Delete | `delete` | P0 | ⏳ Planned |
| Import | `read` | P0 | ⏳ Planned |

**Supported Fields**:
- title (string)
- state (open/closed)
- body (string, optional)
- base (string)
- head (string)
- draft (boolean, optional)
- labels (string[], optional)
- assignees (string[], optional)
- reviewers (string[], optional)
- milestone (string/null, optional)

**Limitations**:
- Cannot create PRs without existing head branch
- Cannot change base/head after creation (requires replacement)

### Labels

| Operation | Provider Method | Priority | Implementation Status |
|-----------|----------------|----------|----------------------|
| Create | `reconcile` | P0 | ⏳ Planned |
| Update | `reconcile` | P0 | ⏳ Planned |
| Delete | `delete` | P0 | ⏳ Planned |
| Import | `read` | P0 | ⏳ Planned |

**Supported Fields**:
- name (string)
- color (string, 6-digit hex)
- description (string, optional)

### Milestones

| Operation | Provider Method | Priority | Implementation Status |
|-----------|----------------|----------|----------------------|
| Create | `reconcile` | P0 | ⏳ Planned |
| Update | `reconcile` | P0 | ⏳ Planned |
| Delete | `delete` | P0 | ⏳ Planned |
| Import | `read` | P0 | ⏳ Planned |

**Supported Fields**:
- title (string)
- state (open/closed)
- description (string, optional)
- due_on (ISO 8601 datetime, optional)

### Projects (GitHub Projects v2)

| Operation | Provider Method | Priority | Implementation Status |
|-----------|----------------|----------|----------------------|
| Create | `reconcile` | P2 | ❌ Future |
| Update | `reconcile` | P2 | ❌ Future |
| Delete | `delete` | P2 | ❌ Future |
| Import | `read` | P2 | ❌ Future |

**Notes**: Requires GraphQL API

### Wiki Pages

| Operation | Provider Method | Priority | Implementation Status |
|-----------|----------------|----------|----------------------|
| Create | `reconcile` | P2 | ❌ Future |
| Update | `reconcile` | P2 | ❌ Future |
| Delete | `delete` | P2 | ❌ Future |
| Import | `read` | P2 | ❌ Future |

**Notes**: Wiki pages stored in separate git repository

### Repository Settings

| Operation | Provider Method | Priority | Implementation Status |
|-----------|----------------|----------|----------------------|
| Update | `reconcile` | P2 | ❌ Future |
| Import | `read` | P2 | ❌ Future |

**Potential Fields**:
- description
- homepage
- private
- has_issues
- has_wiki
- has_projects
- default_branch
- allow_squash_merge
- allow_merge_commit
- allow_rebase_merge

### Branch Protection Rules

| Operation | Provider Method | Priority | Implementation Status |
|-----------|----------------|----------|----------------------|
| Create | `reconcile` | P2 | ❌ Future |
| Update | `reconcile` | P2 | ❌ Future |
| Delete | `delete` | P2 | ❌ Future |
| Import | `read` | P2 | ❌ Future |

**Potential Fields**:
- pattern (string)
- required_status_checks
- enforce_admins
- required_pull_request_reviews
- restrictions

### Webhooks

| Operation | Provider Method | Priority | Implementation Status |
|-----------|----------------|----------|----------------------|
| Create | `reconcile` | P2 | ❌ Future |
| Update | `reconcile` | P2 | ❌ Future |
| Delete | `delete` | P2 | ❌ Future |
| Import | `read` | P2 | ❌ Future |

**Potential Fields**:
- url (string)
- events (string[])
- active (boolean)
- content_type (json/form)
- secret (string, optional)

## Implementation Priority

### P0 (Must Have - First Release)
- Issue resource (create, update, delete, import)
- Label resource (create, update, delete, import)
- Milestone resource (create, update, delete, import)
- Pull resource (update, delete, import only)

### P1 (Should Have - Near Term)
- Project resource (basic CRUD)
- Wiki resource (basic CRUD)

### P2 (Nice to Have - Future)
- Repository settings
- Branch protection rules
- Webhooks
- Advanced project features

## Testing Strategy

For each resource type, test:

1. **Create**: New resource from scratch
2. **Update**: Modify existing resource
3. **Replace**: Changes requiring replacement
4. **Delete**: Remove resource
5. **Import**: Adopt existing resource
6. **Idempotence**: Multiple reconcile calls with same desired state
7. **Drift detection**: Detect changes made outside ghfs
8. **Conflict handling**: Manual changes vs desired state

## GitHub API Coverage

| GitHub API Endpoint | Coverage | Notes |
|---------------------|----------|-------|
| `POST /repos/{owner}/{repo}/issues` | ✅ Execute + Desired | Create issues |
| `PATCH /repos/{owner}/{repo}/issues/{number}` | ✅ Execute + Desired | Update issues |
| `POST /repos/{owner}/{repo}/issues/{number}/comments` | ✅ Execute | Add comments |
| `POST /repos/{owner}/{repo}/issues/{number}/labels` | ✅ Execute + Desired | Add labels |
| `POST /repos/{owner}/{repo}/labels` | ⏳ Desired only | Create labels |
| `PATCH /repos/{owner}/{repo}/labels/{name}` | ⏳ Desired only | Update labels |
| `DELETE /repos/{owner}/{repo}/labels/{name}` | ⏳ Desired only | Delete labels |
| `POST /repos/{owner}/{repo}/milestones` | ⏳ Desired only | Create milestones |
| `PATCH /repos/{owner}/{repo}/milestones/{number}` | ⏳ Desired only | Update milestones |
| `DELETE /repos/{owner}/{repo}/milestones/{number}` | ⏳ Desired only | Delete milestones |
| `POST /repos/{owner}/{repo}/pulls/{number}/reviews` | ✅ Execute | Submit review |
| `PUT /repos/{owner}/{repo}/pulls/{number}/merge` | ✅ Execute | Merge PR |
| `POST /repos/{owner}/{repo}/issues/{number}/reactions` | ✅ Execute | Add reaction |

## Next Steps

1. Implement P0 resources (Issue, Label, Milestone, Pull)
2. Write comprehensive tests for each resource type
3. Validate idempotence and drift detection
4. Document limitations and workarounds
5. Plan P1/P2 resource implementation
