# GHFS API Surface & Configuration Research

Comprehensive documentation of GitHub API surface coverage, file structure, and configuration schema for the GHFS project.

---

## Quick Links

- **[GitHub API Surface Map](./github-api-surface.md)** - Complete REST + GraphQL endpoint coverage checklist
- **[INDEX Structure](./index-structure.md)** - Complete `.ghfs/` file structure documentation
- **[Configuration Schema](./config-schema.md)** - All `sync.*` and `extended.*` toggles with examples
- **[Issue Audit](./issue-audit.md)** - Analysis of existing issues and gap identification
- **[Issues to Close](./issues-to-close.md)** - Closure checklist for implemented features

---

## Executive Summary

This research provides **complete coverage** of the GHFS project's API surface, file structure, and configuration. It serves as the exhaustiveness audit and canonical reference for all GitHub API integration.

### Coverage Statistics

**GitHub API Endpoints:**
- ✅ **50+ implemented** - Core issues/PRs, comments, timeline, reviews, execute operations
- 🚧 **15+ in PRs** - Security, projects, merge queue, wiki, discussions, activity, metadata
- ❌ **35+ missing** - Releases, actions, governance, branches, advanced intelligence

**File Structure:**
- ✅ Core structure implemented (`.ghfs/issues/`, `.ghfs/pulls/`, `.ghfs/execute.yml`)
- 🚧 Extended structure in PRs (`.ghfs/security/`, `.ghfs/projects/`, `.ghfs/merge-queue/`)
- ❌ Missing structure (releases, actions, governance, deployments, advanced features)

**Configuration Schema:**
- ✅ 19 toggles currently available
- 🚧 5 toggles in PRs
- ❌ 25+ toggles proposed for missing features

**Issue Management:**
- 32+ issues can be closed (implemented in PRs)
- 8+ duplicate issues identified
- 4 new gap issues created
- **Net reduction: 30+ issues**

---

## Purpose & Scope

This research documentation:

1. **Enumerates everything** - Every GitHub API endpoint, file path, and config toggle
2. **Documents status** - What's done, in progress, or missing
3. **Identifies gaps** - New issues filed for missing features
4. **Enables cleanup** - Closure checklist for 34+ issues
5. **Guides development** - Canonical reference for contributors

---

## Structure

### 1. GitHub API Surface Map

Complete checklist of GitHub REST and GraphQL endpoints organized by category:

- **Core Repository Metadata** - Repo info, languages, contributors, activity, topics
- **Issues & Pull Requests** - Core data, comments, timeline, PR-specific metadata
- **Projects v2** - Project boards, fields, items
- **Labels & Milestones** - Repository labels and milestones
- **Security & Dependencies** - SBOM, dependency review, Dependabot, attestations, advisories
- **Releases & Tags** - Release history, git tags
- **Branches & Protection** - Branch list, protection rules, rulesets
- **Actions & Workflows** - Workflow definitions, runs, jobs
- **Merge Queue** - Queue entries and status
- **Wiki & Discussions** - Wiki pages, discussion threads
- **Governance** - Contributing, code of conduct, security policy, templates
- **Authenticated User** - Current user info
- **Execute Operations** - All issue/PR mutation actions

Each endpoint includes:
- Implementation status (✅ Done, 🚧 PR, ❌ Missing)
- API endpoint and method
- Config toggle
- File paths
- Related issues/PRs
- Permission requirements

### 2. INDEX Structure

Complete documentation of `.ghfs/` directory structure:

- **Core structure** - Issues, pulls, execute operations
- **Extended structure** - Security, projects, merge queue, wiki, discussions, activity
- **Missing structure** - Releases, actions, governance, branches, deployments
- **File formats** - Markdown documents, JSON, JSONL, patches
- **INDEX generation** - Requirements for auto-generated INDEX.md

### 3. Configuration Schema

Full TypeScript interface documentation with all toggles:

**sync.* options** (control what data is synced):
- Core: issues, pulls, closed, patches
- Metadata: activity, languages, contributors, codeownersErrors
- Projects: projects
- Queue: mergeQueue
- Community: wiki, discussions
- Missing: releases, tags, workflows, branches, protection, constitution, readme, topics, pinnedIssues

**extended.* options** (advanced features):
- Security: sbom, dependencyReview, dependabotAlerts, dependencyGraph, attestations, securityAdvisories
- Intelligence: meSummary, searchIndex, refsGraph, contextPacks, agentHints
- Metadata: labelsJson, milestonesJson
- PR: prFiles, prChecks, prGate
- Advanced: deployments, graphSystem, tieredFreshness, provenance, localCoordination, policyGate

Includes:
- Type definitions
- Default values
- Examples (minimal, standard, full-featured, agent-optimized)
- Permission requirements
- API references

### 4. Issue Audit

Analysis of all GitHub issues:

- **Implemented in PRs** - 32+ issues (close after PR merge)
- **Duplicates** - 8+ issues (close immediately)
- **New gaps** - 4 issues created with 'gap' label needed
- **Existing gaps** - 40+ open issues for missing features

### 5. Issue Closure Checklist

Actionable list organized by PR for maintainer to:
- Close issues as PRs merge
- Close duplicate issues
- Add labels to new issues
- Track net issue reduction

---

## Key Documents

### [github-api-surface.md](./github-api-surface.md)

**Purpose:** Complete REST + GraphQL API endpoint coverage checklist

**Contents:**
- Core Repository Metadata (9 endpoints)
- Issues & Pull Requests (25+ endpoints)
- Projects v2 (3 endpoints)
- Labels & Milestones (3 endpoints)
- Security & Dependencies (9 endpoints)
- Releases & Tags (2 endpoints)
- Branches & Protection (3 endpoints)
- Actions & Workflows (4 endpoints)
- Merge Queue (2 endpoints)
- Wiki & Discussions (2 endpoints)
- Governance & Constitution (9 endpoints)
- Authenticated User (1 endpoint)
- Execute Operations (25+ action endpoints)

**Use Cases:**
- Find missing API endpoints
- Check implementation status
- Identify related PRs/issues
- Understand permission requirements

### [index-structure.md](./index-structure.md)

**Purpose:** Complete `.ghfs/` file structure reference

**Contents:**
- Core structure (implemented)
- Extended structure (in PRs)
- Missing structure (not yet implemented)
- File formats (markdown, JSON, JSONL)
- INDEX.md generation requirements

**Use Cases:**
- Understand file organization
- Know where to find synced data
- Design new features consistently
- Generate INDEX.md

### [config-schema.md](./config-schema.md)

**Purpose:** All configuration toggles with TypeScript interface

**Contents:**
- Complete GhfsUserConfig interface
- All sync.* options (25+ toggles)
- All extended.* options (20+ toggles)
- Default values
- Configuration examples

**Use Cases:**
- Add new config options
- Understand config conventions
- Configure GHFS for specific needs
- Document features

### [issue-audit.md](./issue-audit.md)

**Purpose:** Analysis of existing issues and gap identification

**Contents:**
- Issues implemented in PRs (by PR)
- Duplicate issues
- New gap issues needed
- Existing gaps with issues

**Use Cases:**
- Close implemented issues
- Close duplicates
- Track gap coverage
- Prioritize future work

### [issues-to-close.md](./issues-to-close.md)

**Purpose:** Actionable closure checklist

**Contents:**
- Issues to close by PR
- Duplicate issues to close
- New issues needing labels
- Summary statistics

**Use Cases:**
- Close issues systematically
- Track net issue reduction
- Update issue labels

---

## Usage

### For Maintainers

1. **Issue Management:**
   - Review `issues-to-close.md`
   - Close issues as PRs merge
   - Add 'gap' label to #123, #124, #125, #126

2. **Development Priorities:**
   - Check `github-api-surface.md` for missing endpoints
   - Use `config-schema.md` for new config options
   - Follow `index-structure.md` for file paths

3. **PR Reviews:**
   - Reference these docs in PR reviews
   - Ensure consistency with documented patterns
   - Update docs when adding new features

### For Contributors

1. **Finding Work:**
   - Browse `github-api-surface.md` for ❌ Missing items
   - Check related issues
   - Follow existing patterns

2. **Implementation:**
   - Follow `config-schema.md` for config conventions
   - Use `index-structure.md` for file structure
   - Match existing code style

3. **Documentation:**
   - Update API surface map when implementing
   - Add config options to schema reference
   - Update INDEX structure docs

### For Users

1. **Configuration:**
   - See `config-schema.md` for all options
   - Use examples for common use cases
   - Understand permission requirements

2. **File Structure:**
   - See `index-structure.md` for data locations
   - Understand file formats
   - Know what data is available

---

## Maintenance

These documents should be updated when:

- ✅ New features are implemented
- ✅ PRs are merged
- ✅ Issues are closed
- ✅ API endpoints are added
- ✅ Config options are added
- ✅ File structure changes

Keep these docs as the single source of truth for API coverage and configuration.

---

## Related

- **Epic Issues:** [#4](https://github.com/agustif/ghfs/issues/4), [#45](https://github.com/agustif/ghfs/issues/45), [#99](https://github.com/agustif/ghfs/issues/99)
- **This PR:** [#134](https://github.com/agustif/ghfs/pull/134)
- **Open PRs:** [#51](https://github.com/agustif/ghfs/pull/51), [#48](https://github.com/agustif/ghfs/pull/48), [#47](https://github.com/agustif/ghfs/pull/47), [#44](https://github.com/agustif/ghfs/pull/44), [#43](https://github.com/agustif/ghfs/pull/43), [#19](https://github.com/agustif/ghfs/pull/19), [#3](https://github.com/agustif/ghfs/pull/3), [#2](https://github.com/agustif/ghfs/pull/2), [#1](https://github.com/agustif/ghfs/pull/1)

---

## License

Same as parent project (see root LICENSE.md)
