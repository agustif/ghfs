# GitHub API Surface Coverage

Complete checklist of GitHub REST and GraphQL endpoints mapped to GHFS implementation status.

**Legend:**
- ✅ **Done** - Implemented and merged to main
- 🚧 **PR** - Implementation in open PR (link provided)
- ❌ **Missing** - Not yet implemented
- 🔒 **Restricted** - Requires specific GitHub plan/permissions
- ⚠️ **Partial** - Partially implemented or limited scope

**Last Updated:** 2026-09-10

---

## Core Repository Metadata

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Repository info | `GET /repos/{owner}/{repo}` | ✅ Done | - | `.ghfs/repo.json` | Basic repo metadata |
| Repository languages | `GET /repos/{owner}/{repo}/languages` | 🚧 [PR #48](https://github.com/agustif/ghfs/pull/48) | `sync.languages` | `.ghfs/languages.json` | Language breakdown |
| Repository contributors | `GET /repos/{owner}/{repo}/contributors` | 🚧 [PR #48](https://github.com/agustif/ghfs/pull/48) | `sync.contributors` | `.ghfs/contributors.json` | Contributor stats |
| Repository activity | `GET /repos/{owner}/{repo}/activity` | 🚧 [PR #48](https://github.com/agustif/ghfs/pull/48) | `sync.activity` | `.ghfs/activity.md` | Recent activity events |
| Repository topics | GraphQL `repository.repositoryTopics` | ❌ Missing | - | - | Issue #16 |
| Repository features/flags | REST repo object fields | ❌ Missing | - | - | has_issues, has_projects, etc. |
| Repository README excerpt | GraphQL `repository.object(expression: "HEAD:README.md")` | ❌ Missing | - | - | Issue #26 |
| CODEOWNERS errors | `GET /repos/{owner}/{repo}/codeowners/errors` | 🚧 [PR #48](https://github.com/agustif/ghfs/pull/48) | `sync.codeownersErrors` | `.ghfs/constitution/CODEOWNERS.errors.json` | CODEOWNERS validation |
| Merge queue status | GraphQL `repository.mergeQueue` | ✅ Done | - | Embedded in repo.json | merge_queue_enabled flag |

---

## Issues & Pull Requests

### Core Issue/PR Data

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| List issues/PRs | `GET /repos/{owner}/{repo}/issues` | ✅ Done | `sync.issues`, `sync.pulls` | `.ghfs/issues/*.md`, `.ghfs/pulls/*.md` | Core sync |
| Get single issue/PR | `GET /repos/{owner}/{repo}/issues/{number}` | ✅ Done | - | - | Per-item fetch |
| Issue/PR body & metadata | REST issues object | ✅ Done | - | Markdown frontmatter | Title, body, labels, assignees, milestone |
| Issue/PR state reason | REST `state_reason` field | ✅ Done | - | Frontmatter | completed, not_planned, reopened |
| Issue/PR reactions | REST reactions object | ✅ Done | - | Frontmatter | +1, -1, laugh, heart, etc. |
| Closed issues/PRs | REST state filter | ✅ Done | `sync.closed` | `.ghfs/issues/closed/`, `.ghfs/pulls/closed/` | Optional sync |

### Comments & Timeline

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Issue/PR comments | `GET /repos/{owner}/{repo}/issues/{number}/comments` | ✅ Done | - | Embedded in issue/PR markdown | Standard comments |
| Comment reactions | REST comment reactions | ✅ Done | - | Embedded | +1, -1, laugh, heart, etc. |
| Issue/PR timeline | `GET /repos/{owner}/{repo}/issues/{number}/timeline` | ✅ Done | - | Embedded in issue/PR markdown | Full event history |
| Timeline events | REST timeline events | ✅ Done | - | Embedded | closed, labeled, assigned, reviewed, etc. |

### Pull Request Specific

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| PR metadata | `GET /repos/{owner}/{repo}/pulls/{number}` | ✅ Done | - | Embedded in PR markdown | draft, merged, baseRef, headRef |
| PR patch/diff | `GET /repos/{owner}/{repo}/pulls/{number}` (media type: patch) | ✅ Done | `sync.patches` | `.ghfs/pulls/*.patch` | Full diff |
| PR commits | `GET /repos/{owner}/{repo}/pulls/{number}/commits` | ✅ Done | - | Embedded in PR markdown | Commit list |
| PR review comments | `GET /repos/{owner}/{repo}/pulls/{number}/comments` | ✅ Done | - | Embedded in PR markdown | Inline code review comments |
| PR review decision | GraphQL `pullRequest.reviewDecision` | ✅ Done | - | Embedded | approved, changes_requested, review_required |
| PR mergeable state | REST `mergeable` / `mergeable_state` | ✅ Done | - | Embedded | clean, dirty, blocked, behind, unstable |
| PR requested reviewers | REST `requested_reviewers` | ✅ Done | - | Embedded | Reviewer list |
| PR files changed | `GET /repos/{owner}/{repo}/pulls/{number}/files` | ❌ Missing | - | - | Issue #11 |
| PR check runs | `GET /repos/{owner}/{repo}/commits/{ref}/check-runs` | ❌ Missing | - | - | Issue #9 |
| PR check suites | `GET /repos/{owner}/{repo}/commits/{ref}/check-suites` | ❌ Missing | - | - | Issue #9 |
| PR merge gate status | Combined check/review/protection status | ❌ Missing | - | - | Issue #10 |
| PR diff intelligence | File tree, changed lines, review coverage | ❌ Missing | - | - | Issue #11 |

### Projects v2

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Projects v2 list | GraphQL `repository.projectsV2` | 🚧 [PR #47](https://github.com/agustif/ghfs/pull/47) | `sync.projects` | `.ghfs/projects/projects.json` | Project list |
| Projects v2 fields | GraphQL project fields | 🚧 [PR #47](https://github.com/agustif/ghfs/pull/47) | `sync.projects` | Embedded in project JSON | Field definitions |
| Projects v2 items | GraphQL project items | 🚧 [PR #47](https://github.com/agustif/ghfs/pull/47) | `sync.projects` | `.ghfs/projects/{number}-{slug}.json` | Items with field values |
| Project status in frontmatter | Cross-reference project status | 🚧 [PR #47](https://github.com/agustif/ghfs/pull/47) | `sync.projects` | Issue/PR frontmatter `project_status` | Prepared, not yet populated |
| Pinned issues | GraphQL `repository.pinnedIssues` | ❌ Missing | - | - | Issue #28 |

---

## Labels & Milestones

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Repository labels | `GET /repos/{owner}/{repo}/labels` | ✅ Done | - | Embedded in repo.json | All labels |
| Repository milestones | `GET /repos/{owner}/{repo}/milestones` | ✅ Done | - | Embedded in repo.json | All milestones (open + closed) |
| Separate labels.json | - | ❌ Missing | - | - | Issue #7, #12 |
| Separate milestones.json | - | ❌ Missing | - | - | Issue #7, #12 |

---

## Security & Dependencies

### Dependency Intelligence

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| SBOM export | `GET /repos/{owner}/{repo}/dependency-graph/sbom` | 🚧 [PR #51](https://github.com/agustif/ghfs/pull/51) | `extended.sbom` | `.ghfs/security/sbom.json` | SPDX format 🔒 |
| Dependency review | `GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}` | 🚧 [PR #51](https://github.com/agustif/ghfs/pull/51) | `extended.dependencyReview` | `.ghfs/security/dependency-review/pr-{number}.json` | Per-PR changes 🔒 |
| Dependabot alerts | `GET /repos/{owner}/{repo}/dependabot/alerts` | 🚧 [PR #51](https://github.com/agustif/ghfs/pull/51) | `extended.dependabotAlerts` | `.ghfs/security/dependabot-alerts.json` | Alert list 🔒 |
| Dependabot summary | Derived from alerts | 🚧 [PR #51](https://github.com/agustif/ghfs/pull/51) | `extended.dependabotAlerts` | `.ghfs/security/dependabot-summary.json` | Counts by severity |
| Dependency graph summary | `GET /repos/{owner}/{repo}/dependency-graph/snapshots` | 🚧 [PR #51](https://github.com/agustif/ghfs/pull/51) | `extended.dependencyGraph` | `.ghfs/security/dependency-graph-summary.json` | Submission presence |
| Attestations summary | `GET /repos/{owner}/{repo}/attestations` | 🚧 [PR #51](https://github.com/agustif/ghfs/pull/51) | `extended.attestations` | `.ghfs/security/attestations-summary.json` | Artifact attestations 🔒 |

### Security Advisories

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Security advisories | `GET /repos/{owner}/{repo}/security-advisories` | 🚧 [PR #19](https://github.com/agustif/ghfs/pull/19) | `extended.securityAdvisories` | `.ghfs/security/advisories.json` | Repository advisories 🔒 |
| Security summaries | Derived from multiple sources | 🚧 [PR #19](https://github.com/agustif/ghfs/pull/19) | `extended.securitySummary` | `.ghfs/security/README.md` | Generated summary |
| Secret scanning alerts | `GET /repos/{owner}/{repo}/secret-scanning/alerts` | ❌ Missing | - | - | 🔒 Requires secret scanning |
| Code scanning alerts | `GET /repos/{owner}/{repo}/code-scanning/alerts` | ❌ Missing | - | - | 🔒 Requires code scanning |

---

## Releases & Tags

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Releases list | `GET /repos/{owner}/{repo}/releases` | ❌ Missing | - | - | Issue #5, #15 |
| Release assets | REST release assets | ❌ Missing | - | - | Asset metadata (no blobs) |
| Tags list | `GET /repos/{owner}/{repo}/tags` | ❌ Missing | - | - | Git tags |

---

## Branches & Protection

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Branches list | `GET /repos/{owner}/{repo}/branches` | ❌ Missing | - | - | All branches |
| Branch protection rules | `GET /repos/{owner}/{repo}/branches/{branch}/protection` | ❌ Missing | - | - | Issue #14 |
| Repository rulesets | `GET /repos/{owner}/{repo}/rulesets` | ❌ Missing | - | - | Issue #14 |

---

## Actions & Workflows

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Workflow runs | `GET /repos/{owner}/{repo}/actions/runs` | ❌ Missing | - | - | Issue #17 |
| Workflow run logs | - | ❌ Missing | - | - | Log metadata only, no blobs |
| Workflow files | REST repository contents | ❌ Missing | - | - | .github/workflows/*.yml |

---

## Merge Queue

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Merge queue entries | GraphQL `repository.mergeQueue.entries` | 🚧 [PR #44](https://github.com/agustif/ghfs/pull/44) | `sync.mergeQueue` | `.ghfs/merge-queue/` | Queue entries |
| Merge queue status | GraphQL merge queue metadata | 🚧 [PR #44](https://github.com/agustif/ghfs/pull/44) | `sync.mergeQueue` | `.ghfs/merge-queue/status.json` | Queue state |

---

## Wiki & Discussions

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Wiki pages | GraphQL `repository.wikis` | 🚧 [PR #3](https://github.com/agustif/ghfs/pull/3) | `sync.wiki` | `.ghfs/wiki/` | Wiki content |
| Discussions | GraphQL `repository.discussions` | 🚧 [PR #3](https://github.com/agustif/ghfs/pull/3) | `sync.discussions` | `.ghfs/discussions/` | Discussion threads |
| Discussion comments | GraphQL discussion comments | 🚧 [PR #3](https://github.com/agustif/ghfs/pull/3) | `sync.discussions` | Embedded | Comment threads |

---

## Governance & Constitution

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Governance files | REST repository contents | ❌ Missing | - | - | Issue #13 |
| CONTRIBUTING | `GET /repos/{owner}/{repo}/contents/CONTRIBUTING.md` | ❌ Missing | - | `.ghfs/constitution/CONTRIBUTING.md` | Contributing guide |
| CODE_OF_CONDUCT | `GET /repos/{owner}/{repo}/community/code_of_conduct` | ❌ Missing | - | `.ghfs/constitution/CODE_OF_CONDUCT.md` | Code of conduct |
| SECURITY | `GET /repos/{owner}/{repo}/contents/SECURITY.md` | ❌ Missing | - | `.ghfs/constitution/SECURITY.md` | Security policy |
| SUPPORT | `GET /repos/{owner}/{repo}/contents/SUPPORT.md` | ❌ Missing | - | `.ghfs/constitution/SUPPORT.md` | Support guide |
| FUNDING | `GET /repos/{owner}/{repo}/contents/.github/FUNDING.yml` | ❌ Missing | - | `.ghfs/constitution/FUNDING.yml` | Funding links |
| CODEOWNERS | `GET /repos/{owner}/{repo}/contents/.github/CODEOWNERS` | ❌ Missing | - | `.ghfs/constitution/CODEOWNERS` | Code owners |
| Pull request template | `GET /repos/{owner}/{repo}/contents/.github/PULL_REQUEST_TEMPLATE.md` | ❌ Missing | - | `.ghfs/constitution/PULL_REQUEST_TEMPLATE.md` | PR template |
| Issue templates | `GET /repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE/` | ❌ Missing | - | `.ghfs/constitution/ISSUE_TEMPLATE/` | Issue templates |

---

## Authenticated User

| API Surface | Endpoint | Status | Config | Files | Notes |
|------------|----------|--------|--------|-------|-------|
| Authenticated user | `GET /user` | ✅ Done | - | Cached in provider | login, name, avatarUrl |

---

## Actions (Execute Operations)

### Issue/PR State

| Action | API Endpoint | Status | Execute | Notes |
|--------|-------------|--------|---------|-------|
| Close issue/PR | `PATCH /repos/{owner}/{repo}/issues/{number}` | ✅ Done | `close` | Set state=closed |
| Reopen issue/PR | `PATCH /repos/{owner}/{repo}/issues/{number}` | ✅ Done | `reopen` | Set state=open |
| Set title | `PATCH /repos/{owner}/{repo}/issues/{number}` | ✅ Done | `set-title` | Update title |
| Set body | `PATCH /repos/{owner}/{repo}/issues/{number}` | ✅ Done | `set-body` | Update body |
| Add comment | `POST /repos/{owner}/{repo}/issues/{number}/comments` | ✅ Done | `comment`, `add-comment` | Create comment |
| Close with comment | Combined close + comment | ✅ Done | `close-comment`, `close-with-comment` | Composite action |

### Labels

| Action | API Endpoint | Status | Execute | Notes |
|--------|-------------|--------|---------|-------|
| Add labels | `POST /repos/{owner}/{repo}/issues/{number}/labels` | ✅ Done | `add-labels`, `label` | Add labels (create if missing) |
| Remove labels | `DELETE /repos/{owner}/{repo}/issues/{number}/labels/{name}` | ✅ Done | `remove-labels`, `unlabel` | Remove labels |
| Set labels | `PUT /repos/{owner}/{repo}/issues/{number}/labels` | ✅ Done | `set-labels` | Replace all labels |
| Create label | `POST /repos/{owner}/{repo}/labels` | ✅ Done | - | Auto-create missing labels |

### Assignees

| Action | API Endpoint | Status | Execute | Notes |
|--------|-------------|--------|---------|-------|
| Add assignees | `POST /repos/{owner}/{repo}/issues/{number}/assignees` | ✅ Done | `add-assignees`, `assign` | Add assignees |
| Remove assignees | `DELETE /repos/{owner}/{repo}/issues/{number}/assignees` | ✅ Done | `remove-assignees`, `unassign` | Remove assignees |
| Set assignees | `PATCH /repos/{owner}/{repo}/issues/{number}` | ✅ Done | `set-assignees` | Replace all assignees |

### Milestones

| Action | API Endpoint | Status | Execute | Notes |
|--------|-------------|--------|---------|-------|
| Set milestone | `PATCH /repos/{owner}/{repo}/issues/{number}` | ✅ Done | `set-milestone`, `milestone` | Set milestone (by title or number) |
| Clear milestone | `PATCH /repos/{owner}/{repo}/issues/{number}` | ✅ Done | `clear-milestone` | Remove milestone |

### Locking

| Action | API Endpoint | Status | Execute | Notes |
|--------|-------------|--------|---------|-------|
| Lock issue/PR | `PUT /repos/{owner}/{repo}/issues/{number}/lock` | ✅ Done | `lock` | Lock with optional reason |
| Unlock issue/PR | `DELETE /repos/{owner}/{repo}/issues/{number}/lock` | ✅ Done | `unlock` | Unlock conversation |

### Pull Request Reviews

| Action | API Endpoint | Status | Execute | Notes |
|--------|-------------|--------|---------|-------|
| Request reviewers | `POST /repos/{owner}/{repo}/pulls/{number}/requested_reviewers` | ✅ Done | `request-reviewers` | Request review |
| Remove reviewers | `DELETE /repos/{owner}/{repo}/pulls/{number}/requested_reviewers` | ✅ Done | `remove-reviewers` | Cancel review request |
| Mark ready for review | `POST /repos/{owner}/{repo}/pulls/{number}/ready_for_review` | ✅ Done | `ready-for-review` | Convert draft → ready |
| Convert to draft | `POST /repos/{owner}/{repo}/pulls/{number}/convert-to-draft` | ✅ Done | `convert-to-draft` | Convert ready → draft |
| Approve | `POST /repos/{owner}/{repo}/pulls/{number}/reviews` | ✅ Done | `approve` | Submit approval review |
| Request changes | `POST /repos/{owner}/{repo}/pulls/{number}/reviews` | ✅ Done | `request-changes` | Submit changes requested |
| Review comment | `POST /repos/{owner}/{repo}/pulls/{number}/reviews` | ✅ Done | `review-comment` | Submit comment review |

### Pull Request Merging

| Action | API Endpoint | Status | Execute | Notes |
|--------|-------------|--------|---------|-------|
| Merge PR | `PUT /repos/{owner}/{repo}/pulls/{number}/merge` | ✅ Done | `merge` | Merge with method (squash/merge/rebase) |
| Enqueue merge | GraphQL `enqueuePullRequest` | ✅ Done | `enqueue-merge` | Add to merge queue |

### Reactions

| Action | API Endpoint | Status | Execute | Notes |
|--------|-------------|--------|---------|-------|
| Add reaction | `POST /repos/{owner}/{repo}/issues/{number}/reactions` | ✅ Done | `add-reaction` | React to issue/PR/comment/review |
| Remove reaction | `DELETE /repos/{owner}/{repo}/issues/{number}/reactions/{id}` | ✅ Done | `remove-reaction` | Remove reaction |
| Fetch viewer reactions | `GET /repos/{owner}/{repo}/issues/{number}/reactions` | ✅ Done | - | Get user's reactions (for UI state) |

---

## Agent Intelligence Context Layer

### Core Agent Context

| Feature | Status | Config | Files | Notes |
|---------|--------|--------|-------|-------|
| me.md - Personal summary | 🚧 [PR #19](https://github.com/agustif/ghfs/pull/19) | `extended.meSummary` | `.ghfs/me.md` | Issue #29 |
| sync-state.json - Incremental sync metadata | 🚧 [PR #19](https://github.com/agustif/ghfs/pull/19) | - | `.ghfs/sync-state.json` | Issue #30 |
| search.jsonl - Fast local search index | 🚧 [PR #19](https://github.com/agustif/ghfs/pull/19) | `extended.searchIndex` | `.ghfs/search.jsonl` | Issue #32 |
| refs.json - Cross-reference graph | 🚧 [PR #19](https://github.com/agustif/ghfs/pull/19) | `extended.refsGraph` | `.ghfs/refs.json` | Issue #31, #36 |
| agent-hints.md - Detected commands | ❌ Missing | - | `.ghfs/agent-hints.md` | Issue #41 |
| deployments/ - Environment & deployment status | ❌ Missing | - | `.ghfs/deployments/` | Issue #40 |
| activity.md - Last N repository events | 🚧 [PR #48](https://github.com/agustif/ghfs/pull/48) | `sync.activity` | `.ghfs/activity.md` | Issue #39 |

### Context Packs

| Feature | Status | Config | Files | Notes |
|---------|--------|--------|-------|-------|
| Context pack generator | 🚧 [PR #43](https://github.com/agustif/ghfs/pull/43) | `extended.contextPacks` | `.ghfs/context-packs/{number}.md` | Issue #21, #34 |
| Graph nodes + edges | ❌ Missing | - | - | Issue #25 |
| Tiered freshness (hot/warm/cold) | ❌ Missing | - | - | Issue #24, #33 |
| Provenance tracking | ❌ Missing | - | - | Issue #23 |
| Local coordination (locks + notes) | ❌ Missing | - | - | Issue #22 |
| Policy + gate DSL | ❌ Missing | - | - | Issue #20, #35 |

---

## Configuration Schema

### Current Config (`GhfsUserConfig`)

```typescript
interface GhfsUserConfig {
  // Repository
  repo?: string
  directory?: string
  
  // Authentication
  auth?: {
    token?: string
  }
  
  // Bot detection
  bots?: string[]
  
  // Sync options
  sync?: {
    // Core
    issues?: boolean           // default: true
    pulls?: boolean            // default: true
    closed?: boolean           // default: false
    patches?: 'open' | 'all' | false  // default: 'open'
    
    // Extended (PR #48)
    activity?: boolean         // default: true
    codeownersErrors?: boolean // default: true
    languages?: boolean        // default: true
    contributors?: boolean     // default: true
    
    // Projects (PR #47)
    projects?: boolean         // default: false
    
    // Merge Queue (PR #44)
    mergeQueue?: boolean       // default: false
    
    // Wiki & Discussions (PR #3)
    wiki?: boolean             // default: false
    discussions?: boolean      // default: false
  }
  
  // Extended features (proposed)
  extended?: {
    // Security & Dependencies (PR #51)
    sbom?: boolean
    dependencyReview?: boolean
    dependabotAlerts?: boolean
    dependencyGraph?: boolean
    attestations?: boolean
    securityAdvisories?: boolean
    
    // Agent Intelligence (PR #19, #38, #43)
    meSummary?: boolean
    searchIndex?: boolean
    refsGraph?: boolean
    contextPacks?: boolean
    securitySummary?: boolean
  }
}
```

### Missing Config Toggles

These should be added to complete the schema:

```typescript
sync?: {
  // Repository metadata
  readme?: boolean              // Issue #26
  topics?: boolean              // Issue #16
  
  // Releases & Tags
  releases?: boolean            // Issue #5, #15
  tags?: boolean
  
  // Governance
  constitution?: boolean        // Issue #13
  
  // Actions
  workflows?: boolean           // Issue #17
  workflowRuns?: boolean
  
  // Branches & Protection
  branches?: boolean
  branchProtection?: boolean    // Issue #14
  rulesets?: boolean            // Issue #14
  
  // Issues & PRs
  pinnedIssues?: boolean        // Issue #28
}

extended?: {
  // Security
  secretScanning?: boolean
  codeScanning?: boolean
  
  // Enhanced metadata
  labelsJson?: boolean          // Issue #7, #12
  milestonesJson?: boolean      // Issue #7, #12
  
  // Agent hints
  agentHints?: boolean          // Issue #41
  deployments?: boolean         // Issue #40
  
  // PR Intelligence
  prFiles?: boolean             // Issue #11
  prChecks?: boolean            // Issue #9
  prGate?: boolean              // Issue #10
  
  // Graph & Coordination
  graphSystem?: boolean         // Issue #25
  tieredFreshness?: boolean     // Issue #24
  provenance?: boolean          // Issue #23
  localCoordination?: boolean   // Issue #22
  policyGate?: boolean          // Issue #20
}
```

---

## Summary Statistics

### Implementation Status

- **Done**: 50+ endpoints (core issues/PRs, comments, timeline, reviews, actions)
- **In PR**: 15+ endpoints across 8 open PRs
- **Missing**: 35+ endpoints (releases, actions, governance, advanced intelligence)

### Config Coverage

- **Current**: `sync.*` (14 toggles), `extended.*` (5 toggles in PRs)
- **Missing**: 25+ config toggles for complete coverage

### File Structure Coverage

- **Implemented**: `.ghfs/issues/`, `.ghfs/pulls/`, `.ghfs/repo.json`, `.ghfs/execute.yml`
- **In PR**: `.ghfs/security/`, `.ghfs/projects/`, `.ghfs/merge-queue/`, `.ghfs/wiki/`, `.ghfs/discussions/`, `.ghfs/activity.md`, `.ghfs/constitution/CODEOWNERS.errors.json`
- **Missing**: `.ghfs/releases/`, `.ghfs/actions/`, `.ghfs/branches/`, `.ghfs/constitution/`, `.ghfs/deployments/`, `.ghfs/context-packs/`, `.ghfs/search.jsonl`, `.ghfs/refs.json`, `.ghfs/me.md`, `.ghfs/agent-hints.md`

---

## Related Issues

**Epics:**
- [#4 - Agent Intelligence Context Layer](https://github.com/agustif/ghfs/issues/4)
- [#45 - API surface map — REST 2026-03-10 + GraphQL](https://github.com/agustif/ghfs/issues/45)

**Open Issues (Missing Features):**
See [GitHub Issues with no PR](https://github.com/agustif/ghfs/issues?q=is%3Aissue+is%3Aopen+no%3Apr)

**Implementation PRs:**
- [#51 - Dependency intelligence](https://github.com/agustif/ghfs/pull/51)
- [#48 - GitHub API endpoints (activity, codeowners, languages, contributors)](https://github.com/agustif/ghfs/pull/48)
- [#47 - Projects v2 sync](https://github.com/agustif/ghfs/pull/47)
- [#44 - Merge Queue sync](https://github.com/agustif/ghfs/pull/44)
- [#43 - Context pack generator](https://github.com/agustif/ghfs/pull/43)
- [#42 - Document new sync surfaces](https://github.com/agustif/ghfs/pull/42)
- [#38 - Agent Intelligence Context Layer (foundation)](https://github.com/agustif/ghfs/pull/38)
- [#19 - Agent ergonomics (security, refs, me.md, sync-state, search)](https://github.com/agustif/ghfs/pull/19)
- [#3 - Wiki and Discussions sync](https://github.com/agustif/ghfs/pull/3)
- [#2 - PR intelligence (reviews, checks, files, gate)](https://github.com/agustif/ghfs/pull/2)
- [#1 - Enhanced Repository Metadata Sync](https://github.com/agustif/ghfs/pull/1)

---

## Next Steps

1. ✅ Create this comprehensive API surface documentation
2. ⏭️ Generate `.ghfs/INDEX.md` with all synced surfaces
3. ⏭️ Document complete config schema reference
4. ⏭️ File new issues for remaining gaps with `gap` label
5. ⏭️ Close issues that are already implemented in PRs
