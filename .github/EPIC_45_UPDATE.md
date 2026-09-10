# Epic #45 Index Comment - Copy to Issue

> **Note**: Copy this content to Epic #45 as a comment to maintain the child issue index.

---

## Child Issues Index for Epic #45: API Surface Map

### Priority 1: Core Agent Intelligence (7 issues)
- #39 - activity.md - last N repository events
- #46 - Repository Activity API — push/force_push/branch_*/pr_merge/merge_queue_merge
- #49 - Add repository activity tracking
- #50 - Add CODEOWNERS validation errors endpoint
- #55 - Issue Dependencies — blocked_by / blocking relationships
- #56 - Sub-issues — parent/child issue hierarchies
- #57 - Issue Types — Task, Bug, Feature, custom org types
- #58 - Issue Field Values — custom org-level fields
- #59 - CODEOWNERS Errors endpoint — syntax validation
- #60 - Compare API — ahead/behind branch status

### Priority 2: CI/CD & Actions (6 issues)
- #67 - Actions Workflows — catalog of workflow definitions
- #68 - Actions Workflow Runs — CI/CD execution history
- #69 - Actions Workflow Jobs — job-level CI details and steps
- #70 - Actions Concurrency Groups — workflow queue state
- #71 - Actions OIDC Customization — subject claim templates
- #72 - Actions Permissions — security posture summary

### Priority 3: Supply Chain & Security (8 issues)
- #75 - Dependency Review — diff dependencies with vulnerabilities
- #76 - SBOM Export — Software Bill of Materials in SPDX format
- #77 - Artifact Attestations — build provenance for supply chain
- #78 - Repository Security Advisories — repo-specific CVEs
- #79 - Rule Suites — rule evaluation results and compliance
- #96 - Dependabot Alerts — dependency vulnerability alerts
- #123 - Code Scanning Alerts — SAST findings from CodeQL/SARIF
- #125 - Secret Scanning Alerts — exposed secrets and tokens

### Priority 4: Stats & Notifications (11 issues)
- #52 - Add languages and contributors summaries
- #80 - Contributors — repository contributor list *(duplicate of #83)*
- #82 - Languages — repository language breakdown (bytes) *(duplicate of #52)*
- #83 - Contributor Stats — detailed weekly activity metrics
- #84 - Notifications — user notification inbox
- #85 - Pages Builds — GitHub Pages deployment history
- #93 - Traffic Stats — views, clones, paths, referrers
- #131 - Add stargazers sync support *(closes via PR #130)*
- #132 - Add watchers/subscribers sync support *(closes via PR #130)*
- #133 - Add forks list sync support *(closes via PR #130)*
- #135 - Add traffic statistics sync support *(closes via PR #130, duplicate of #93)*
- #136 - Add contributors statistics sync support *(closes via PR #130, duplicate of #83)*

### Priority 5: Advanced Metadata (10 issues)
- #5 - Releases: Sync release history to releases/
- #86 - Autolinks — external resource reference config (JIRA, Zendesk)
- #87 - Custom Properties — org-assigned repository metadata
- #88 - Immutable Releases Flag — release policy indicator
- #89 - Private Vulnerability Reporting Flag — security policy indicator
- #90 - Packages — published packages from repository
- #94 - Releases — release history and notes
- #95 - Rulesets — repository and org rule definitions
- #97 - Community Profile — repository health metrics
- #124 - Tags — git tag list with commit SHAs
- #126 - Branches — repository branch list

### Priority 6: GraphQL Extensions (5 issues)
- #27 - Projects v2: Add project status for issues/PRs
- #37 - Sync GitHub Merge Queue entries
- #65 - Add GraphQL statusCheckRollup for comprehensive check status
- #91 - MergeQueue (GraphQL) — queue entries and position
- #92 - ProjectV2 (GraphQL) — full project sync with items and fields
- #102 - Add Merge Queue sync

### Priority 7: PR Intelligence (2 issues)
- #63 - Add PR compare data (ahead/behind commits, merge-base)
- #64 - Add stacked PR relationship tracking

### Enhanced Metadata (2 issues)
- #6 - Enhanced Metadata: meta.json with topics, features, and counts
- #7 - Enhanced Metadata: Separate labels.json and milestones.json

## Related PRs

### Implementing Coverage
- #47 - feat: Add GitHub Projects v2 sync support
- #48 - feat: add GitHub API endpoints for activity, codeowners errors, languages, and contributors
- #51 - feat: dependency intelligence - SBOM, dependency review, and attestations
- #54 - feat: add people and collaborators lane
- #61 - feat: agent ergonomics leftovers - activity, hints, deployments
- #62 - feat: implement GitHub Issues graph APIs (dependencies, sub-issues, field values, issue types)
- #66 - feat: Add CI failure digests for failed PR checks
- #73 - feat: Add PR compare, stacked PRs, and statusCheckRollup
- #74 - feat: mirror GitHub constitution to .ghfs/constitution
- #98 - feat: Actions catalog + rule suites + pages + autolinks
- #105 - feat: implement full GitHub metadata sync surfaces
- #113 - feat: Add comprehensive security coverage snapshot
- #116 - feat: add extended GitHub metadata sync (full coverage batch)
- #117 - feat: add git database support with refs, commits, and trees
- #119 - feat: add full coverage for billing, packages, codespaces, and security alerts
- #122 - feat: Full timeline coverage with deep data files
- #127 - feat: add full coverage for GitHub Apps, installations, OIDC, rules, and security
- #129 - feat: add comprehensive GitHub people, collaboration, rules, and stats coverage
- #130 - feat: add full coverage for stargazers, watchers, forks, traffic, and contributors
- #134 - docs: FULL COVERAGE - API surface map + INDEX + config megatoggles
- #138 - feat: Add comprehensive GraphQL-only and deep GraphQL coverage

### Design/Planning
- #104 - [Epic] API surface map — REST 2026-03-10 + GraphQL research + 35 child issues

## Status Summary

**Total Child Issues**: ~60  
**Duplicates Identified**: 5 (#80, #82, #135, #136 duplicates)  
**Will Close via PR**: 5 (#131, #132, #133, #135, #136 via PR #130)  
**Active PRs**: 20+

## Superseded Issues

Epic #45 supersedes these older issues with comprehensive coverage:
- #8 - Add PR review state intelligence
- #9 - Add PR CI/check status intelligence
- #10 - Add PR merge gate status intelligence
- #11 - Add PR file list and diff intelligence
