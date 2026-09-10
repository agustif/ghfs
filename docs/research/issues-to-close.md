# Issues to Close (Implemented in PRs)

This document lists all issues that are already implemented in open PRs and can be closed once those PRs are merged.

**Instructions:** User should manually close these issues and add the 'gap' label to the new issues created.

---

## New Gap Issues Created

These issues were created to fill identified gaps:

- **#123** - Code Scanning Alerts — SAST findings from CodeQL/SARIF (needs 'gap' label)
- **#124** - Tags — git tag list with commit SHAs (needs 'gap' label)
- **#125** - Secret Scanning Alerts — exposed secrets and tokens (needs 'gap' label)
- **#126** - Branches — repository branch list (needs 'gap' label)

**Action:** Add 'gap' label to issues #123, #124, #125, #126

---

## Issues Implemented in PR #51 (Dependency Intelligence)

Close after PR #51 is merged:

- **#75** - Dependency Review — diff dependencies with vulnerabilities
- **#76** - SBOM Export — Software Bill of Materials in SPDX format
- **#77** - Artifact Attestations — build provenance for supply chain
- **#96** - Dependabot Alerts — dependency vulnerability alerts

---

## Issues Implemented in PR #48 (GitHub API Endpoints)

Close after PR #48 is merged:

- **#39** - activity.md - last N repository events
- **#46** - Repository Activity API — push/force_push/branch_*/pr_merge/merge_queue_merge
- **#49** - Add repository activity tracking (duplicate of #39, #46)
- **#50** - Add CODEOWNERS validation errors endpoint
- **#52** - Add languages and contributors summaries
- **#53** - Pin GitHub API version to 2026-03-10
- **#59** - CODEOWNERS Errors endpoint — syntax validation (duplicate of #50)
- **#80** - Contributors — repository contributor list (duplicate of #52)
- **#82** - Languages — repository language breakdown (bytes) (duplicate of #52)

---

## Issues Implemented in PR #47 (Projects v2)

Close after PR #47 is merged:

- **#27** - Projects v2: Add project status for issues/PRs
- **#92** - ProjectV2 (GraphQL) — full project sync with items and fields

---

## Issues Implemented in PR #44 (Merge Queue)

Close after PR #44 is merged:

- **#37** - Sync GitHub Merge Queue entries
- **#91** - MergeQueue (GraphQL) — queue entries and position
- **#102** - Add Merge Queue sync

---

## Issues Implemented in PR #3 (Wiki & Discussions)

Close after PR #3 is merged:

- **#100** - Add Wiki sync
- **#101** - Add Discussions sync

---

## Issues Implemented in PR #19 (Agent Ergonomics)

Close after PR #19 is merged:

- **#18** - Security summaries under security/
- **#78** - Repository Security Advisories — repo-specific CVEs
- **#29** - me.md - personal summary
- **#30** - sync-state.json - incremental sync metadata
- **#31** - Cross-reference graph (refs.json)
- **#32** - search.jsonl - fast local search index

---

## Issues Implemented in PR #43 (Context Packs)

Close after PR #43 is merged:

- **#21** - Context packs: prompt-sized bundles per issue/PR

---

## Issues Implemented in PR #2 (PR Intelligence)

Check PR #2 status and close when merged:

- **#9** - Add PR CI/check status intelligence
- **#10** - Add PR merge gate status intelligence
- **#11** - Add PR file list and diff intelligence

**Note:** #8 (PR review state) is already merged to main.

---

## Issues Implemented in PR #1 (Enhanced Repository Metadata)

Check PR #1 status and close when merged:

- **#6** - Enhanced Metadata: meta.json with topics, features, and counts
- **#16** - Enhanced Metadata: meta.json with topics, features, and counts (duplicate of #6)

---

## Duplicate Issues (Close Immediately)

These are duplicates and can be closed now:

- **#12** - Enhanced Metadata: Separate labels.json and milestones.json (duplicate of #7)
- **#15** - Releases: Sync release history to releases/ (duplicate of #5)

---

## Summary

**Total Issues to Close:** 32+ issues (after PRs merge)
**Duplicate Issues to Close:** 2+ issues (immediately)
**New Gap Issues Created:** 4 issues

**Total Reduction:** 32+ issues will be closed, 4 new issues created = net reduction of 28+ issues
