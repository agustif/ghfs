# GitHub API Surface Map — REST 2026-03-10 + GraphQL

**Status:** Draft  
**Version:** 2026-03-10  
**Last Updated:** 2026-09-10

## Executive Summary

This document provides an exhaustive mapping of the GitHub API surface area (REST API version 2026-03-10 and GraphQL) against the current `ghfs` implementation. It identifies gaps for agent-useful features and proposes sync tiering strategies (hot/warm/cold) based on update frequency and value for offline agent workflows.

### Key Findings

- **Currently Synced:** Issues, Pull Requests (basic), Comments, Timeline Events, Repository Metadata, Labels, Milestones
- **High-Priority Gaps:** Repository Activity API, Issue Dependencies/Sub-issues/Types/Fields, CODEOWNERS Errors, Compare API, Contributors/Stats, SBOM/Dependency Review, Artifact Attestations, Rule Suites, Actions Workflows/Jobs/Permissions, Notifications, ProjectV2
- **Medium-Priority Gaps:** Pages Builds, Packages, Security Advisories, Autolinks, Custom Properties, Community Metrics, Traffic Stats
- **GraphQL-Only:** MergeQueue (queue entries), DiscussionCategories, ProjectV2 (full), StatusCheckRollup, ReviewThreads, Wiki pages strategy

### Required Headers

All REST API calls should use:
```
X-GitHub-Api-Version: 2026-03-10
Accept: application/vnd.github+json
Authorization: Bearer <token>
```

---

## API Surface Matrix

| Surface | REST Path / GraphQL Type | In ghfs? | Priority | Sync Tier | Notes |
|---------|-------------------------|----------|----------|-----------|-------|
| **Repository Core** |
| Repository metadata | `GET /repos/{owner}/{repo}` | ✅ Yes | ✓ | Hot | Enhanced with `merge_queue_enabled` via GraphQL |
| Repository labels | `GET /repos/{owner}/{repo}/labels` | ✅ Yes | ✓ | Warm | |
| Repository milestones | `GET /repos/{owner}/{repo}/milestones` | ✅ Yes | ✓ | Warm | |
| Repository activity | `GET /repos/{owner}/{repo}/activity` | ❌ **No** | **HIGH** | **Hot** | **Push, force_push, branch_*, pr_merge, merge_queue_merge events** |
| Repository topics | `GET /repos/{owner}/{repo}/topics` | ❌ No | Medium | Cold | Useful for classification |
| Repository tags | `GET /repos/{owner}/{repo}/tags` | ❌ No | Medium | Warm | Release tagging context |
| Repository teams | `GET /repos/{owner}/{repo}/teams` | ❌ No | Low | Cold | |
| Immutable releases flag | `GET /repos/{owner}/{repo}/immutable-releases` | ❌ **No** | **HIGH** | Cold | **Release policy flag** |
| Private vulnerability reporting flag | `GET /repos/{owner}/{repo}/private-vulnerability-reporting` | ❌ **No** | **HIGH** | Cold | **Security policy flag** |
| Dependabot security updates | `GET /repos/{owner}/{repo}/automated-security-fixes` | ❌ No | Medium | Cold | |
| **Issues & Pull Requests (Core)** |
| List issues/PRs | `GET /repos/{owner}/{repo}/issues` | ✅ Yes | ✓ | Hot | |
| Get issue/PR | `GET /repos/{owner}/{repo}/issues/{number}` | ✅ Yes | ✓ | Hot | |
| Issue comments | `GET /repos/{owner}/{repo}/issues/{number}/comments` | ✅ Yes | ✓ | Hot | |
| Timeline events | `GET /repos/{owner}/{repo}/issues/{number}/timeline` | ✅ Yes | ✓ | Hot | |
| PR metadata | `GET /repos/{owner}/{repo}/pulls/{number}` | ✅ Yes | ✓ | Hot | |
| PR patch | `GET /repos/{owner}/{repo}/pulls/{number}` (Accept: patch) | ✅ Yes | ✓ | Hot | |
| PR commits | `GET /repos/{owner}/{repo}/pulls/{number}/commits` | ✅ Yes | ✓ | Hot | |
| PR review comments | `GET /repos/{owner}/{repo}/pulls/{number}/comments` | ✅ Yes | ✓ | Hot | |
| **Issues — Advanced Features** |
| Issue dependencies | `GET /repos/{owner}/{repo}/issues/{number}` → `issue_dependencies_summary` | ❌ **No** | **HIGH** | **Hot** | **`blocked_by`, `blocking`, `total_blocked_by`, `total_blocking`** |
| Add issue dependency | `POST /repos/{owner}/{repo}/issues/{number}/dependencies/blocked_by` | ❌ **No** | **HIGH** | N/A | Execute only |
| Remove issue dependency | `DELETE /repos/{owner}/{repo}/issues/{number}/dependencies/blocked_by/{dependency_number}` | ❌ **No** | **HIGH** | N/A | Execute only |
| Sub-issues list | `GET /repos/{owner}/{repo}/issues/{number}/sub_issues` | ❌ **No** | **HIGH** | **Hot** | **Hierarchical issue relationships** |
| Add sub-issue | `POST /repos/{owner}/{repo}/issues/{number}/sub_issues` | ❌ **No** | **HIGH** | N/A | Execute only |
| Remove sub-issue | `DELETE /repos/{owner}/{repo}/issues/{number}/sub_issues/{sub_issue_number}` | ❌ **No** | **HIGH** | N/A | Execute only |
| Reprioritize sub-issues | `PATCH /repos/{owner}/{repo}/issues/{number}/sub_issues` | ❌ **No** | **HIGH** | N/A | Execute only |
| Parent issue URL | `issue.parent_issue_url` field | ❌ **No** | **HIGH** | **Hot** | **Present in issue response** |
| Sub-issues summary | `issue.sub_issues_summary` field | ❌ **No** | **HIGH** | **Hot** | **`total`, `completed`, `percent_completed`** |
| Issue types | `issue.type` field + `GET /orgs/{org}/issue-types` | ❌ **No** | **HIGH** | **Warm** | **Org-wide issue classification (Task, Bug, Feature, custom)** |
| Issue field values | `issue.issue_field_values` field | ❌ **No** | **HIGH** | **Hot** | **Custom fields: text, single_select, multi_select, number, date** |
| Add issue field values | `POST /repos/{owner}/{repo}/issues/{number}/issue-field-values` | ❌ **No** | **HIGH** | N/A | Execute only |
| Set issue field values | `PUT /repos/{owner}/{repo}/issues/{number}/issue-field-values` | ❌ **No** | **HIGH** | N/A | Execute only |
| Delete issue field value | `DELETE /repos/{owner}/{repo}/issues/{number}/issue-field-values/{field_id}` | ❌ **No** | **HIGH** | N/A | Execute only |
| **Pull Requests — Advanced Features** |
| Stacked PRs (base tracking) | Implicit in `pull.base.ref` | ⚠️ Partial | **HIGH** | **Hot** | **Track base branch relationships; evaluate against stack base for protection rules** |
| Review decision (GraphQL-enhanced) | GraphQL `pullRequest.reviewDecision` + `latestOpinionatedReviews` | ✅ Yes | ✓ | Hot | Already uses GraphQL fallback |
| Requested reviewers | `pull.requested_reviewers` | ✅ Yes | ✓ | Hot | |
| **Code Quality & Security** |
| CODEOWNERS errors | `GET /repos/{owner}/{repo}/codeowners/errors` | ❌ **No** | **HIGH** | **Warm** | **Syntax errors in CODEOWNERS file with line/column/message** |
| Compare API (ahead/behind) | `GET /repos/{owner}/{repo}/compare/{basehead}` | ❌ **No** | **HIGH** | **Hot** | **`status`, `ahead_by`, `behind_by`, `total_commits`, `files` diff** |
| Dependency review | `GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}` | ❌ **No** | **HIGH** | **Hot** | **Diff dependencies with vulnerability data** |
| SBOM export | `GET /repos/{owner}/{repo}/dependency-graph/sbom` | ❌ **No** | **HIGH** | **Cold** | **SPDX JSON format, snapshot of deps** |
| SBOM generate report | `GET /repos/{owner}/{repo}/dependency-graph/sbom/generate-report` | ❌ **No** | **HIGH** | N/A | Async generation |
| Artifact attestations (repo) | `GET /repos/{owner}/{repo}/attestations/{subject_digest}` | ❌ **No** | **HIGH** | **Warm** | **Build provenance for artifacts** |
| Create attestation | `POST /repos/{owner}/{repo}/attestations` | ❌ **No** | **HIGH** | N/A | Write only |
| Artifact attestations (user) | `GET /users/{username}/attestations/{subject_digest}` | ❌ No | Medium | Warm | Cross-repo attestations |
| **Repository Statistics** |
| Contributors | `GET /repos/{owner}/{repo}/contributors` | ❌ **No** | **HIGH** | **Warm** | **Contributor list sorted by commits** |
| Contributor stats (detailed) | `GET /repos/{owner}/{repo}/stats/contributors` | ❌ **No** | **HIGH** | **Cold** | **Weekly activity, additions, deletions, commits** |
| Languages | `GET /repos/{owner}/{repo}/languages` | ❌ **No** | **HIGH** | **Cold** | **Bytes per language** |
| Code frequency stats | `GET /repos/{owner}/{repo}/stats/code_frequency` | ❌ No | Medium | Cold | Weekly additions/deletions |
| Commit activity stats | `GET /repos/{owner}/{repo}/stats/commit_activity` | ❌ No | Medium | Cold | Weekly commit counts |
| Participation stats | `GET /repos/{owner}/{repo}/stats/participation` | ❌ No | Medium | Cold | Owner vs all commits (52 weeks) |
| Punch card stats | `GET /repos/{owner}/{repo}/stats/punch_card` | ❌ No | Low | Cold | Hourly commit distribution |
| Traffic — views | `GET /repos/{owner}/{repo}/traffic/views` | ❌ No | Medium | Warm | Repo views (14-day window) |
| Traffic — clones | `GET /repos/{owner}/{repo}/traffic/clones` | ❌ No | Medium | Warm | Repo clones (14-day window) |
| Traffic — popular paths | `GET /repos/{owner}/{repo}/traffic/popular/paths` | ❌ No | Low | Cold | Most viewed paths |
| Traffic — referrers | `GET /repos/{owner}/{repo}/traffic/popular/referrers` | ❌ No | Low | Cold | Top referrers |
| Community profile | `GET /repos/{owner}/{repo}/community/profile` | ❌ No | Medium | Cold | Health score, files present |
| **Branch Protection & Rules** |
| Branch protection rules | `GET /repos/{owner}/{repo}/branches/{branch}/protection` | ❌ No | Medium | Warm | Protection settings |
| Rulesets (org) | `GET /orgs/{org}/rulesets` | ❌ No | Medium | Warm | Org-wide rule enforcement |
| Rulesets (repo) | `GET /repos/{owner}/{repo}/rulesets` | ❌ No | Medium | Warm | Repo-specific rulesets |
| Rule suites | `GET /repos/{owner}/{repo}/rulesets/rule-suites` | ❌ **No** | **HIGH** | **Warm** | **Rule evaluation results (vs rulesets = definitions)** |
| **GitHub Actions** |
| Workflows list | `GET /repos/{owner}/{repo}/actions/workflows` | ❌ **No** | **HIGH** | **Warm** | **Catalog of workflow files with state, path, name** |
| Workflow runs | `GET /repos/{owner}/{repo}/actions/runs` | ❌ **No** | **HIGH** | **Hot** | **Recent CI/CD runs** |
| Workflow run | `GET /repos/{owner}/{repo}/actions/runs/{run_id}` | ❌ **No** | **HIGH** | **Hot** | Run details, status, conclusion |
| Workflow jobs | `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs` | ❌ **No** | **HIGH** | **Hot** | **Jobs per run, with steps, logs** |
| Concurrency groups (repo) | `GET /repos/{owner}/{repo}/actions/concurrency_groups/{group_name}` | ❌ **No** | **HIGH** | **Hot** | **Queue state for concurrency groups** |
| Concurrency groups (workflow run) | `GET /repos/{owner}/{repo}/actions/runs/{run_id}/concurrency_groups` | ❌ **No** | **HIGH** | **Hot** | Groups associated with a run |
| OIDC customization (repo) | `GET /repos/{owner}/{repo}/actions/oidc/customization/sub` | ❌ **No** | **HIGH** | **Cold** | **OIDC subject claim template (names only, no secrets)** |
| OIDC customization (org) | `GET /orgs/{org}/actions/oidc/customization/sub` | ❌ **No** | **HIGH** | Cold | Org-level OIDC template |
| Actions permissions (repo) | `GET /repos/{owner}/{repo}/actions/permissions` | ❌ **No** | **HIGH** | **Warm** | **Permissions summary (no secret values)** |
| Artifacts list | `GET /repos/{owner}/{repo}/actions/artifacts` | ❌ No | Medium | Warm | Workflow artifacts |
| Cache usage | `GET /repos/{owner}/{repo}/actions/cache/usage` | ❌ No | Low | Cold | Cache storage info |
| **Releases & Tags** |
| Releases list | `GET /repos/{owner}/{repo}/releases` | ❌ No | Medium | Warm | Release history |
| Release | `GET /repos/{owner}/{repo}/releases/{release_id}` | ❌ No | Medium | Warm | Release details |
| Latest release | `GET /repos/{owner}/{repo}/releases/latest` | ❌ No | Medium | Warm | Most recent release |
| **Pages & Deployments** |
| Pages site | `GET /repos/{owner}/{repo}/pages` | ❌ No | Medium | Cold | Pages config |
| Pages builds | `GET /repos/{owner}/{repo}/pages/builds` | ❌ **No** | **HIGH** | **Warm** | **Build history for Pages (status, commit, duration)** |
| Latest Pages build | `GET /repos/{owner}/{repo}/pages/builds/latest` | ❌ **No** | **HIGH** | **Warm** | Most recent Pages build |
| Deployments list | `GET /repos/{owner}/{repo}/deployments` | ❌ No | Medium | Warm | Deployment history |
| Deployment statuses | `GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses` | ❌ No | Medium | Warm | Status per deployment |
| **Packages** |
| Packages (repo) | `GET /repos/{owner}/{repo}/packages` (inferred path) | ❌ **No** | **HIGH** | **Warm** | **Packages published from repo** |
| Packages (org) | `GET /orgs/{org}/packages` | ❌ No | Medium | Warm | Org-level packages |
| Packages (user) | `GET /users/{username}/packages` | ❌ No | Medium | Warm | User-published packages |
| **Security Advisories** |
| Repository advisories | `GET /repos/{owner}/{repo}/security-advisories` | ❌ **No** | **HIGH** | **Warm** | **Repo-specific advisories** |
| Global advisories (linked) | `GET /advisories` (filter by affected repo) | ❌ **No** | **HIGH** | **Warm** | **Global GHSA advisories affecting the repo** |
| Dependabot alerts | `GET /repos/{owner}/{repo}/dependabot/alerts` | ❌ No | Medium | Warm | Dependency vulnerabilities |
| Secret scanning alerts | `GET /repos/{owner}/{repo}/secret-scanning/alerts` | ❌ No | Medium | Warm | Exposed secrets |
| Code scanning alerts | `GET /repos/{owner}/{repo}/code-scanning/alerts` | ❌ No | Medium | Warm | Static analysis findings |
| **Notifications** |
| Notifications (user) | `GET /notifications` | ❌ **No** | **HIGH** | **Hot** | **Authenticated user notifications across repos** |
| Notifications (repo-filtered) | `GET /repos/{owner}/{repo}/notifications` | ❌ **No** | **HIGH** | **Hot** | **Repo-specific notifications** |
| **Repository Config** |
| Autolinks | `GET /repos/{owner}/{repo}/autolinks` | ❌ **No** | **HIGH** | **Cold** | **External resource reference config (JIRA, Zendesk, etc.)** |
| Custom properties (repo) | `GET /repos/{owner}/{repo}/properties/values` | ❌ **No** | **HIGH** | **Warm** | **Org-assigned custom metadata** |
| Webhooks | `GET /repos/{owner}/{repo}/hooks` | ❌ No | Low | Cold | Webhook configs (no secrets) |
| **GraphQL-Only Features** |
| MergeQueue | GraphQL `repository.mergeQueue` | ❌ **No** | **HIGH** | **Hot** | **No REST endpoint for listing queue entries** |
| MergeQueue entries | GraphQL `repository.mergeQueue.entries` | ❌ **No** | **HIGH** | **Hot** | PRs in merge queue with position, state |
| Discussion categories | GraphQL `repository.discussionCategories` | ❌ No | Medium | Warm | Discussion category metadata |
| Discussions | GraphQL `repository.discussions` | ❌ No | Medium | Warm | Full discussion threads |
| ProjectV2 (full) | GraphQL `repository.projectsV2` | ❌ **No** | **HIGH** | **Warm** | **Projects V2 with items, fields, views** |
| ProjectV2 items | GraphQL `ProjectV2.items` | ❌ **No** | **HIGH** | **Warm** | Issues/PRs in project with field values |
| ProjectV2 fields | GraphQL `ProjectV2.fields` | ❌ **No** | **HIGH** | **Warm** | Field definitions (status, iteration, custom) |
| StatusCheckRollup | GraphQL `pullRequest.statusCheckRollup` | ❌ No | Medium | Hot | Combined CI check status |
| Review threads | GraphQL `pullRequest.reviewThreads` | ❌ No | Medium | Hot | Threaded review comments |
| Wiki pages (GraphQL + git clone) | No direct API; use GraphQL wiki metadata + git clone strategy | ❌ No | Low | Cold | Wiki content via git |

---

## Sync Tiering Strategy

### Hot Tier (check every sync, incremental by `updated_at`)
- Issues, PRs, comments, timeline events
- Repository activity feed
- Issue dependencies, sub-issues, types, field values
- Compare API (branch ahead/behind)
- Dependency review (PR diffs)
- Workflow runs, jobs, concurrency groups
- Notifications
- MergeQueue entries (GraphQL)

### Warm Tier (check every sync, full refresh or cached)
- Repository metadata (enhanced)
- Labels, milestones
- Contributors, languages
- CODEOWNERS errors
- Rule suites
- Workflows catalog
- Actions permissions
- Pages builds
- Rulesets
- Repository advisories
- Custom properties
- Artifact attestations
- Packages list
- ProjectV2 (GraphQL)

### Cold Tier (on-demand or infrequent refresh)
- Repository topics, tags
- Contributor stats (detailed)
- Traffic stats (14-day window)
- Community profile
- SBOM export
- Immutable releases / private vulnerability reporting flags
- OIDC customization
- Releases, deployments (historical)
- Security alerts (Dependabot, secret scanning, code scanning)
- Discussion categories, discussions

---

## Required OAuth Scopes & Permissions

### REST API Scopes
- `repo` (full access) — covers most read operations
- `read:packages` — package metadata
- `read:org` — org-level metadata
- `notifications` — notifications API
- `repo:status` — commit statuses, checks
- `read:project` — Projects V2 (via GraphQL)
- `attestations:read` — artifact attestations
- `actions:read` — Actions workflows, runs, jobs

### GraphQL Permissions
- All GraphQL queries require `repo` scope
- ProjectV2 queries require `read:project` scope
- MergeQueue queries require `repo` scope

### Fine-Grained Permissions (if using fine-grained tokens)
- `contents: read` — repository content
- `issues: read` — issues
- `pull_requests: read` — pull requests
- `metadata: read` — repository metadata
- `actions: read` — Actions data
- `packages: read` — packages
- `security_events: read` — security advisories, alerts
- `attestations: read` — artifact attestations
- `administration: read` — rulesets, branch protection (read-only)

---

## Implementation Priorities

### Phase 1: Core Agent Intelligence (Issues #TBD)
1. Repository activity feed (`GET /repos/{owner}/{repo}/activity`)
2. Issue dependencies (`issue_dependencies_summary`, POST/DELETE endpoints)
3. Sub-issues (`sub_issues_summary`, parent_issue_url, POST/DELETE/PATCH endpoints)
4. Issue types (`issue.type`, org issue types catalog)
5. Issue field values (`issue_field_values`, POST/PUT/DELETE endpoints)
6. CODEOWNERS errors (`GET /repos/{owner}/{repo}/codeowners/errors`)
7. Compare API (`GET /repos/{owner}/{repo}/compare/{basehead}`)

### Phase 2: CI/CD & Actions Context (Issues #TBD)
8. Workflows catalog (`GET /repos/{owner}/{repo}/actions/workflows`)
9. Workflow runs (`GET /repos/{owner}/{repo}/actions/runs`)
10. Workflow jobs (`GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs`)
11. Concurrency groups (`GET /repos/{owner}/{repo}/actions/concurrency_groups/{group_name}`)
12. OIDC customization (repo) (`GET /repos/{owner}/{repo}/actions/oidc/customization/sub`)
13. Actions permissions summary (`GET /repos/{owner}/{repo}/actions/permissions`)

### Phase 3: Supply Chain & Security (Issues #TBD)
14. Dependency review (`GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}`)
15. SBOM export (`GET /repos/{owner}/{repo}/dependency-graph/sbom`)
16. Artifact attestations (repo) (`GET /repos/{owner}/{repo}/attestations/{subject_digest}`)
17. Repository security advisories (`GET /repos/{owner}/{repo}/security-advisories`)
18. Global advisories (linked)
19. Rule suites (`GET /repos/{owner}/{repo}/rulesets/rule-suites`)

### Phase 4: Stats & Notifications (Issues #TBD)
20. Contributors (`GET /repos/{owner}/{repo}/contributors`)
21. Languages (`GET /repos/{owner}/{repo}/languages`)
22. Contributor stats (detailed) (`GET /repos/{owner}/{repo}/stats/contributors`)
23. Notifications (user) (`GET /notifications`)
24. Notifications (repo-filtered) (`GET /repos/{owner}/{repo}/notifications`)
25. Pages builds (`GET /repos/{owner}/{repo}/pages/builds`)

### Phase 5: Advanced Metadata (Issues #TBD)
26. Autolinks (`GET /repos/{owner}/{repo}/autolinks`)
27. Custom properties (`GET /repos/{owner}/{repo}/properties/values`)
28. Immutable releases flag (`GET /repos/{owner}/{repo}/immutable-releases`)
29. Private vulnerability reporting flag (`GET /repos/{owner}/{repo}/private-vulnerability-reporting`)
30. Packages (repo)

### Phase 6: GraphQL Extensions (Issues #TBD)
31. MergeQueue + entries (GraphQL)
32. ProjectV2 full sync (GraphQL)
33. StatusCheckRollup (GraphQL)
34. Review threads (GraphQL)

---

## Breaking Changes in 2026-03-10

From https://docs.github.com/en/rest/about-the-rest-api/breaking-changes:

### Removed Fields
- `author_association` removed from API root (`GET /`)
- Various `author` and `owner` fields have stricter nullability

### Status Code Changes
- Installation deletion: 202 (not 204)
- Rate limit: `GET /rate_limit` no longer returns `rate` property

### Response Schema Changes
- Directory content responses now list submodules
- Several timestamp fields now strictly ISO 8601

**Migration:** ghfs already uses version header; ensure `X-GitHub-Api-Version: 2026-03-10` is set on all requests.

---

## Testing Strategy

### Unit Tests
- Mock provider layer for each new endpoint
- Test parsing of new response fields
- Validate error handling for new endpoints

### Integration Tests
- Use GitHub test fixtures (snapshot tests)
- Test against live API with dedicated test repo
- Validate incremental sync for new endpoints

### E2E Tests (UI)
- Verify new fields render correctly
- Test queue operations for new execute actions
- Validate keyboard shortcuts for new features

---

## Migration Path

### For Existing ghfs Users
1. New endpoints are **additive** — existing syncs continue to work
2. Opt-in to new features via config flags (e.g., `sync.activity: true`)
3. Schema migrations handled automatically via `.sync.json` versioning

### For Agent Developers
- New context available immediately after sync
- No breaking changes to existing `.ghfs/` structure
- Enhanced frontmatter fields added (e.g., `issue_dependencies_summary`, `sub_issues_summary`)

---

## Open Questions

1. **GraphQL rate limits:** How aggressive should ProjectV2 sync be?
2. **SBOM caching:** Generate on-demand or pre-cache?
3. **Notifications filtering:** Sync all or repo-only by default?
4. **Actions log storage:** Should we mirror run logs, or just metadata?
5. **MergeQueue entries:** Poll frequency (high churn)?

---

## Related Issues

- Epic: [#TBD] — Parent epic for API surface map
- [#8] Add PR review state intelligence
- [#9] Add PR CI/check status intelligence
- [#10] Add PR merge gate status intelligence
- [#11] Add PR file list and diff intelligence
- [#17] Actions: Sync recent workflow runs to actions/
- [#18] Security summaries under security/
- [#37] Sync GitHub Merge Queue entries

---

## References

- [GitHub REST API 2026-03-10](https://docs.github.com/en/rest?apiVersion=2026-03-10)
- [Breaking Changes 2026-03-10](https://docs.github.com/en/rest/about-the-rest-api/breaking-changes)
- [GitHub GraphQL API](https://docs.github.com/en/graphql/reference/objects)
- [OpenAPI Description](https://docs.github.com/en/rest/about-the-rest-api/about-the-openapi-description-for-the-rest-api)
- Issue Sub-issues & Types: https://josh-ops.com/posts/github-sub-issues-and-issue-types/
- Stacked PRs: https://docs.github.com/en/pull-requests/reference/stacked-pull-requests

---

**END OF DOCUMENT**
