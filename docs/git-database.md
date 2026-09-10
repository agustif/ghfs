# Git Database Support

`ghfs` now syncs Git repository data alongside issues and PRs, providing offline access to refs, commits, and trees.

## What Gets Synced

When you run `ghfs sync`, the following Git data is automatically fetched and stored:

### 1. Refs (Branches & Tags)

- **Location**: `.ghfs/git/refs.json`
- **Content**: All repository refs (branches, tags, pull refs)
- **Format**:
  ```json
  {
    "refs": [
      {
        "ref": "refs/heads/main",
        "sha": "abc123def456...",
        "url": "https://api.github.com/repos/owner/repo/git/refs/heads/main"
      },
      {
        "ref": "refs/tags/v1.0.0",
        "sha": "def456abc123...",
        "url": "https://api.github.com/repos/owner/repo/git/refs/tags/v1.0.0"
      }
    ]
  }
  ```

### 2. Recent Commits

- **Location**: `.ghfs/git/commits/*.json`
- **Content**: Recent 100 commits from the default branch
- **Format**: One file per commit, named by short SHA (e.g., `abc1234.json`)

  ```json
  {
    "sha": "abc123def456...",
    "message": "feat: add feature",
    "author": {
      "name": "John Doe",
      "email": "john@example.com",
      "date": "2026-01-01T00:00:00Z"
    },
    "committer": {
      "name": "John Doe",
      "email": "john@example.com",
      "date": "2026-01-01T00:00:00Z"
    },
    "tree_sha": "tree123abc456...",
    "parent_shas": ["parent123abc..."],
    "url": "https://api.github.com/repos/owner/repo/git/commits/abc123...",
    "html_url": "https://github.com/owner/repo/commit/abc123..."
  }
  ```

### 3. Repository Tree (HEAD)

- **Location**: `.ghfs/git/trees/HEAD.json`
- **Content**: Recursive listing of all files in the default branch HEAD
- **Format**:
  ```json
  {
    "sha": "tree123...",
    "url": "...",
    "paths": [
      {
        "path": "src/index.ts",
        "mode": "100644",
        "type": "blob",
        "sha": "blob123...",
        "size": 1234,
        "url": "..."
      },
      {
        "path": "src/lib",
        "mode": "040000",
        "type": "tree",
        "sha": "subtree123...",
        "url": "..."
      }
    ],
    "truncated": false
  }
  ```

### 4. PR Comparisons

- **Location**: Included in commit files
- **Content**: Commits unique to each open PR's head vs base
- **Purpose**: Shows what commits would be merged if the PR is accepted

## Use Cases

### Browse Repository Structure

```bash
# View all branches and tags
cat .ghfs/git/refs.json | jq '.refs[] | select(.ref | startswith("refs/heads/"))'

# List all files in HEAD
cat .ghfs/git/trees/HEAD.json | jq '.paths[] | select(.type == "blob") | .path'

# Find large files
cat .ghfs/git/trees/HEAD.json | jq '.paths[] | select(.size > 1000000)'
```

### Analyze Recent History

```bash
# View recent commit messages
ls .ghfs/git/commits/*.json | xargs -I {} jq -r '.message' {}

# Find commits by author
ls .ghfs/git/commits/*.json | xargs -I {} jq -r 'select(.author.name == "John Doe") | .message' {}

# Extract commit dates
ls .ghfs/git/commits/*.json | xargs -I {} jq -r '.author.date' {}
```

### Agent Integration

Agents can use the synced Git data to:

- Understand the repository structure without cloning
- Review recent changes and their context
- Check what files exist at specific paths
- Compare PR branches against base
- Analyze commit patterns and authorship
- Navigate the codebase tree programmatically

## API Coverage

The Git Data API integration provides:

- **Refs**: `GET /repos/{owner}/{repo}/git/refs` (all branches, tags, PRs)
- **Commits**: `GET /repos/{owner}/{repo}/commits` (recent 100 from default branch)
- **Trees**: `GET /repos/{owner}/{repo}/git/trees/{sha}` (recursive tree for HEAD)
- **Compare**: `GET /repos/{owner}/{repo}/compare/{base}...{head}` (for each open PR)

### Optional: Blob Content

For small text files (under 100KB), you can also fetch blob content:

```typescript
import { Buffer } from 'node:buffer'

// Not currently auto-synced, but available via provider:
const blob = await provider.fetchGitBlob(sha)
console.log(Buffer.from(blob.content, 'base64').toString('utf-8'))
```

## Performance Notes

- **Refs**: Single API call (paginated)
- **Commits**: Single API call (paginated, limited to 100)
- **Tree**: Single API call with `recursive=1` flag
- **PR Comparisons**: One API call per open PR

The Git sync adds minimal overhead to the existing sync process, as it runs in parallel with repository metadata fetching.

## Storage

Git data is stored under `.ghfs/git/`:

```
.ghfs/
  git/
    refs.json           # All refs
    summary.json        # Sync summary
    commits/
      abc1234.json      # Commit by short SHA
      def5678.json
      ...
    trees/
      HEAD.json         # Default branch HEAD tree
```

Total storage typically ranges from:
- **Small repos** (~10 files): ~50KB
- **Medium repos** (~500 files): ~500KB
- **Large repos** (~5000 files): ~5MB

## GitHub API Docs

- [Git Data API Overview](https://docs.github.com/en/rest/git)
- [Get a reference](https://docs.github.com/en/rest/git/refs#get-a-reference)
- [List commits](https://docs.github.com/en/rest/commits/commits#list-commits)
- [Get a tree](https://docs.github.com/en/rest/git/trees#get-a-tree)
- [Compare commits](https://docs.github.com/en/rest/commits/commits#compare-two-commits)
