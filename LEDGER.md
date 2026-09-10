# GHFS Ledger - Issue & PR Hygiene Index

**Updated**: 2026-09-10  
**Librarian**: LEDGER LIBRARIAN agent  
**Purpose**: Single source of truth for all open issues/PRs, their relationships, duplicates, and epic tracking

---

## Summary Statistics

- **Open Issues**: 94
- **Open PRs**: 33
- **Epic Issues**: 3 (#4, #45, #99)
- **Identified Duplicates**: 8 issues
- **PRs Ready to Close Issues**: 1 (#130)
- **Alchemy Fork Issues**: 3 (#114, PR #115, PR #120, PR #137)

---

## Epic Issues (High-Level Tracking)

### Epic #4: Agent Intelligence Context Layer
**Status**: Active  
**Scope**: Foundation for agent-swarm-native ghfs
**Key Features**:
- Graph system (nodes/edges)
- Context packs (small/medium/large)
- Policy + gate DSL
- Tiered freshness (hot/warm/cold)
- Provenance tracking
- Local coordination (locks/notes)

**Related Issues**: #20, #21, #22, #23, #24, #25, #30, #31, #32, #106, #108, #109, #110, #111
**Related PRs**: #19, #42, #43, #81

---

### Epic #45: API Surface Map — REST 2026-03-10 + GraphQL
**Status**: Active  
**Scope**: Exhaustive GitHub API → ghfs gap analysis
**Priority Areas**:
1. Core Agent Intelligence (activity, dependencies, sub-issues, types, fields, CODEOWNERS, compare)
2. CI/CD & Actions (workflows, runs, jobs, concurrency, OIDC, permissions)
3. Supply Chain & Security (dependency review, SBOM, attestations, advisories, rule suites)
4. Stats & Notifications (contributors, languages, stats, notifications, pages)
5. Advanced Metadata (autolinks, custom properties, flags, packages)
6. GraphQL Extensions (merge queue, ProjectsV2, status rollup, review threads)

**Supersedes**: #8, #9, #10, #11, #17, #18, #37

**Child Issues**: 
- Activity: #39, #46, #49
- Contributors/Languages: #52, #80, #82, #83
- Stats: #93, #135, #136
- Stargazers/Watchers/Forks: #131, #132, #133
- CODEOWNERS: #50, #59
- Compare: #60
- Issue Intelligence: #55, #56, #57, #58
- Branches/Tags: #124, #126
- Actions: #67, #68, #69, #70, #71, #72
- Security: #75, #76, #77, #78, #79, #96, #123, #125
- Releases: #5, #94
- Rulesets: #95
- Community: #97
- Packages: #90
- Flags: #88, #89
- Custom Properties: #87
- Autolinks: #86
- Pages: #85
- Notifications: #84
- Projects: #27, #92
- Merge Queue: #37, #91, #102

**Related PRs**: #104, #47, #48, #51, #54, #61, #62, #66, #73, #74, #98, #105, #113, #116, #117, #119, #122, #127, #129, #130, #134, #138

---

### Epic #99: Comprehensive Agent-Oriented Filesystem Sync
**Status**: Active  
**Scope**: Transform ghfs into comprehensive GitHub→filesystem mirror
**Surfaces**:
- Wiki, Discussions, Merge Queue
- PR Intelligence (reviews, checks, files, gate)
- Repo Context (labels, milestones, releases, protection, constitution, Actions)
- Security & Deploy (Dependabot, scanning, environments)
- Agent Ergonomics (refs graph, me.md, sync-state, activity, search, hints, pinned, collaborators, traffic)

**Related Issues**: #3, #100, #101, #102, #103, #118, #121, #112

**Related PRs**: #3, #42, #98, #105

---

## Duplicate Issues (Recommended Actions)

### 1. Contributors Coverage (DUPLICATE GROUP)
- **#136**: Add contributors statistics sync support
- **#83**: Contributor Stats — detailed weekly activity metrics
- **#80**: Contributors — repository contributor list
- **#52**: Add languages and contributors summaries (partially)

**Recommendation**: Close #136, #83, #80 as duplicates of canonical issue (create new canonical or designate one). Keep #52 if it covers both contributors AND languages.

### 2. Traffic Stats Coverage (DUPLICATE GROUP)
- **#135**: Add traffic statistics sync support
- **#93**: Traffic Stats — views, clones, paths, referrers

**Recommendation**: Close #135 as duplicate of #93 OR vice versa (choose canonical).

### 3. Languages Coverage (DUPLICATE GROUP)
- **#82**: Languages — repository language breakdown (bytes)
- **#52**: Add languages and contributors summaries (partially)

**Recommendation**: If #52 covers both, close #82 as duplicate. Otherwise keep both.

### 4. Stargazers/Watchers/Forks Coverage
- **#131**: Add stargazers sync support ✅ **Will be closed by PR #130**
- **#132**: Add watchers/subscribers sync support ✅ **Will be closed by PR #130**
- **#133**: Add forks list sync support ✅ **Will be closed by PR #130**

**Recommendation**: These will auto-close when PR #130 merges.

---

## PR → Issue Mapping

### PRs That Close Issues
- **PR #130** → Closes #131, #132, #133, #135, #136 *(when merged)*
- **PR #104** → Supersedes #8, #9, #10, #11 *(when merged)*

### PRs Without Issue Links (Need Review)
Most PRs do not have explicit issue links. This suggests either:
1. Issues were not filed before work began
2. PRs are exploratory/design work
3. Issue hygiene was not maintained

**Recommended Action**: For each PR below, either:
- Link to existing issue
- Create tracking issue
- Or close PR if abandoned/superseded

**PRs Needing Issue Links**: #2, #3, #19, #42, #43, #44, #47, #48, #51, #54, #61, #62, #66, #73, #74, #81, #98, #105, #113, #115, #116, #117, #119, #120, #122, #127, #129, #134, #137, #138

---

## Alchemy Fork Issues (Separate Concern)

### Issues About Alchemy Integration
- **#114**: Apply module exploration (abandoned - belongs in alchemy fork) — **CLOSE**
- **PR #115**: Alchemy fork roadmap (docs only)
- **PR #120**: Two-way apply architecture (docs only, paused)
- **PR #137**: Design: Effect + alchemy.run integration (docs only)

**Recommendation**: 
1. Close #114 as "will not implement in ghfs core"
2. Keep PR #115, #120, #137 open if tracking fork work
3. OR create single epic "Alchemy Fork Integration" and close these as superseded

---

## Missing Coverage (Real GitHub API Gaps)

Based on Epic #45, these are REAL API surfaces not yet covered in ghfs:

### High Priority (Not Yet Filed as Issues)
None identified - all major surfaces have issues filed.

### Medium Priority (Not Yet Filed as Issues)  
None identified - coverage appears comprehensive based on existing issue set.

---

## Issues Without PRs (Open Work)

### Foundation Issues (Epic #4)
- #106: Foundation: context packs (small/medium/large) for agent consumption
- #107: Foundation: policy.json + gate DSL for merge readiness
- #108: Foundation: locks + notes (gitignored) for agent collaboration
- #109: Foundation: sync-state tiers (hot/warm/cold) + provenance metadata
- #110: Foundation: graph.jsonl nodes/edges + registration hooks
- #111: Foundation: INDEX.md as computed view (not stored state)

### Metadata & Stats
- #52: Add languages and contributors summaries
- #53: Pin GitHub API version to 2026-03-10
- #80: Contributors — repository contributor list
- #82: Languages — repository language breakdown (bytes)
- #83: Contributor Stats — detailed weekly activity metrics
- #93: Traffic Stats — views, clones, paths, referrers

### Issue Intelligence
- #55: Issue Dependencies — blocked_by / blocking relationships
- #56: Sub-issues — parent/child issue hierarchies
- #57: Issue Types — Task, Bug, Feature, custom org types
- #58: Issue Field Values — custom org-level fields

### PR Intelligence
- #63: Add PR compare data (ahead/behind commits, merge-base)
- #64: Add stacked PR relationship tracking
- #65: Add GraphQL statusCheckRollup for comprehensive check status

### Actions & CI
- #67: Actions Workflows — catalog of workflow definitions
- #68: Actions Workflow Runs — CI/CD execution history
- #69: Actions Workflow Jobs — job-level CI details and steps
- #70: Actions Concurrency Groups — workflow queue state
- #71: Actions OIDC Customization — subject claim templates
- #72: Actions Permissions — security posture summary

### Security
- #75: Dependency Review — diff dependencies with vulnerabilities
- #76: SBOM Export — Software Bill of Materials in SPDX format
- #77: Artifact Attestations — build provenance for supply chain
- #78: Repository Security Advisories — repo-specific CVEs
- #79: Rule Suites — rule evaluation results and compliance
- #96: Dependabot Alerts — dependency vulnerability alerts
- #123: Code Scanning Alerts — SAST findings from CodeQL/SARIF
- #125: Secret Scanning Alerts — exposed secrets and tokens

### Repository Metadata
- #5: Releases: Sync release history to releases/
- #6: Enhanced Metadata: meta.json with topics, features, and counts
- #7: Enhanced Metadata: Separate labels.json and milestones.json
- #85: Pages Builds — GitHub Pages deployment history
- #86: Autolinks — external resource reference config (JIRA, Zendesk)
- #87: Custom Properties — org-assigned repository metadata
- #88: Immutable Releases Flag — release policy indicator
- #89: Private Vulnerability Reporting Flag — security policy indicator
- #90: Packages — published packages from repository
- #94: Releases — release history and notes
- #95: Rulesets — repository and org rule definitions
- #97: Community Profile — repository health metrics
- #124: Tags — git tag list with commit SHAs
- #126: Branches — repository branch list

### Projects & Queues
- #27: Projects v2: Add project status for issues/PRs
- #91: MergeQueue (GraphQL) — queue entries and position
- #92: ProjectV2 (GraphQL) — full project sync with items and fields
- #102: Add Merge Queue sync

### Agent Ergonomics
- #18: Security summaries under security/
- #25: Graph system: nodes + edges for agent navigation
- #26: README Excerpt: Add repository README excerpt to meta.json
- #28: Pinned Issues: Sync pinned issues list
- #29: me.md - personal summary
- #32: search.jsonl - fast local search index
- #33: Add tiering for PR intelligence (hot/warm/cold)
- #34: Feed context-pack inputs from PR intelligence
- #35: Align gate.json with foundation policy DSL
- #36: Add graph edges for PR intelligence (review_requested, approved, checks, references)
- #39: activity.md - last N repository events
- #40: deployments/ - environment and deployment status
- #41: agent-hints.md - detect test/lint/build commands

### Configuration & Features
- #103: Add comprehensive sync config toggles + INDEX.md generation
- #112: test: Add tests for metadata sync surfaces
- #118: feat: UI display for metadata surfaces in ghfs ui and ghfs hub
- #121: perf: Consider incremental updates for frequently-changing metadata

### Other
- #50: Add CODEOWNERS validation errors endpoint
- #59: CODEOWNERS Errors endpoint — syntax validation
- #60: Compare API — ahead/behind branch status
- #84: Notifications — user notification inbox
- #100: Add Wiki sync
- #101: Add Discussions sync

---

## Stale/Old Issues (Needs Review)

These are lower issue numbers that may be superseded:

- #5, #6, #7: Enhanced metadata (no PR yet, but may overlap with Epic #45)
- #8, #9, #10, #11: PR intelligence (superseded by Epic #45 per PR #104)

---

## Actions Required

### Immediate Actions
1. ✅ Create this LEDGER.md
2. 🔄 Close duplicates:
   - Close #135 as duplicate of #93 (or vice versa)
   - Close #136, #83 as duplicates of #80 (or consolidate)
   - Close #82 as duplicate of #52 if #52 covers languages
3. 🔄 Close #114 as "wontfix - belongs in alchemy fork"
4. 🔄 When PR #130 merges, auto-close #131, #132, #133, #135, #136
5. 🔄 Update Epic #45 body with complete child issue list
6. 🔄 Update Epic #99 body with complete child issue list
7. 🔄 Update Epic #4 body with complete child issue list

### Medium-Term Actions
1. Review all PRs without issue links and either:
   - Link to existing issues
   - Create tracking issues
   - Close if abandoned
2. Create "Alchemy Fork Integration" epic if needed
3. Consider consolidating Epic #45 and Epic #99 (significant overlap)

### Long-Term Maintenance
1. Keep this LEDGER.md updated weekly
2. Enforce issue-before-PR workflow
3. Tag duplicates immediately when filed
4. Maintain epic issue bodies with child lists

---

## Notes

- No plaintext secrets in repo (confirmed)
- All API surfaces mentioned are legitimate GitHub API endpoints
- Focus on observe path (read-only sync), alchemy fork handles apply path
- Effect v4 RC migration is user priority
