# Configuration Schema Reference

Complete documentation of all configuration toggles for GHFS.

---

## Table of Contents

- [Core Configuration](#core-configuration)
- [Sync Configuration](#sync-configuration)
- [Extended Configuration](#extended-configuration)
- [Type Definitions](#type-definitions)
- [Examples](#examples)

---

## Core Configuration

### `repo`
- **Type:** `string` (optional)
- **Default:** Auto-detected from git remote or package.json
- **Description:** The repository to sync in `owner/name` format.
- **Example:** `"facebook/react"`

### `directory`
- **Type:** `string` (optional)
- **Default:** `".ghfs"`
- **Description:** The directory to store synced issues and pull requests.
- **Example:** `".github-mirror"`

### `auth`
- **Type:** `object` (optional)
- **Description:** Authentication configuration.

#### `auth.token`
- **Type:** `string` (optional)
- **Default:** From `gh auth token`, `GH_TOKEN`, or `GITHUB_TOKEN` environment variable
- **Description:** GitHub personal access token for authentication.
- **Example:** `"ghp_xxxxxxxxxxxxx"`

### `bots`
- **Type:** `string[]` (optional)
- **Default:** `[]`
- **Description:** Additional bot logins to ignore when computing "last updated" sort order. Logins ending with `[bot]` are detected automatically. Case-insensitive.
- **Example:** `["coderabbitai", "renovate"]`

---

## Sync Configuration

All `sync.*` options control what data is synced from GitHub.

### Core Issue/PR Sync

#### `sync.issues`
- **Type:** `boolean` (optional)
- **Default:** `true`
- **Description:** Whether to sync issues.
- **Files:** `.ghfs/issues/*.md`

#### `sync.pulls`
- **Type:** `boolean` (optional)
- **Default:** `true`
- **Description:** Whether to sync pull requests.
- **Files:** `.ghfs/pulls/*.md`

#### `sync.closed`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Description:** Whether to sync closed issues and pull requests. When `false`, existing closed items are deleted.
- **Files:** `.ghfs/issues/closed/`, `.ghfs/pulls/closed/`

#### `sync.patches`
- **Type:** `"open" | "all" | false` (optional)
- **Default:** `"open"`
- **Description:** When to download pull request patch files.
  - `"open"` - Only open PRs
  - `"all"` - All PRs
  - `false` - Don't download patches
- **Files:** `.ghfs/pulls/*.patch`

---

### Repository Metadata (PR #48)

#### `sync.activity`
- **Type:** `boolean` (optional)
- **Default:** `true`
- **Status:** 🚧 PR #48
- **Description:** Fetch repository activity timeline (push, force_push, branch_creation, branch_deletion, pr_merge, merge_queue_merge).
- **API:** `GET /repos/{owner}/{repo}/activity`
- **Files:** `.ghfs/activity.md`

#### `sync.languages`
- **Type:** `boolean` (optional)
- **Default:** `true`
- **Status:** 🚧 PR #48
- **Description:** Fetch language breakdown (bytes per language).
- **API:** `GET /repos/{owner}/{repo}/languages`
- **Files:** `.ghfs/languages.json`

#### `sync.contributors`
- **Type:** `boolean` (optional)
- **Default:** `true`
- **Status:** 🚧 PR #48
- **Description:** Fetch contributor list with contribution counts.
- **API:** `GET /repos/{owner}/{repo}/contributors`
- **Files:** `.ghfs/contributors.json`

#### `sync.codeownersErrors`
- **Type:** `boolean` (optional)
- **Default:** `true`
- **Status:** 🚧 PR #48
- **Description:** Validate CODEOWNERS file and fetch syntax errors.
- **API:** `GET /repos/{owner}/{repo}/codeowners/errors`
- **Files:** `.ghfs/constitution/CODEOWNERS.errors.json`
- **Note:** Gracefully skips if CODEOWNERS file doesn't exist.

---

### Projects v2 (PR #47)

#### `sync.projects`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #47
- **Description:** Sync GitHub Projects v2 boards with field definitions and items.
- **API:** GraphQL `repository.projectsV2`
- **Files:** `.ghfs/projects/projects.json`, `.ghfs/projects/{number}-{slug}.json`
- **Note:** Opt-in due to potentially large data volume.

---

### Merge Queue (PR #44)

#### `sync.mergeQueue`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #44
- **Description:** Sync merge queue entries and status.
- **API:** GraphQL `repository.mergeQueue`
- **Files:** `.ghfs/merge-queue/status.json`, `.ghfs/merge-queue/entries.json`
- **Note:** Only relevant for repositories with merge queue enabled.

---

### Wiki & Discussions (PR #3)

#### `sync.wiki`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #3
- **Description:** Sync wiki pages.
- **API:** GraphQL `repository.wikis`
- **Files:** `.ghfs/wiki/*.md`

#### `sync.discussions`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #3
- **Description:** Sync discussion threads and comments.
- **API:** GraphQL `repository.discussions`
- **Files:** `.ghfs/discussions/*.md`

---

### Missing Sync Options

These options are not yet implemented but should be added:

#### `sync.releases`
- **Type:** `boolean` (optional)
- **Default:** `true` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync release history.
- **API:** `GET /repos/{owner}/{repo}/releases`
- **Files:** `.ghfs/releases/`
- **Issues:** #5, #15

#### `sync.tags`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync git tags.
- **API:** `GET /repos/{owner}/{repo}/tags`
- **Files:** `.ghfs/tags/`

#### `sync.workflows`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync GitHub Actions workflows.
- **API:** `GET /repos/{owner}/{repo}/actions/workflows`
- **Files:** `.ghfs/actions/workflows.json`
- **Issue:** #17

#### `sync.workflowRuns`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync recent workflow runs.
- **API:** `GET /repos/{owner}/{repo}/actions/runs`
- **Files:** `.ghfs/actions/runs.json`
- **Issue:** #17

#### `sync.branches`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync branch list.
- **API:** `GET /repos/{owner}/{repo}/branches`
- **Files:** `.ghfs/branches/branches.json`

#### `sync.branchProtection`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync branch protection rules.
- **API:** `GET /repos/{owner}/{repo}/branches/{branch}/protection`
- **Files:** `.ghfs/branches/{branch}/protection.json`
- **Issue:** #14

#### `sync.rulesets`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync repository rulesets.
- **API:** `GET /repos/{owner}/{repo}/rulesets`
- **Files:** `.ghfs/branches/rulesets.json`
- **Issue:** #14

#### `sync.constitution`
- **Type:** `boolean` (optional)
- **Default:** `true` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync governance files (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, SUPPORT, FUNDING, CODEOWNERS, templates).
- **API:** REST repository contents
- **Files:** `.ghfs/constitution/`
- **Issue:** #13

#### `sync.readme`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync repository README excerpt.
- **API:** GraphQL `repository.object(expression: "HEAD:README.md")`
- **Files:** `.ghfs/README-excerpt.md`
- **Issue:** #26

#### `sync.topics`
- **Type:** `boolean` (optional)
- **Default:** `true` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync repository topics.
- **API:** GraphQL `repository.repositoryTopics`
- **Files:** Embedded in `.ghfs/repo.json`
- **Issue:** #16

#### `sync.pinnedIssues`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Sync pinned issues list.
- **API:** GraphQL `repository.pinnedIssues`
- **Files:** `.ghfs/pinned-issues.json`
- **Issue:** #28

---

## Extended Configuration

All `extended.*` options control advanced features and agent intelligence.

### Security & Dependencies

#### `extended.sbom`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #51
- **Description:** Export SPDX Software Bill of Materials.
- **API:** `GET /repos/{owner}/{repo}/dependency-graph/sbom`
- **Files:** `.ghfs/security/sbom.json`
- **Permissions:** 🔒 Requires GitHub Advanced Security or dependency graph enabled
- **Note:** Returns `null` pointer if unavailable.

#### `extended.dependencyReview`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #51
- **Description:** Per-PR dependency change tracking with vulnerability detection.
- **API:** `GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}`
- **Files:** `.ghfs/security/dependency-review/pr-{number}.json`
- **Permissions:** 🔒 Requires GitHub Advanced Security
- **Note:** Processes up to 10 open PRs.

#### `extended.dependabotAlerts`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #51
- **Description:** Fetch Dependabot alert details and summaries.
- **API:** `GET /repos/{owner}/{repo}/dependabot/alerts`
- **Files:** `.ghfs/security/dependabot-alerts.json`, `.ghfs/security/dependabot-summary.json`
- **Permissions:** 🔒 Requires Dependabot enabled
- **Note:** Summary includes counts by severity and top 10 alerts.

#### `extended.dependencyGraph`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #51
- **Description:** Check dependency graph submission presence.
- **API:** `GET /repos/{owner}/{repo}/dependency-graph/snapshots`
- **Files:** `.ghfs/security/dependency-graph-summary.json`
- **Permissions:** 🔒 Requires dependency graph enabled

#### `extended.attestations`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #51
- **Description:** List artifact attestation metadata (no blobs).
- **API:** `GET /repos/{owner}/{repo}/attestations`
- **Files:** `.ghfs/security/attestations-summary.json`
- **Permissions:** 🔒 Requires GitHub Actions and attestations

#### `extended.securityAdvisories`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #19
- **Description:** Fetch repository security advisories.
- **API:** `GET /repos/{owner}/{repo}/security-advisories`
- **Files:** `.ghfs/security/advisories.json`
- **Permissions:** 🔒 Requires appropriate permissions

#### `extended.securitySummary`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #19
- **Description:** Generate security summary from multiple sources.
- **Files:** `.ghfs/security/README.md`
- **Note:** Aggregates data from advisories, alerts, SBOM, etc.

#### `extended.secretScanning`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Fetch secret scanning alerts.
- **API:** `GET /repos/{owner}/{repo}/secret-scanning/alerts`
- **Files:** `.ghfs/security/secret-scanning.json`
- **Permissions:** 🔒 Requires GitHub Advanced Security + secret scanning

#### `extended.codeScanning`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Fetch code scanning alerts.
- **API:** `GET /repos/{owner}/{repo}/code-scanning/alerts`
- **Files:** `.ghfs/security/code-scanning.json`
- **Permissions:** 🔒 Requires GitHub Advanced Security + code scanning

---

### Agent Intelligence

#### `extended.meSummary`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #19
- **Description:** Generate personal summary of user's issues/PRs.
- **Files:** `.ghfs/me.md`
- **Note:** Includes authored, assigned, and reviewed items.
- **Issue:** #29

#### `extended.searchIndex`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #19
- **Description:** Build fast local search index (JSONL format).
- **Files:** `.ghfs/search.jsonl`
- **Note:** One item per line: `{"type":"issue","number":123,"title":"...","body":"..."}`
- **Issue:** #32

#### `extended.refsGraph`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #19
- **Description:** Build cross-reference graph of mentions, closes, references, reviews.
- **Files:** `.ghfs/refs.json`
- **Note:** Graph edges for agent navigation.
- **Issues:** #31, #36

#### `extended.contextPacks`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Status:** 🚧 PR #43
- **Description:** Generate prompt-sized context bundles per issue/PR.
- **Files:** `.ghfs/context-packs/issue-{number}.md`, `.ghfs/context-packs/pr-{number}.md`
- **Note:** Optimized for LLM context windows.
- **Issues:** #21, #34

#### `extended.agentHints`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Detect and document test/lint/build commands.
- **Files:** `.ghfs/agent-hints.md`
- **Note:** Auto-detected from package.json, Makefile, etc.
- **Issue:** #41

---

### Enhanced Metadata

#### `extended.labelsJson`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Create separate labels file.
- **Files:** `.ghfs/labels.json`
- **Note:** Currently embedded in repo.json
- **Issues:** #7, #12

#### `extended.milestonesJson`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Create separate milestones file.
- **Files:** `.ghfs/milestones.json`
- **Note:** Currently embedded in repo.json
- **Issues:** #7, #12

---

### PR Intelligence

#### `extended.prFiles`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Fetch PR file list and diff intelligence.
- **API:** `GET /repos/{owner}/{repo}/pulls/{number}/files`
- **Files:** `.ghfs/pulls/{number}-{slug}.files.json`
- **Issue:** #11

#### `extended.prChecks`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Fetch PR check runs and status.
- **API:** `GET /repos/{owner}/{repo}/commits/{ref}/check-runs`
- **Files:** `.ghfs/pulls/{number}-{slug}.checks.json`
- **Issue:** #9

#### `extended.prGate`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Compute PR merge gate status (checks + reviews + protection).
- **Files:** `.ghfs/pulls/{number}-{slug}.gate.json`
- **Issue:** #10

---

### Advanced Features

#### `extended.deployments`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Fetch environment and deployment status.
- **API:** `GET /repos/{owner}/{repo}/deployments`
- **Files:** `.ghfs/deployments/`
- **Issue:** #40

#### `extended.graphSystem`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Build graph nodes + edges for agent navigation.
- **Files:** `.ghfs/graph.json`
- **Issue:** #25

#### `extended.tieredFreshness`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Implement hot/warm/cold sync strategy.
- **Note:** Tiered freshness for different data types.
- **Issues:** #24, #33

#### `extended.provenance`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Record fetch metadata per file.
- **Note:** Track sync provenance and staleness.
- **Issue:** #23

#### `extended.localCoordination`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Add locks + notes for agent swarm coordination.
- **Files:** `.ghfs/coordination/`
- **Issue:** #22

#### `extended.policyGate`
- **Type:** `boolean` (optional)
- **Default:** `false` (proposed)
- **Status:** ❌ Missing
- **Description:** Policy + gate DSL for offline evaluation.
- **Files:** `.ghfs/policy/`
- **Issues:** #20, #35

---

## Type Definitions

### Complete TypeScript Interface

```typescript
export interface GhfsUserConfig {
  /**
   * The repository to sync in owner/name format.
   * Auto-detected from git remote or package.json if not provided.
   */
  repo?: string

  /**
   * The directory to store synced issues and pull requests.
   * @default '.ghfs'
   */
  directory?: string

  /**
   * Authentication configuration.
   */
  auth?: {
    /**
     * GitHub personal access token.
     * Falls back to gh auth token, GH_TOKEN, or GITHUB_TOKEN env var.
     */
    token?: string
  }

  /**
   * Additional bot logins to ignore when computing "last updated".
   * Logins ending with [bot] are detected automatically.
   * @default []
   */
  bots?: string[]

  /**
   * Sync options control what data is fetched from GitHub.
   */
  sync?: {
    // === Core Issue/PR Sync ===

    /**
     * Whether to sync issues.
     * @default true
     */
    issues?: boolean

    /**
     * Whether to sync pull requests.
     * @default true
     */
    pulls?: boolean

    /**
     * Whether to sync closed issues and pull requests.
     * When false, existing closed items are deleted.
     * @default false
     */
    closed?: boolean

    /**
     * When to download pull request patch files.
     * - 'open': Only open PRs
     * - 'all': All PRs
     * - false: Don't download patches
     * @default 'open'
     */
    patches?: 'open' | 'all' | false

    // === Repository Metadata (PR #48) ===

    /**
     * Fetch repository activity timeline.
     * @default true
     * @status 🚧 PR #48
     */
    activity?: boolean

    /**
     * Fetch language breakdown (bytes per language).
     * @default true
     * @status 🚧 PR #48
     */
    languages?: boolean

    /**
     * Fetch contributor list with contribution counts.
     * @default true
     * @status 🚧 PR #48
     */
    contributors?: boolean

    /**
     * Validate CODEOWNERS file and fetch syntax errors.
     * @default true
     * @status 🚧 PR #48
     */
    codeownersErrors?: boolean

    // === Projects v2 (PR #47) ===

    /**
     * Sync GitHub Projects v2 boards.
     * @default false
     * @status 🚧 PR #47
     */
    projects?: boolean

    // === Merge Queue (PR #44) ===

    /**
     * Sync merge queue entries and status.
     * @default false
     * @status 🚧 PR #44
     */
    mergeQueue?: boolean

    // === Wiki & Discussions (PR #3) ===

    /**
     * Sync wiki pages.
     * @default false
     * @status 🚧 PR #3
     */
    wiki?: boolean

    /**
     * Sync discussion threads and comments.
     * @default false
     * @status 🚧 PR #3
     */
    discussions?: boolean

    // === Missing Options (Not Yet Implemented) ===

    /**
     * Sync release history.
     * @default true (proposed)
     * @status ❌ Missing - Issues #5, #15
     */
    releases?: boolean

    /**
     * Sync git tags.
     * @default false (proposed)
     * @status ❌ Missing
     */
    tags?: boolean

    /**
     * Sync GitHub Actions workflows.
     * @default false (proposed)
     * @status ❌ Missing - Issue #17
     */
    workflows?: boolean

    /**
     * Sync recent workflow runs.
     * @default false (proposed)
     * @status ❌ Missing - Issue #17
     */
    workflowRuns?: boolean

    /**
     * Sync branch list.
     * @default false (proposed)
     * @status ❌ Missing
     */
    branches?: boolean

    /**
     * Sync branch protection rules.
     * @default false (proposed)
     * @status ❌ Missing - Issue #14
     */
    branchProtection?: boolean

    /**
     * Sync repository rulesets.
     * @default false (proposed)
     * @status ❌ Missing - Issue #14
     */
    rulesets?: boolean

    /**
     * Sync governance files (CONTRIBUTING, CODE_OF_CONDUCT, etc).
     * @default true (proposed)
     * @status ❌ Missing - Issue #13
     */
    constitution?: boolean

    /**
     * Sync repository README excerpt.
     * @default false (proposed)
     * @status ❌ Missing - Issue #26
     */
    readme?: boolean

    /**
     * Sync repository topics.
     * @default true (proposed)
     * @status ❌ Missing - Issue #16
     */
    topics?: boolean

    /**
     * Sync pinned issues list.
     * @default false (proposed)
     * @status ❌ Missing - Issue #28
     */
    pinnedIssues?: boolean
  }

  /**
   * Extended features control advanced functionality and agent intelligence.
   */
  extended?: {
    // === Security & Dependencies ===

    /**
     * Export SPDX Software Bill of Materials.
     * 🔒 Requires GitHub Advanced Security or dependency graph.
     * @default false
     * @status 🚧 PR #51
     */
    sbom?: boolean

    /**
     * Per-PR dependency change tracking with vulnerabilities.
     * 🔒 Requires GitHub Advanced Security.
     * @default false
     * @status 🚧 PR #51
     */
    dependencyReview?: boolean

    /**
     * Fetch Dependabot alert details and summaries.
     * 🔒 Requires Dependabot enabled.
     * @default false
     * @status 🚧 PR #51
     */
    dependabotAlerts?: boolean

    /**
     * Check dependency graph submission presence.
     * 🔒 Requires dependency graph enabled.
     * @default false
     * @status 🚧 PR #51
     */
    dependencyGraph?: boolean

    /**
     * List artifact attestation metadata.
     * 🔒 Requires GitHub Actions and attestations.
     * @default false
     * @status 🚧 PR #51
     */
    attestations?: boolean

    /**
     * Fetch repository security advisories.
     * 🔒 Requires appropriate permissions.
     * @default false
     * @status 🚧 PR #19
     */
    securityAdvisories?: boolean

    /**
     * Generate security summary README.
     * @default false
     * @status 🚧 PR #19
     */
    securitySummary?: boolean

    /**
     * Fetch secret scanning alerts.
     * 🔒 Requires GitHub Advanced Security + secret scanning.
     * @default false (proposed)
     * @status ❌ Missing
     */
    secretScanning?: boolean

    /**
     * Fetch code scanning alerts.
     * 🔒 Requires GitHub Advanced Security + code scanning.
     * @default false (proposed)
     * @status ❌ Missing
     */
    codeScanning?: boolean

    // === Agent Intelligence ===

    /**
     * Generate personal summary of user's issues/PRs.
     * @default false
     * @status 🚧 PR #19
     */
    meSummary?: boolean

    /**
     * Build fast local search index (JSONL format).
     * @default false
     * @status 🚧 PR #19
     */
    searchIndex?: boolean

    /**
     * Build cross-reference graph.
     * @default false
     * @status 🚧 PR #19
     */
    refsGraph?: boolean

    /**
     * Generate prompt-sized context bundles per issue/PR.
     * @default false
     * @status 🚧 PR #43
     */
    contextPacks?: boolean

    /**
     * Detect and document test/lint/build commands.
     * @default false (proposed)
     * @status ❌ Missing - Issue #41
     */
    agentHints?: boolean

    // === Enhanced Metadata ===

    /**
     * Create separate labels file.
     * @default false (proposed)
     * @status ❌ Missing - Issues #7, #12
     */
    labelsJson?: boolean

    /**
     * Create separate milestones file.
     * @default false (proposed)
     * @status ❌ Missing - Issues #7, #12
     */
    milestonesJson?: boolean

    // === PR Intelligence ===

    /**
     * Fetch PR file list and diff intelligence.
     * @default false (proposed)
     * @status ❌ Missing - Issue #11
     */
    prFiles?: boolean

    /**
     * Fetch PR check runs and status.
     * @default false (proposed)
     * @status ❌ Missing - Issue #9
     */
    prChecks?: boolean

    /**
     * Compute PR merge gate status.
     * @default false (proposed)
     * @status ❌ Missing - Issue #10
     */
    prGate?: boolean

    // === Advanced Features ===

    /**
     * Fetch environment and deployment status.
     * @default false (proposed)
     * @status ❌ Missing - Issue #40
     */
    deployments?: boolean

    /**
     * Build graph nodes + edges for agent navigation.
     * @default false (proposed)
     * @status ❌ Missing - Issue #25
     */
    graphSystem?: boolean

    /**
     * Implement hot/warm/cold sync strategy.
     * @default false (proposed)
     * @status ❌ Missing - Issues #24, #33
     */
    tieredFreshness?: boolean

    /**
     * Record fetch metadata per file.
     * @default false (proposed)
     * @status ❌ Missing - Issue #23
     */
    provenance?: boolean

    /**
     * Add locks + notes for agent swarm coordination.
     * @default false (proposed)
     * @status ❌ Missing - Issue #22
     */
    localCoordination?: boolean

    /**
     * Policy + gate DSL for offline evaluation.
     * @default false (proposed)
     * @status ❌ Missing - Issues #20, #35
     */
    policyGate?: boolean
  }
}

export type GhfsResolvedConfig = Required<GhfsUserConfig> & {
  cwd: string
  auth: Required<GhfsUserConfig['auth']>
  sync: Required<GhfsUserConfig['sync']>
  extended: Required<GhfsUserConfig['extended']>
}
```

---

## Examples

### Minimal Configuration

```typescript
// ghfs.config.ts
import type { GhfsUserConfig } from '@ghfs/cli'

export default {
  repo: 'facebook/react',
} satisfies GhfsUserConfig
```

### Standard Configuration

```typescript
// ghfs.config.ts
import type { GhfsUserConfig } from '@ghfs/cli'

export default {
  repo: 'facebook/react',
  sync: {
    issues: true,
    pulls: true,
    closed: false,
    patches: 'open',
    activity: true,
    languages: true,
    contributors: true,
  },
} satisfies GhfsUserConfig
```

### Full-Featured Configuration

```typescript
// ghfs.config.ts
import type { GhfsUserConfig } from '@ghfs/cli'

export default {
  repo: 'facebook/react',
  directory: '.ghfs',
  bots: ['coderabbitai', 'renovate'],
  sync: {
    // Core
    issues: true,
    pulls: true,
    closed: true,
    patches: 'all',
    
    // Repository metadata
    activity: true,
    languages: true,
    contributors: true,
    codeownersErrors: true,
    
    // Projects & Merge Queue
    projects: true,
    mergeQueue: true,
    
    // Wiki & Discussions
    wiki: true,
    discussions: true,
  },
  extended: {
    // Security (requires appropriate permissions)
    sbom: true,
    dependencyReview: true,
    dependabotAlerts: true,
    dependencyGraph: true,
    attestations: true,
    securityAdvisories: true,
    securitySummary: true,
    
    // Agent Intelligence
    meSummary: true,
    searchIndex: true,
    refsGraph: true,
    contextPacks: true,
  },
} satisfies GhfsUserConfig
```

### Private Repository with Security

```typescript
// ghfs.config.ts
import type { GhfsUserConfig } from '@ghfs/cli'

export default {
  repo: 'myorg/private-repo',
  auth: {
    token: process.env.GITHUB_TOKEN,
  },
  sync: {
    issues: true,
    pulls: true,
    closed: true,
  },
  extended: {
    // Security features (requires GitHub Advanced Security)
    sbom: true,
    dependencyReview: true,
    dependabotAlerts: true,
    securityAdvisories: true,
    securitySummary: true,
  },
} satisfies GhfsUserConfig
```

### Agent-Optimized Configuration

```typescript
// ghfs.config.ts
import type { GhfsUserConfig } from '@ghfs/cli'

export default {
  repo: 'facebook/react',
  sync: {
    issues: true,
    pulls: true,
    closed: false,  // Keep lightweight
    patches: 'open',
    projects: true,
  },
  extended: {
    // Agent intelligence features
    meSummary: true,
    searchIndex: true,
    refsGraph: true,
    contextPacks: true,
    
    // Security summaries
    dependabotAlerts: true,
    securitySummary: true,
  },
} satisfies GhfsUserConfig
```

---

## Default Values

When options are omitted, these defaults apply:

```typescript
const defaults: GhfsResolvedConfig = {
  repo: /* auto-detected */,
  directory: '.ghfs',
  auth: {
    token: /* from gh/env */,
  },
  bots: [],
  sync: {
    issues: true,
    pulls: true,
    closed: false,
    patches: 'open',
    activity: true,
    languages: true,
    contributors: true,
    codeownersErrors: true,
    projects: false,
    mergeQueue: false,
    wiki: false,
    discussions: false,
    // Missing options would default to false
  },
  extended: {
    // All default to false
    sbom: false,
    dependencyReview: false,
    dependabotAlerts: false,
    dependencyGraph: false,
    attestations: false,
    securityAdvisories: false,
    securitySummary: false,
    meSummary: false,
    searchIndex: false,
    refsGraph: false,
    contextPacks: false,
    // Missing options would default to false
  },
}
```

---

## Implementation Status Summary

- ✅ **Core sync options**: Fully implemented
- 🚧 **Extended repository metadata**: In PR #48
- 🚧 **Projects v2**: In PR #47
- 🚧 **Merge Queue**: In PR #44
- 🚧 **Wiki & Discussions**: In PR #3
- 🚧 **Security & Dependencies**: In PR #51, #19
- 🚧 **Agent Intelligence**: In PR #19, #38, #43
- ❌ **Missing**: 25+ config toggles for releases, actions, governance, branches, advanced features

See [GitHub API Surface](./github-api-surface.md) for detailed implementation status.
