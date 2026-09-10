# Issue Audit Report

Analysis of existing GitHub issues mapped to implementation status.

---

## Issues Implemented in PRs (Can be Closed)

These issues are already implemented in open PRs and can be closed once the PRs are merged:

### PR #51 - Dependency Intelligence
- **#75** - Dependency Review — diff dependencies with vulnerabilities ✅ Implemented
- **#76** - SBOM Export — Software Bill of Materials in SPDX format ✅ Implemented
- **#77** - Artifact Attestations — build provenance for supply chain ✅ Implemented
- **#96** - Dependabot Alerts — dependency vulnerability alerts ✅ Implemented

### PR #48 - GitHub API Endpoints
- **#39** - activity.md - last N repository events ✅ Implemented
- **#46** - Repository Activity API — push/force_push/branch_*/pr_merge/merge_queue_merge ✅ Implemented
- **#49** - Add repository activity tracking ✅ Implemented (duplicate of #39, #46)
- **#50** - Add CODEOWNERS validation errors endpoint ✅ Implemented
- **#52** - Add languages and contributors summaries ✅ Implemented
- **#53** - Pin GitHub API version to 2026-03-10 ✅ Implemented
- **#59** - CODEOWNERS Errors endpoint — syntax validation ✅ Implemented (duplicate of #50)
- **#80** - Contributors — repository contributor list ✅ Implemented (duplicate of #52)
- **#82** - Languages — repository language breakdown (bytes) ✅ Implemented (duplicate of #52)

### PR #47 - Projects v2
- **#27** - Projects v2: Add project status for issues/PRs ✅ Implemented
- **#92** - ProjectV2 (GraphQL) — full project sync with items and fields ✅ Implemented

### PR #44 - Merge Queue
- **#37** - Sync GitHub Merge Queue entries ✅ Implemented
- **#91** - MergeQueue (GraphQL) — queue entries and position ✅ Implemented
- **#102** - Add Merge Queue sync ✅ Implemented

### PR #3 - Wiki & Discussions
- **#100** - Add Wiki sync ✅ Implemented
- **#101** - Add Discussions sync ✅ Implemented

### PR #19 - Agent Ergonomics
- **#18** - Security summaries under security/ ✅ Implemented
- **#78** - Repository Security Advisories — repo-specific CVEs ✅ Implemented
- **#29** - me.md - personal summary ✅ Implemented
- **#30** - sync-state.json - incremental sync metadata ✅ Implemented
- **#31** - Cross-reference graph (refs.json) ✅ Implemented
- **#32** - search.jsonl - fast local search index ✅ Implemented

### PR #43 - Context Packs
- **#21** - Context packs: prompt-sized bundles per issue/PR ✅ Implemented

### PR #2 - PR Intelligence
- **#8** - Add PR review state intelligence ✅ Already in main (merged)
- **#9** - Add PR CI/check status intelligence 🚧 In PR #2
- **#10** - Add PR merge gate status intelligence 🚧 In PR #2
- **#11** - Add PR file list and diff intelligence 🚧 In PR #2

### PR #1 - Enhanced Repository Metadata
- **#6** - Enhanced Metadata: meta.json with topics, features, and counts 🚧 In PR #1
- **#16** - Enhanced Metadata: meta.json with topics, features, and counts 🚧 In PR #1 (duplicate of #6)

---

## Duplicate Issues (Can be Closed)

These issues are duplicates of other issues:

- **#12** - Enhanced Metadata: Separate labels.json and milestones.json (duplicate of #7)
- **#15** - Releases: Sync release history to releases/ (duplicate of #5)
- **#39** - activity.md - last N repository events (duplicate of #46, #49)
- **#49** - Add repository activity tracking (duplicate of #39, #46)
- **#52** - Add languages and contributors summaries (parent of #80, #82)
- **#59** - CODEOWNERS Errors endpoint — syntax validation (duplicate of #50)
- **#80** - Contributors — repository contributor list (duplicate of #52)
- **#82** - Languages — repository language breakdown (bytes) (duplicate of #52)

---

## Open Gaps (New Issues Needed)

These are missing features that need new issues with 'gap' label:

### Missing Sync Surfaces

1. **Repository README excerpt** - #26 already exists
2. **Repository topics** - #6, #16 already exist (in PR #1)
3. **Pinned issues** - #28 already exists
4. **Releases** - #5, #15 already exist
5. **Tags** - No issue yet ❌ **NEW ISSUE NEEDED**
6. **Actions workflows** - #67 already exists
7. **Actions workflow runs** - #68 already exists
8. **Actions workflow jobs** - #69 already exists
9. **Actions concurrency groups** - #70 already exists
10. **Actions OIDC customization** - #71 already exists
11. **Actions permissions** - #72 already exists
12. **Branches list** - No issue yet ❌ **NEW ISSUE NEEDED**
13. **Branch protection** - #14 already exists
14. **Rulesets** - #95 already exists (duplicate of #14)
15. **Rule suites** - #79 already exists
16. **Governance files (constitution/)** - #13 already exists
17. **Deployments** - #40 already exists
18. **Pages builds** - #85 already exists
19. **Traffic stats** - #93 already exists
20. **Packages** - #90 already exists
21. **Community profile** - #97 already exists
22. **Autolinks** - #86 already exists
23. **Custom properties** - #87 already exists
24. **Immutable releases flag** - #88 already exists
25. **Private vulnerability reporting flag** - #89 already exists
26. **Notifications** - #84 already exists

### Missing Security Features

1. **Secret scanning alerts** - No issue yet ❌ **NEW ISSUE NEEDED**
2. **Code scanning alerts** - No issue yet ❌ **NEW ISSUE NEEDED**
3. **Dependency graph summary** - Already in PR #51 ✅

### Missing PR Intelligence

1. **PR files** - #11 already exists (in PR #2)
2. **PR checks** - #9 already exists (in PR #2)
3. **PR gate** - #10 already exists (in PR #2)
4. **PR compare data (ahead/behind)** - #63 already exists
5. **Stacked PR relationships** - #64 already exists
6. **GraphQL statusCheckRollup** - #65 already exists

### Missing Issue Intelligence

1. **Issue dependencies (blocked_by / blocking)** - #55 already exists
2. **Sub-issues (parent/child)** - #56 already exists
3. **Issue types (Task, Bug, Feature)** - #57 already exists
4. **Issue field values (custom fields)** - #58 already exists

### Missing Enhanced Metadata

1. **Separate labels.json** - #7, #12 already exist
2. **Separate milestones.json** - #7, #12 already exist
3. **Contributor stats (weekly activity)** - #83 already exists

### Missing Branch Intelligence

1. **Compare API (ahead/behind)** - #60 already exists

### Missing Agent Intelligence

1. **Agent hints (test/lint/build commands)** - #41 already exists
2. **Graph system (nodes + edges)** - #25 already exists
3. **Graph edges for PR intelligence** - #36 already exists
4. **Tiered freshness (hot/warm/cold)** - #24, #33 already exist
5. **Provenance tracking** - #23 already exists
6. **Local coordination (locks + notes)** - #22 already exists
7. **Policy + gate DSL** - #20, #35 already exist
8. **Context pack inputs from PR intelligence** - #34 already exists

---

## New Issues to File

### 1. Secret Scanning Alerts
- **Title:** Secret Scanning Alerts — exposed secrets and tokens
- **Label:** gap, security
- **Description:** Sync secret scanning alerts to `.ghfs/security/secret-scanning.json`
- **API:** `GET /repos/{owner}/{repo}/secret-scanning/alerts`
- **Config:** `extended.secretScanning`
- **Permissions:** 🔒 Requires GitHub Advanced Security + secret scanning

### 2. Code Scanning Alerts
- **Title:** Code Scanning Alerts — SAST findings from CodeQL/SARIF
- **Label:** gap, security
- **Description:** Sync code scanning alerts to `.ghfs/security/code-scanning.json`
- **API:** `GET /repos/{owner}/{repo}/code-scanning/alerts`
- **Config:** `extended.codeScanning`
- **Permissions:** 🔒 Requires GitHub Advanced Security + code scanning

### 3. Tags List
- **Title:** Tags — git tag list with commit SHAs
- **Label:** gap, sync
- **Description:** Sync git tags to `.ghfs/tags/tags.json`
- **API:** `GET /repos/{owner}/{repo}/tags`
- **Config:** `sync.tags`

### 4. Branches List
- **Title:** Branches — repository branch list
- **Label:** gap, sync
- **Description:** Sync branch list to `.ghfs/branches/branches.json`
- **API:** `GET /repos/{owner}/{repo}/branches`
- **Config:** `sync.branches`

### 5. Comprehensive Config Schema Documentation
- **Title:** Document all config toggles in single reference (sync.* and extended.*)
- **Label:** documentation, gap
- **Description:** This PR adds comprehensive documentation for all config toggles
- **Related to:** #103

---

## Summary

**Can be Closed (Implemented in PRs):** 32 issues
**Duplicates (Can be Closed):** 8 issues
**New Issues Needed:** 4 issues (secret-scanning, code-scanning, tags, branches)
**Existing Gaps with Issues:** 40+ issues
**Total Open Issues:** 64

---

## Actions Needed

1. ✅ Close issues implemented in PRs after PRs are merged
2. ✅ Close duplicate issues
3. ✅ File 4 new gap issues
4. ✅ Update issue #103 (this PR addresses it)
5. ✅ Add 'gap' label to all missing feature issues
