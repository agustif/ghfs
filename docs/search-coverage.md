# Search Coverage

The search coverage feature provides comprehensive code and repository search to help agents discover references, TODOs, and cross-repository mentions.

## Overview

Search coverage runs automatically during `ghfs sync` and saves results to `.ghfs/search/` as JSONL files for efficient agent parsing.

## Configuration

Configure search coverage in `ghfs.config.ts`:

```typescript
import type { GhfsUserConfig } from '@ghfs/cli'

export default {
  repo: 'owner/repo',
  search: {
    // Search code for TODO/FIXME comments
    codeTodos: true,

    // Search commits for "fixes #" style references
    commitRefs: true,

    // Saved issue search queries
    issueQueries: {
      'p1-bugs': 'is:issue is:open label:bug label:p1',
      'needs-triage': 'is:issue is:open no:label',
      'stale': 'is:issue is:open updated:<2024-01-01'
    },

    // Search for mentions of this repository (heavy operation)
    mentions: false,

    // Maximum results per search query
    maxResults: 100,
  },
}
```

## Output Files

All search results are saved to `.ghfs/search/` as JSONL files:

### `code-todos.jsonl`

TODO/FIXME comments found in the codebase:

```jsonl
{"type":"code","source":"code-search","timestamp":"2024-03-10T12:00:00Z","path":"src/sync/search.ts","sha":"abc123","url":"https://github.com/owner/repo/blob/main/src/sync/search.ts","fragments":["TODO: add rate limit handling"]}
```

**Fields:**
- `type`: Always `"code"`
- `source`: Always `"code-search"`
- `timestamp`: ISO 8601 timestamp of search
- `path`: File path in repository
- `sha`: Git blob SHA
- `url`: GitHub URL to file
- `fragments`: Array of matching text fragments

### `commit-refs.jsonl`

Commits containing issue/PR references (`fixes #123`, `closes #456`, etc.):

```jsonl
{"type":"commit","source":"commit-search","timestamp":"2024-03-10T12:00:00Z","sha":"def456","message":"Fix memory leak\n\nFixes #123","author":"username","date":"2024-03-09T10:00:00Z","url":"https://github.com/owner/repo/commit/def456","references":[123]}
```

**Fields:**
- `type`: Always `"commit"`
- `source`: Always `"commit-search"`
- `timestamp`: ISO 8601 timestamp of search
- `sha`: Commit SHA
- `message`: Full commit message
- `author`: GitHub username or committer name
- `date`: Commit date
- `url`: GitHub URL to commit
- `references`: Array of referenced issue/PR numbers

**Recognized patterns:**
- `fixes #123` / `fix #123` / `fixed #123`
- `closes #123` / `close #123` / `closed #123`
- `resolves #123` / `resolve #123` / `resolved #123`

### `issues-<key>.jsonl`

Results from saved issue search queries:

```jsonl
{"type":"issue","source":"issue-search:p1-bugs","timestamp":"2024-03-10T12:00:00Z","number":456,"title":"Critical bug","state":"open","url":"https://github.com/owner/repo/issues/456","labels":["bug","p1"],"author":"reporter","created":"2024-03-01T00:00:00Z","updated":"2024-03-09T00:00:00Z"}
```

**Fields:**
- `type`: Always `"issue"`
- `source`: `"issue-search:<query-key>"`
- `timestamp`: ISO 8601 timestamp of search
- `number`: Issue/PR number
- `title`: Issue/PR title
- `state`: `"open"` or `"closed"`
- `url`: GitHub URL
- `labels`: Array of label names
- `author`: GitHub username or `null`
- `created`: Creation timestamp
- `updated`: Last update timestamp

### `repo-mentions.jsonl`

Issues/PRs that mention this repository (when `mentions: true`):

```jsonl
{"type":"issue","source":"mention-search","timestamp":"2024-03-10T12:00:00Z","number":789,"title":"Related to owner/repo","state":"open","url":"https://github.com/other/repo/issues/789","labels":[],"author":"someone","created":"2024-03-05T00:00:00Z","updated":"2024-03-08T00:00:00Z"}
```

Same fields as saved issue queries, but `source` is `"mention-search"`.

## Rate Limiting

Search operations are rate-limited by GitHub's Search API:

- **Code search**: 30 requests/minute (authenticated)
- **Commit search**: 30 requests/minute (authenticated)
- **Issue search**: 30 requests/minute (authenticated)

The search coverage implementation:

1. Respects `maxResults` to cap result counts
2. Catches 403 rate limit errors gracefully
3. Logs warnings and continues with empty results
4. Does not fail the entire sync on search errors

## Agent Usage

### Parse JSONL

```bash
# Find all TODOs in TypeScript files
grep '"path":".*\.ts"' .ghfs/search/code-todos.jsonl

# Extract issue references from commits
jq -r '.references[]' .ghfs/search/commit-refs.jsonl | sort -u

# Count P1 bugs
wc -l < .ghfs/search/issues-p1-bugs.jsonl
```

### Query with jq

```bash
# Find oldest unresolved TODOs
jq -s 'sort_by(.timestamp) | .[0]' .ghfs/search/code-todos.jsonl

# List all referenced issues
jq -r '.references[]' .ghfs/search/commit-refs.jsonl | sort -un

# Find issues without labels
jq 'select(.labels | length == 0)' .ghfs/search/issues-needs-triage.jsonl
```

### Integration with PR #19 search.jsonl

The search coverage feature is designed to extend (not replace) the `search.jsonl` from PR #19. While `search.jsonl` indexes local issue/PR metadata for fast lookup, search coverage queries the GitHub Search API for:

- Code-level annotations (TODO/FIXME)
- Cross-repository commit references
- Saved search queries
- Repository mentions across GitHub

Both files serve complementary purposes:
- `search.jsonl` → Fast local metadata lookup
- `search/*.jsonl` → Remote search API results

## Disabling Search

To disable search coverage entirely:

```typescript
export default {
  repo: 'owner/repo',
  search: {
    codeTodos: false,
    commitRefs: false,
    issueQueries: {},
    mentions: false,
  },
}
```

Or remove the `search` configuration block to use defaults.

## Best Practices

1. **Start with defaults**: Enable `codeTodos` and `commitRefs`, disable `mentions`
2. **Use saved queries**: Define reusable issue searches in `issueQueries`
3. **Watch rate limits**: Keep `maxResults` ≤ 100 to avoid hitting limits
4. **Enable mentions sparingly**: Cross-repo mention search is expensive
5. **Parse with streaming tools**: Use `jq`, `grep`, or streaming JSONL parsers

## Troubleshooting

### Search returns no results

- Check authentication: Search requires an authenticated token
- Verify repository access: Token must have read access
- Check rate limits: Wait 1 minute if hitting 403 errors

### Search is slow

- Reduce `maxResults` to fetch fewer results
- Disable `mentions` if not needed
- Use specific saved queries instead of broad searches

### Missing expected results

- GitHub Search API may lag behind live data
- Code search requires repositories to be indexed
- Private repositories require token with appropriate scopes
