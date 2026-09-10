# Missing GitHub API Surfaces - ZERO GAPS MANDATE

**Status**: Cross-referenced against PRs #138, #139, #141, #144, #147, and merged #134  
**Last Updated**: 2026-09-10  
**Objective**: Document ONLY surfaces not covered by open/merged PRs, file issues for each gap

---

## Gap Analysis vs Open PRs

### ✅ Covered by Open PRs

**PR #138** - GraphQL-only and deep GraphQL:
- ✅ Merge queue entries (GraphQL)
- ✅ Projects V2 full (GraphQL)
- ✅ Discussions & polls (GraphQL)
- ✅ Sponsorships & FUNDING.yml
- ✅ Organization teams (GraphQL)
- ✅ CODEOWNERS parsing
- ✅ PR status check rollup (GraphQL)
- ✅ PR review threads (GraphQL)
- ✅ PR project connections (GraphQL)

**PR #139** - Actions, artifacts, webhooks:
- ✅ Actions workflow runs
- ✅ Actions job logs (failed & recent modes)
- ✅ Actions artifacts metadata
- ✅ Webhook configs (sanitized)
- ✅ Webhook deliveries

**PR #141** - Kitchen sink REST:
- ✅ Custom repository properties
- ✅ Autolink references
- ✅ Commit activity stats
- ✅ Participation stats
- ✅ Git tags
- ✅ Git refs
- ✅ Docs tree recursive
- ✅ Assignee suggestions
- ✅ Traffic data (referrers, paths, views, clones)
- ✅ Private vulnerability reporting status

**PR #144** - Releases & packages:
- ✅ Releases with assets
- ✅ Release reactions (GraphQL)
- ✅ Release by tag
- ✅ Release settings (immutable)
- ✅ Generate release notes API
- ✅ Packages (all types)
- ✅ Package versions

**PR #147** - Documentation:
- ✅ Webhooks and automation config mirror (docs only)

**Merged #134** - API surface documentation:
- ✅ Full API surface map
- ✅ Config schema documentation  
- ✅ File structure reference

---

## ❌ REMAINING GAPS (Zero Tolerance)

### P0: Critical Missing Observe Surfaces

#### 1. **PR Changed Files** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/pulls/{pull_number}/files`
- **What**: List of files changed in a PR with additions/deletions/patch
- **Why Critical**: Essential for code review context, mentioned in #134 surface map
- **Status**: NOT in any open PR
- **Action**: Implement in this PR

#### 2. **Closing Issues References (GraphQL)** ❌
- **Endpoint**: GraphQL `pullRequest.closingIssuesReferences`
- **What**: Issues that a PR will close when merged (via "Fixes #123" syntax)
- **Why Critical**: Core PR→issue linking
- **Status**: NOT in PR #138 (which covers other PR GraphQL surfaces)
- **Action**: Implement in this PR

#### 3. **Linked Pull Requests (GraphQL)** ❌
- **Endpoint**: GraphQL `issue.closedByPullRequestsReferences`
- **What**: PRs that close/reference an issue
- **Why Critical**: Core issue→PR linking
- **Status**: NOT in PR #138
- **Action**: Implement in this PR

#### 4. **Commit Statuses** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/commits/{ref}/statuses`
- **What**: Legacy commit status API (pre-checks API)
- **Why Critical**: CI/CD state visibility for older integrations
- **Status**: PR #138 covers check runs via GraphQL, but NOT legacy statuses
- **Action**: Implement in this PR

#### 5. **Check Runs** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/commits/{ref}/check-runs`
- **What**: GitHub Checks API for CI/CD
- **Why Critical**: Modern CI/CD state visibility
- **Status**: PR #138 has status check rollup (GraphQL), but NOT detailed REST check runs
- **Action**: Implement in this PR

#### 6. **Repository Topics** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/topics`
- **What**: Repository classification tags
- **Why Critical**: Repo discovery and classification
- **Status**: NOT in any PR
- **Action**: Implement in this PR

### P1: High-Value Missing Surfaces

#### 7. **Sub-Issues** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues`
- **What**: Issue hierarchy (parent-child relationships)
- **Why**: Task breakdown visibility
- **Status**: NOT in any PR
- **Action**: File issue

#### 8. **Issue Field Values** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/issues/{issue_number}/fields`
- **What**: Custom field values on issues
- **Why**: Enterprise/org custom metadata
- **Status**: NOT in any PR
- **Action**: File issue

#### 9. **Issue Dependencies** ❌
- **Endpoint**: REST issue dependencies endpoints
- **What**: Cross-issue blocking relationships
- **Why**: Project planning visibility
- **Status**: NOT in any PR
- **Action**: File issue

#### 10. **Repository Branches** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/branches`
- **What**: List all branches with commit SHAs
- **Why**: Branch awareness for repo navigation
- **Status**: NOT in any PR (PR #141 has git refs but NOT branches endpoint)
- **Action**: Implement in this PR

#### 11. **Branch Protection Rules** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/branches/{branch}/protection`
- **What**: Protection rules per branch
- **Why**: Policy visibility
- **Status**: NOT in any PR
- **Action**: File issue

#### 12. **Repository Rulesets** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/rulesets`
- **What**: Repository rulesets (newer than branch protection)
- **Why**: Modern policy visibility
- **Status**: NOT in any PR
- **Action**: File issue

#### 13. **Repository Collaborators** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/collaborators`
- **What**: Users with access to the repository
- **Why**: Access visibility
- **Status**: PR #141 has assignee suggestions, NOT full collaborators
- **Action**: Implement in this PR

#### 14. **Repository Languages** ✅ (COVERED)
- **Status**: PR #48 (not in the 6 PRs listed, but exists)
- **Action**: None

#### 15. **Repository Contributors** ✅ (COVERED)
- **Status**: PR #48
- **Action**: None

#### 16. **Repository Activity Feed** ✅ (COVERED)
- **Status**: PR #48
- **Action**: None

#### 17. **Community Profile** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/community/profile`
- **What**: Community health metrics (README, CoC, Contributing, etc.)
- **Why**: Repo health visibility
- **Status**: NOT in any PR
- **Action**: File issue

#### 18. **Stargazers** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/stargazers`
- **What**: Users who starred the repo (paginated)
- **Why**: Popularity tracking
- **Status**: NOT in any PR
- **Action**: File issue

#### 19. **Watchers** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/subscribers`
- **What**: Users watching the repo
- **Why**: Engagement tracking
- **Status**: NOT in any PR
- **Action**: File issue

#### 20. **Forks** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/forks`
- **What**: Repository fork network
- **Why**: Fork tracking
- **Status**: NOT in any PR
- **Action**: File issue

#### 21. **Deployments** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/deployments`
- **What**: Deployment history
- **Why**: Deploy tracking
- **Status**: NOT in any PR
- **Action**: File issue

#### 22. **Environments** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/environments`
- **What**: Deployment environments config
- **Why**: Environment visibility
- **Status**: NOT in any PR
- **Action**: File issue

#### 23. **Pages** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/pages`
- **What**: GitHub Pages configuration
- **Why**: Pages status
- **Status**: NOT in any PR
- **Action**: File issue

#### 24. **Minimized Comments** ❌
- **Endpoint**: GraphQL `isMinimized`, `minimizedReason` on comments
- **What**: Moderation status of comments
- **Why**: Moderation visibility
- **Status**: NOT in PR #138 (which covers other GraphQL surfaces)
- **Action**: File issue

### P2: Lower Priority Gaps

#### 25. **Secret Scanning Alerts** 🔒 ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/secret-scanning/alerts`
- **What**: Secret scanning findings
- **Why**: Security (requires specific permissions)
- **Status**: NOT in any PR
- **Action**: File issue (note: requires secret scanning enabled)

#### 26. **Code Scanning Alerts** 🔒 ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/code-scanning/alerts`
- **What**: Code scanning (SAST) findings
- **Why**: Security (requires code scanning)
- **Status**: NOT in any PR
- **Action**: File issue (note: requires code scanning enabled)

#### 27. **Detailed Reaction Users** ❌
- **Endpoint**: `GET /repos/{owner}/{repo}/issues/{number}/reactions` (with per-user detail)
- **What**: Which users reacted with which emoji
- **Why**: Nice-to-have engagement detail
- **Status**: Only totals are synced
- **Action**: File issue (P2 priority)

---

## Implementation Plan

### This PR (cursor/surface-cartographer-08f9): P0 Surfaces

Implement the 6 critical missing P0 surfaces:

1. ✅ **PR Changed Files** - Already started in this branch
2. **Closing Issues References (GraphQL)** - PR→issue links
3. **Linked Pull Requests (GraphQL)** - Issue→PR links
4. **Commit Statuses** - Legacy status API
5. **Check Runs** - Modern checks API
6. **Repository Topics** - Repo classification
7. **Repository Branches** - Branch list
8. **Repository Collaborators** - Access list

### Issues to File: P1 Surfaces

File GitHub issues for each:

1. Sub-issues (#NEW-1)
2. Issue field values (#NEW-2)
3. Issue dependencies (#NEW-3)
4. Branch protection rules (#NEW-4)
5. Repository rulesets (#NEW-5)
6. Community profile (#NEW-6)
7. Stargazers (#NEW-7)
8. Watchers (#NEW-8)
9. Forks (#NEW-9)
10. Deployments (#NEW-10)
11. Environments (#NEW-11)
12. Pages (#NEW-12)
13. Minimized comments (#NEW-13)

### Issues to File: P2 Surfaces

File with P2/nice-to-have label:

1. Secret scanning alerts (#NEW-14) 🔒
2. Code scanning alerts (#NEW-15) 🔒
3. Detailed reaction users (#NEW-16)

---

## Verification Checklist

After this PR and filed issues, verify:

- [ ] All P0 surfaces implemented or in open PR
- [ ] All P1 surfaces have filed issues
- [ ] All P2 surfaces have filed issues with P2 label
- [ ] Zero undocumented gaps in GitHub API coverage
- [ ] All new implementations follow observe-only principle
- [ ] All new implementations have proper TypeScript types
- [ ] All new implementations integrated into provider interface

---

## Notes

- **Observe-only principle**: No mutations, no apply logic
- **Permission-aware**: All endpoints gracefully handle 403/404
- **Type-safe**: Full TypeScript interfaces for all new surfaces
- **Request counting**: All new endpoints bump request counter
- **Null returns**: Unavailable data returns null, doesn't throw
