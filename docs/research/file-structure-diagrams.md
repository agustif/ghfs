# File Structure Diagrams

Visual representations of the `.ghfs/` directory structure for different configuration scenarios.

---

## Core Structure (Minimal Config)

Default configuration with just issues and pulls:

```
.ghfs/
├── INDEX.md                        # Generated index (this is the goal)
├── repo.json                       # Repository metadata
│   ├─ name, owner, description
│   ├─ labels[], milestones[]
│   ├─ open_issues_count, etc.
│   └─ merge_queue_enabled
├── issues.md                       # Issue index (generated)
├── pulls.md                        # Pull request index (generated)
├── execute.yml                     # Queued operations (YAML)
├── execute.md                      # Queued operations (human-friendly)
├── schema/
│   └── execute.schema.json         # JSON schema for execute.yml
├── issues/
│   ├── 00001-first-issue.md        # Open issue
│   ├── 00042-bug-report.md
│   └── 00123-feature-request.md
└── pulls/
    ├── 00024-fix-typo.md          # Open PR
    ├── 00024-fix-typo.patch        # PR diff (if sync.patches != false)
    └── 00087-add-feature.md
```

**Config:**
```yaml
sync:
  issues: true
  pulls: true
  closed: false
  patches: 'open'
```

---

## Extended Structure (With Closed Items)

When `sync.closed: true`:

```
.ghfs/
├── ... (core files)
├── issues/
│   ├── 00001-first-issue.md        # Open issues
│   ├── 00042-bug-report.md
│   └── closed/
│       ├── 00010-fixed-bug.md      # Closed issues
│       └── 00020-wontfix.md
└── pulls/
    ├── 00024-fix-typo.md           # Open PRs
    └── closed/
        ├── 00015-merged-pr.md      # Closed PRs
        ├── 00015-merged-pr.patch
        └── 00023-closed-pr.md
```

**Config:**
```yaml
sync:
  closed: true
  patches: 'all'  # Include patches for closed PRs
```

---

## Repository Metadata (PR #48)

When repository metadata features are enabled:

```
.ghfs/
├── ... (core files)
├── activity.md                     # Repository activity timeline
│   ├─ Recent push/force_push events
│   ├─ Branch creation/deletion
│   ├─ PR merges
│   └─ Merge queue merges
├── languages.json                  # Language breakdown
│   └─ { "TypeScript": 123456, "JavaScript": 78910, ... }
├── contributors.json               # Contributor stats
│   └─ [{ login, contributions, avatar_url }, ...]
└── constitution/
    └── CODEOWNERS.errors.json      # CODEOWNERS validation errors
        └─ [{ line, column, message, kind }, ...]
```

**Config:**
```yaml
sync:
  activity: true
  languages: true
  contributors: true
  codeownersErrors: true
```

---

## Security & Dependencies (PRs #51, #19)

When security features are enabled:

```
.ghfs/
├── ... (core files)
└── security/
    ├── README.md                       # Generated security summary
    ├── sbom.json                       # SPDX Software Bill of Materials
    │   └─ { spdxVersion, packages[], ... }
    ├── dependabot-alerts.json          # Full Dependabot alert list
    │   └─ [{ number, state, severity, package, ... }, ...]
    ├── dependabot-summary.json         # Alert counts by severity
    │   └─ { critical: 2, high: 5, medium: 10, ... }
    ├── dependency-graph-summary.json   # Dependency submission metadata
    │   └─ { submissionCount, manifestCount, ... }
    ├── attestations-summary.json       # Artifact attestation list
    │   └─ [{ bundle_url, attestations: [...] }, ...]
    ├── advisories.json                 # Security advisories
    │   └─ [{ ghsa_id, summary, severity, ... }, ...]
    └── dependency-review/
        ├── pr-00024.json               # Per-PR dependency changes
        └── pr-00087.json
            └─ { vulnerable: [...], added: [...], removed: [...] }
```

**Config:**
```yaml
extended:
  sbom: true
  dependencyReview: true
  dependabotAlerts: true
  dependencyGraph: true
  attestations: true
  securityAdvisories: true
  securitySummary: true
```

**Permissions:** 🔒 Most require GitHub Advanced Security

---

## Projects v2 (PR #47)

When Projects v2 sync is enabled:

```
.ghfs/
├── ... (core files)
└── projects/
    ├── projects.json                   # All projects overview
    │   └─ [{ number, title, url, fields[], ... }, ...]
    ├── 1-roadmap.json                  # Individual project board
    │   ├─ Project metadata
    │   ├─ Field definitions (status, priority, etc.)
    │   └─ Items with field values
    └── 2-sprint-planning.json
```

**Config:**
```yaml
sync:
  projects: true
```

---

## Merge Queue (PR #44)

When merge queue is enabled:

```
.ghfs/
├── ... (core files)
└── merge-queue/
    ├── status.json                     # Queue metadata
    │   └─ { enabled, url, entryCount, ... }
    ├── entries.json                    # All queue entries
    │   └─ [{ position, pr_number, base_sha, head_sha, ... }, ...]
    └── pr-00024.json                   # Per-PR queue entry
        └─ { position, jump, estimated_time, ... }
```

**Config:**
```yaml
sync:
  mergeQueue: true
```

---

## Wiki & Discussions (PR #3)

When community features are enabled:

```
.ghfs/
├── ... (core files)
├── wiki/
│   ├── index.md                        # Wiki index
│   ├── home.md                         # Wiki pages
│   ├── installation.md
│   └── troubleshooting.md
└── discussions/
    ├── index.md                        # Discussion index
    ├── 00001-announcement.md           # Discussion threads
    ├── 00042-help-needed.md
    └── 00087-show-and-tell.md
        ├─ Discussion body
        ├─ Comments
        └─ Reactions
```

**Config:**
```yaml
sync:
  wiki: true
  discussions: true
```

---

## Agent Intelligence (PRs #19, #38, #43)

When agent intelligence features are enabled:

```
.ghfs/
├── ... (core files)
├── me.md                               # Personal summary
│   ├─ Issues authored by you
│   ├─ PRs authored by you
│   ├─ Issues assigned to you
│   └─ PRs where you're reviewer
├── sync-state.json                     # Incremental sync metadata
│   └─ { lastSync, itemCounts, cursors, ... }
├── search.jsonl                        # Fast local search index
│   └─ One JSON object per line:
│       {"type":"issue","number":123,"title":"...","body":"..."}
│       {"type":"pull","number":124,"title":"...","body":"..."}
├── refs.json                           # Cross-reference graph
│   └─ { nodes: [...], edges: [...] }
│       Edges: mentions, closes, references, reviews, etc.
└── context-packs/
    ├── issue-00001.md                  # Context pack for issue
    ├── issue-00042.md
    ├── pr-00024.md                     # Context pack for PR
    └── pr-00087.md
        ├─ Prompt-optimized summary
        ├─ Related items
        └─ Timeline highlights
```

**Config:**
```yaml
extended:
  meSummary: true
  searchIndex: true
  refsGraph: true
  contextPacks: true
```

---

## Complete Structure (All Features)

Maximum configuration with all features enabled:

```
.ghfs/
├── INDEX.md
├── repo.json
├── issues.md
├── pulls.md
├── execute.yml
├── execute.md
├── activity.md
├── languages.json
├── contributors.json
├── me.md
├── sync-state.json
├── search.jsonl
├── refs.json
├── schema/
│   └── execute.schema.json
├── issues/
│   ├── 00001-first-issue.md
│   ├── 00042-bug-report.md
│   └── closed/
│       └── 00010-fixed-bug.md
├── pulls/
│   ├── 00024-fix-typo.md
│   ├── 00024-fix-typo.patch
│   └── closed/
│       └── 00015-merged-pr.md
├── security/
│   ├── README.md
│   ├── sbom.json
│   ├── dependabot-alerts.json
│   ├── dependabot-summary.json
│   ├── dependency-graph-summary.json
│   ├── attestations-summary.json
│   ├── advisories.json
│   └── dependency-review/
│       └── pr-00024.json
├── projects/
│   ├── projects.json
│   ├── 1-roadmap.json
│   └── 2-sprint-planning.json
├── merge-queue/
│   ├── status.json
│   ├── entries.json
│   └── pr-00024.json
├── wiki/
│   ├── index.md
│   └── home.md
├── discussions/
│   ├── index.md
│   └── 00001-announcement.md
├── constitution/
│   └── CODEOWNERS.errors.json
└── context-packs/
    ├── issue-00001.md
    └── pr-00024.md
```

---

## Data Flow Diagram

```
┌─────────────────────┐
│   GitHub API        │
│  (REST + GraphQL)   │
└──────────┬──────────┘
           │
           │ fetch
           ▼
┌─────────────────────┐
│   GHFS Provider     │
│  (Octokit client)   │
└──────────┬──────────┘
           │
           │ normalize
           ▼
┌─────────────────────┐
│   Sync Engine       │
│  (sync-repository)  │
└──────────┬──────────┘
           │
           │ write
           ▼
┌─────────────────────┐
│   Filesystem        │
│   (.ghfs/ mirror)   │
└──────────┬──────────┘
           │
           │ read/edit
           ▼
┌─────────────────────┐
│   User/Agent        │
│  (local operations) │
└──────────┬──────────┘
           │
           │ execute
           ▼
┌─────────────────────┐
│   Execute Engine    │
│  (apply operations) │
└──────────┬──────────┘
           │
           │ mutations
           ▼
┌─────────────────────┐
│   GitHub API        │
│  (write operations) │
└─────────────────────┘
```

---

## Config → File Structure Map

| Config Toggle | File/Directory | Description |
|--------------|----------------|-------------|
| `sync.issues` | `.ghfs/issues/*.md` | Issue markdown files |
| `sync.pulls` | `.ghfs/pulls/*.md` | PR markdown files |
| `sync.closed` | `.ghfs/issues/closed/`, `.ghfs/pulls/closed/` | Closed items |
| `sync.patches` | `.ghfs/pulls/*.patch` | PR diff files |
| `sync.activity` | `.ghfs/activity.md` | Activity timeline |
| `sync.languages` | `.ghfs/languages.json` | Language stats |
| `sync.contributors` | `.ghfs/contributors.json` | Contributor list |
| `sync.codeownersErrors` | `.ghfs/constitution/CODEOWNERS.errors.json` | Validation errors |
| `sync.projects` | `.ghfs/projects/` | Projects v2 data |
| `sync.mergeQueue` | `.ghfs/merge-queue/` | Merge queue data |
| `sync.wiki` | `.ghfs/wiki/` | Wiki pages |
| `sync.discussions` | `.ghfs/discussions/` | Discussion threads |
| `extended.sbom` | `.ghfs/security/sbom.json` | SBOM |
| `extended.dependencyReview` | `.ghfs/security/dependency-review/` | Per-PR reviews |
| `extended.dependabotAlerts` | `.ghfs/security/dependabot-*.json` | Alerts |
| `extended.securityAdvisories` | `.ghfs/security/advisories.json` | Advisories |
| `extended.meSummary` | `.ghfs/me.md` | Personal summary |
| `extended.searchIndex` | `.ghfs/search.jsonl` | Search index |
| `extended.refsGraph` | `.ghfs/refs.json` | Cross-refs |
| `extended.contextPacks` | `.ghfs/context-packs/` | Context bundles |

---

## Related

- See `docs/research/config-schema.md` for configuration reference
- See `docs/research/index-structure.md` for detailed structure documentation
- See `docs/research/index-generator-spec.md` for INDEX.md generation
