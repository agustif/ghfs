# .ghfs/INDEX.md Structure

Complete file structure documentation for `.ghfs/` directory showing all synced surfaces.

This document serves as the reference for what `.ghfs/INDEX.md` should contain when generated.

---

## Core Structure

```
.ghfs/
├── INDEX.md                        # This index (generated)
├── repo.json                       # Repository metadata
├── issues.md                       # Issue index (generated)
├── pulls.md                        # Pull request index (generated)
├── execute.yml                     # Queued operations (YAML)
├── execute.md                      # Queued operations (human-friendly)
├── schema/
│   └── execute.schema.json         # JSON schema for execute.yml
├── issues/
│   ├── {number}-{slug}.md          # Open issues
│   └── closed/
│       └── {number}-{slug}.md      # Closed issues (optional)
└── pulls/
    ├── {number}-{slug}.md          # Open pull requests
    ├── {number}-{slug}.patch       # Pull request diff (optional)
    └── closed/
        ├── {number}-{slug}.md      # Closed pull requests (optional)
        └── {number}-{slug}.patch   # Closed PR diff (optional)
```

---

## Extended Structure (Implemented in PRs)

### Security & Dependencies (PR #51, #19)

```
.ghfs/security/
├── README.md                           # Security summary (generated)
├── sbom.json                           # SPDX Software Bill of Materials
├── dependabot-alerts.json              # Dependabot alert details
├── dependabot-summary.json             # Alert counts by severity
├── dependency-graph-summary.json       # Dependency submission metadata
├── attestations-summary.json           # Artifact attestation list
├── advisories.json                     # Security advisory list
└── dependency-review/
    ├── pr-{number}.json                # Per-PR dependency changes
    └── ...
```

**Config:**
- `extended.sbom` - SBOM export
- `extended.dependencyReview` - Per-PR dependency review
- `extended.dependabotAlerts` - Dependabot alerts
- `extended.dependencyGraph` - Dependency graph summary
- `extended.attestations` - Attestations list
- `extended.securityAdvisories` - Security advisories
- `extended.securitySummary` - Generated security README

**Permissions:** Most require GitHub Advanced Security or specific features enabled.

---

### Projects v2 (PR #47)

```
.ghfs/projects/
├── projects.json                   # All projects overview
├── {number}-{slug}.json            # Individual project board data
└── ...
```

**Config:**
- `sync.projects` (default: `false`)

**Data:**
- Project metadata
- Field definitions (single select, text, number, date, iteration)
- Items with field values

**Note:** `project_status` field prepared in issue/PR frontmatter but not yet populated.

---

### Merge Queue (PR #44)

```
.ghfs/merge-queue/
├── status.json                     # Queue metadata
├── entries.json                    # All queue entries
└── pr-{number}.json                # Per-PR queue entry
```

**Config:**
- `sync.mergeQueue` (default: `false`)

**Data:**
- Queue entry position
- Base/head commit SHAs
- Jump status
- Estimated merge time

---

### Wiki & Discussions (PR #3)

```
.ghfs/wiki/
├── index.md                        # Wiki index
├── {slug}.md                       # Wiki pages
└── ...

.ghfs/discussions/
├── index.md                        # Discussion index
├── {number}-{slug}.md              # Discussion threads
└── ...
```

**Config:**
- `sync.wiki` (default: `false`)
- `sync.discussions` (default: `false`)

---

### Repository Metadata (PR #48)

```
.ghfs/
├── activity.md                     # Repository activity timeline
├── languages.json                  # Language breakdown (bytes)
├── contributors.json               # Contributor list with stats
└── constitution/
    └── CODEOWNERS.errors.json      # CODEOWNERS validation errors
```

**Config:**
- `sync.activity` (default: `true`)
- `sync.languages` (default: `true`)
- `sync.contributors` (default: `true`)
- `sync.codeownersErrors` (default: `true`)

**Data:**
- Recent activity events (push, force_push, branch_creation, pr_merge, merge_queue_merge)
- Language statistics
- Contributor contributions count
- CODEOWNERS syntax errors (line, column, message)

---

### Agent Intelligence (PR #19, #38, #43)

```
.ghfs/
├── me.md                           # Personal summary (user's items)
├── sync-state.json                 # Incremental sync metadata
├── search.jsonl                    # Fast local search index
├── refs.json                       # Cross-reference graph
├── agent-hints.md                  # Detected test/lint/build commands
└── context-packs/
    ├── issue-{number}.md           # Context pack for issue
    ├── pr-{number}.md              # Context pack for PR
    └── ...
```

**Config:**
- `extended.meSummary` - Personal summary
- `extended.searchIndex` - Search index
- `extended.refsGraph` - Cross-reference graph
- `extended.contextPacks` - Context packs
- `extended.agentHints` - Agent hints

**Data:**
- `me.md` - Issues/PRs where user is author/assignee/reviewer
- `sync-state.json` - Last sync time, item counts, cursors
- `search.jsonl` - JSONL format: one item per line with text + metadata
- `refs.json` - Graph edges: mentions, closes, references, reviews
- `context-packs/*.md` - Prompt-sized bundles per item

---

## Missing Structure (Not Yet Implemented)

### Releases & Tags

```
.ghfs/releases/
├── releases.json                   # All releases
├── {tag}.json                      # Individual release
└── ...

.ghfs/tags/
├── tags.json                       # All tags
└── ...
```

**Config:** TBD (`sync.releases`, `sync.tags`)

**Issues:** #5, #15

---

### Actions & Workflows

```
.ghfs/actions/
├── workflows.json                  # All workflows
├── runs.json                       # Recent workflow runs
├── {workflow-id}/
│   ├── {run-id}.json               # Run metadata
│   └── ...
└── ...
```

**Config:** TBD (`sync.workflows`, `sync.workflowRuns`)

**Issue:** #17

---

### Governance & Constitution

```
.ghfs/constitution/
├── CONTRIBUTING.md                 # Contributing guide
├── CODE_OF_CONDUCT.md              # Code of conduct
├── SECURITY.md                     # Security policy
├── SUPPORT.md                      # Support guide
├── FUNDING.yml                     # Funding links
├── CODEOWNERS                      # Code owners
├── PULL_REQUEST_TEMPLATE.md        # PR template
└── ISSUE_TEMPLATE/
    ├── bug_report.md
    ├── feature_request.md
    └── ...
```

**Config:** TBD (`sync.constitution`)

**Issue:** #13

---

### Branches & Protection

```
.ghfs/branches/
├── branches.json                   # All branches
├── {branch}/
│   ├── protection.json             # Branch protection rules
│   └── ...
└── rulesets.json                   # Repository rulesets
```

**Config:** TBD (`sync.branches`, `sync.branchProtection`, `sync.rulesets`)

**Issue:** #14

---

### Deployments

```
.ghfs/deployments/
├── environments.json               # All environments
├── {environment}/
│   ├── deployments.json            # Deployment history
│   └── {deployment-id}.json        # Deployment details
└── ...
```

**Config:** TBD (`extended.deployments`)

**Issue:** #40

---

### Enhanced Metadata

```
.ghfs/
├── labels.json                     # Separate labels file
├── milestones.json                 # Separate milestones file
└── README-excerpt.md               # Repository README excerpt
```

**Config:** TBD (`extended.labelsJson`, `extended.milestonesJson`, `sync.readme`)

**Issues:** #7, #12, #26

---

### PR Intelligence

```
.ghfs/pulls/
├── {number}-{slug}.files.json      # PR file list
├── {number}-{slug}.checks.json     # PR check runs
└── {number}-{slug}.gate.json       # PR merge gate status
```

**Config:** TBD (`extended.prFiles`, `extended.prChecks`, `extended.prGate`)

**Issues:** #11, #9, #10

---

### Pinned Issues

```
.ghfs/pinned-issues.json            # Pinned issues list
```

**Config:** TBD (`sync.pinnedIssues`)

**Issue:** #28

---

### Advanced Security

```
.ghfs/security/
├── secret-scanning.json            # Secret scanning alerts
└── code-scanning.json              # Code scanning alerts
```

**Config:** TBD (`extended.secretScanning`, `extended.codeScanning`)

**Permissions:** Requires GitHub Advanced Security.

---

## File Formats

### Markdown Documents

All issue/PR markdown files follow this format:

```markdown
---
number: 123
title: "Issue title"
state: open
stateReason: null
labels: [bug, triage]
assignees: [username]
milestone: "v1.0"
author: username
authorAvatarUrl: https://...
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-02T00:00:00Z"
closedAt: null
url: https://github.com/...
reactions:
  totalCount: 5
  plusOne: 3
  minusOne: 0
  laugh: 1
  heart: 1
  ...
---

# Issue title

Issue body content...

## Comments

### @username • 2024-01-01T12:00:00Z

Comment body...

**Reactions:** 👍 2

## Timeline

- **closed** by @username on 2024-01-02T00:00:00Z
- **labeled** `bug` by @username on 2024-01-01T00:00:00Z
- ...
```

### Pull Request Additional Fields

PR markdown files include additional frontmatter:

```yaml
---
# ... same as issue ...
pull:
  isDraft: false
  merged: false
  mergedAt: null
  baseRef: main
  headRef: feature-branch
  requestedReviewers: [reviewer1]
  mergeable: true
  mergeableState: clean
  reviewDecision: approved
---
```

### JSON Documents

All JSON files use pretty-printed format with 2-space indentation:

```json
{
  "field": "value",
  "nested": {
    "key": "value"
  }
}
```

### JSONL Documents (Search Index)

Search index uses newline-delimited JSON (one object per line):

```jsonl
{"type":"issue","number":123,"title":"...","body":"...","labels":["bug"]}
{"type":"pull","number":124,"title":"...","body":"...","labels":["feature"]}
```

---

## Index Generation

The `.ghfs/INDEX.md` file should be automatically generated during sync and include:

1. **Repository Overview**
   - Repository name, owner, description
   - Open/closed issue counts
   - Open/closed PR counts
   - Last sync timestamp

2. **File Structure**
   - Tree view of `.ghfs/` directory
   - File counts per category
   - Config toggles and their current values

3. **Quick Links**
   - Issues index → `.ghfs/issues.md`
   - Pull requests index → `.ghfs/pulls.md`
   - Execute operations → `.ghfs/execute.md`
   - Security summary → `.ghfs/security/README.md`
   - Projects → `.ghfs/projects/projects.json`
   - Activity → `.ghfs/activity.md`

4. **Sync Metadata**
   - Last sync time
   - Items synced
   - Sync duration
   - API requests made
   - Features enabled

---

## Configuration Reference

See [Configuration Schema](./config-schema.md) for complete configuration documentation.

---

## Implementation Status

- ✅ Core structure (issues, pulls, execute)
- 🚧 Extended structure (security, projects, merge queue, wiki, discussions, activity)
- ❌ Missing structure (releases, actions, governance, branches, deployments, pinned, advanced intelligence)

See [GitHub API Surface](./github-api-surface.md) for complete implementation status.
