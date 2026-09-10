# Git Data API Integration Reference

## Purpose

This document catalogs GitHub Git Data API endpoints relevant to `ghfs`, establishing bounded integration patterns for refs, trees, commits, compare, and contents operations.

## Current State

`ghfs` currently uses:
- **REST Issues API** for issue/PR metadata and operations
- **REST Pulls API** for PR-specific metadata and patches
- **GraphQL API** for review decisions, merge queue status, and reactions

`ghfs` does NOT currently use:
- Git Data API (refs, trees, commits, blobs)
- Repository Contents API (for file browsing)
- Compare API (for cross-ref diffs)

## Git Data API Scope

### Refs API

**Endpoint**: `GET /repos/{owner}/{repo}/git/refs/{ref}`
**Endpoint**: `GET /repos/{owner}/{repo}/git/refs`

**Use cases**:
- Enumerate branch refs for PR head/base validation
- Fetch tag refs for release correlation
- Verify ref existence before operations

**Bounded depth**: Single ref lookup or list with `per_page` limit (100 max).

**Example**:
```typescript
// Fetch a specific ref
const ref = await octokit.rest.git.getRef({
  owner,
  repo,
  ref: 'heads/main'
})

// List all branch refs
const branches = await octokit.rest.git.listMatchingRefs({
  owner,
  repo,
  ref: 'heads/',
  per_page: 100
})
```

**Integration opportunity**: Validate PR `base_ref` / `head_ref` against actual repository refs.

---

### Trees API

**Endpoint**: `GET /repos/{owner}/{repo}/git/trees/{tree_sha}`

**Use cases**:
- List files at a specific commit for PR file enumeration
- Traverse directory structure for `.ghfs` config detection
- Bounded tree walk for file discovery

**Bounded depth**: 
- Non-recursive: single tree level
- Recursive: full tree with `?recursive=1` (use sparingly, can be large)

**Example**:
```typescript
// Fetch tree at commit
const tree = await octokit.rest.git.getTree({
  owner,
  repo,
  tree_sha: commit.tree.sha,
  recursive: '0' // or '1' for full tree
})

// tree.tree contains array of:
// { path, mode, type: 'blob' | 'tree', sha, size?, url }
```

**Integration opportunity**: 
- Discover `.github/replies.yml` for saved-replies feature
- Enumerate changed files in PR without full patch parse

---

### Commits API

**Endpoint**: `GET /repos/{owner}/{repo}/git/commits/{commit_sha}`

**Use cases**:
- Fetch commit metadata (author, committer, message, tree SHA)
- Validate commit existence for PR head SHA
- Extract commit parents for merge analysis

**Bounded depth**: Single commit lookup (no traversal).

**Example**:
```typescript
const commit = await octokit.rest.git.getCommit({
  owner,
  repo,
  commit_sha: 'abc123'
})

// commit contains:
// { sha, message, author, committer, tree, parents }
```

**Current usage**: `ghfs` already fetches PR commits via `pulls.listCommits` (REST Pulls API). Git Data API commit endpoint is lower-level and typically not needed.

---

### Compare API

**Endpoint**: `GET /repos/{owner}/{repo}/compare/{basehead}`

**Use cases**:
- Compare two refs/branches/commits to get file diff summary
- Count changed files between base and head
- Identify merge base commit

**Bounded depth**: Single comparison (no chaining).

**Example**:
```typescript
const comparison = await octokit.rest.repos.compareCommitsWithBasehead({
  owner,
  repo,
  basehead: 'main...feature-branch'
})

// comparison contains:
// { status, ahead_by, behind_by, total_commits, commits, files }
```

**Integration opportunity**: 
- Provide "changes since last sync" summary for PR view
- Detect file conflicts before merge operations

---

### Contents API

**Endpoint**: `GET /repos/{owner}/{repo}/contents/{path}`

**Use cases**:
- Fetch file contents at specific ref
- Detect `.github/replies.yml` or `ghfs.config.ts` existence
- Read small config files without cloning

**Bounded depth**: Single file or directory listing (non-recursive).

**Example**:
```typescript
// Fetch file contents
// file.content is base64-encoded
import { Buffer } from 'node:buffer'

const file = await octokit.rest.repos.getContent({
  owner,
  repo,
  path: '.github/replies.yml',
  ref: 'main'
})
const decoded = Buffer.from(file.content, 'base64').toString('utf8')

// For directory listing:
// returns array of { name, path, type: 'file' | 'dir', sha, size }
```

**Integration opportunity**: 
- Fetch `.github/replies.yml` for saved-replies without requiring local clone
- Validate `ghfs.config.ts` existence for remote project onboarding

---

## Integration Patterns

### Pattern 1: Validate PR Refs

Before executing PR operations (merge, review, edit), validate that `base_ref` and `head_ref` exist:

```typescript
async function validatePrRefs(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseRef: string,
  headRef: string
): Promise<{ baseExists: boolean, headExists: boolean }> {
  const [base, head] = await Promise.allSettled([
    octokit.rest.git.getRef({ owner, repo, ref: `heads/${baseRef}` }),
    octokit.rest.git.getRef({ owner, repo, ref: `heads/${headRef}` })
  ])

  return {
    baseExists: base.status === 'fulfilled',
    headExists: head.status === 'fulfilled'
  }
}
```

**Volume bound**: 2 requests per PR validation.

---

### Pattern 2: List Changed Files (Bounded)

Use Compare API to enumerate changed files between base and head:

```typescript
async function listChangedFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<Array<{ filename: string, status: string, additions: number, deletions: number }>> {
  const comparison = await octokit.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${base}...${head}`
  })

  return comparison.data.files?.map(f => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions
  })) ?? []
}
```

**Volume bound**: 1 request per comparison. GitHub Compare API returns up to 300 changed files; larger diffs are truncated.

---

### Pattern 3: Fetch Config File from Remote

Fetch `.github/replies.yml` or `ghfs.config.ts` without local clone:

```typescript
async function fetchRemoteConfig(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref = 'HEAD'
): Promise<string | null> {
  try {
    const result = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref
    })

    if (Array.isArray(result.data) || result.data.type !== 'file')
      return null

    const { Buffer } = await import('node:buffer')
    return Buffer.from(result.data.content, 'base64').toString('utf8')
  }
  catch {
    return null
  }
}
```

**Volume bound**: 1 request per file. Use for small config files only (<1MB).

---

### Pattern 4: Enumerate Tags

List repository tags for release correlation:

```typescript
async function listTags(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<Array<{ name: string, sha: string }>> {
  const refs = await octokit.rest.git.listMatchingRefs({
    owner,
    repo,
    ref: 'tags/',
    per_page: 100
  })

  return refs.data.map(ref => ({
    name: ref.ref.replace('refs/tags/', ''),
    sha: ref.object.sha
  }))
}
```

**Volume bound**: Paginated with 100 tags per page. For repos with thousands of tags, implement pagination or limit to recent tags.

---

### Pattern 5: Detect File Existence (Tree Walk)

Check if a file exists at a specific commit without fetching contents:

```typescript
async function fileExistsAtCommit(
  octokit: Octokit,
  owner: string,
  repo: string,
  commitSha: string,
  filePath: string
): Promise<boolean> {
  try {
    const commit = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: commitSha
    })

    const tree = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: commit.data.tree.sha,
      recursive: '1'
    })

    return tree.data.tree.some(item => item.path === filePath && item.type === 'blob')
  }
  catch {
    return false
  }
}
```

**Volume bound**: 2 requests (commit + tree). Recursive tree can be large; use sparingly.

---

## Implementation Guidelines

### 1. Volume Bounds

- **Single ref lookup**: 1 request
- **List refs** (branches/tags): 100 per page, paginate as needed
- **Tree walk** (non-recursive): 1 request per level
- **Tree walk** (recursive): 1 request, returns full tree (can be large)
- **Commit lookup**: 1 request
- **Compare**: 1 request, returns up to 300 files
- **Contents**: 1 request per file, max 1MB per file

### 2. Rate Limiting

GitHub REST API rate limits:
- **Authenticated**: 5,000 requests/hour
- **Unauthenticated**: 60 requests/hour

Git Data API requests count against the same limit as other REST API calls.

### 3. Caching

- Cache ref lookups for duration of sync/execute operation
- Cache tree walks for repeated file existence checks
- Do NOT cache across sync operations (refs change frequently)

### 4. Error Handling

- 404: Ref/commit/file does not exist (expected in validation scenarios)
- 403: Rate limit or insufficient permissions
- 422: Invalid ref format or recursive tree too large

### 5. When NOT to Use Git Data API

- **Don't** use Git Data API for issue/PR metadata (use Issues/Pulls API)
- **Don't** fetch full trees recursively for large repos (use Contents API with specific paths)
- **Don't** traverse commit history (use Commits API with pagination)
- **Don't** fetch file contents for large files (Git Data API is better for small files <1MB)

---

## Proposed Integrations for `ghfs`

### Priority 1: Validate PR Refs

Add ref validation to PR operations to fail fast if base/head ref no longer exists.

**Impact**: Prevents errors during merge/review operations.

**Volume**: +2 requests per PR operation (validate base + head ref).

---

### Priority 2: Fetch Remote Config

Allow `ghfs hub` to discover `.github/replies.yml` from remote repositories without local clone.

**Impact**: Enables remote project onboarding.

**Volume**: +1 request per project during initial scan.

---

### Priority 3: List Changed Files

Provide "changed files" summary in PR detail view using Compare API.

**Impact**: Better PR context without parsing full patch.

**Volume**: +1 request per PR when viewing details.

---

### Priority 4: Enumerate Tags

Correlate closed issues/PRs with release tags for "fixed in version" tracking.

**Impact**: Enhanced issue/PR metadata.

**Volume**: +1 request per sync (list tags once, cache for operation).

---

## Testing Strategy

1. **Unit tests**: Mock Octokit responses for each Git Data API endpoint
2. **Integration tests**: Use test repository with known refs/commits/files
3. **Volume tests**: Validate request count for each operation
4. **Error tests**: Handle 404 (missing ref), 403 (rate limit), 422 (invalid input)

---

## References

- [GitHub Git Data API Documentation](https://docs.github.com/en/rest/git)
- [GitHub Refs API](https://docs.github.com/en/rest/git/refs)
- [GitHub Trees API](https://docs.github.com/en/rest/git/trees)
- [GitHub Commits API](https://docs.github.com/en/rest/git/commits)
- [GitHub Compare API](https://docs.github.com/en/rest/commits/commits#compare-two-commits)
- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents)

---

## Maintenance

**Last updated**: 2026-09-10
**Status**: Proposed (not yet implemented)
**Owner**: GIT DB LIBRARIAN
