# Issue: Add Optional Blob Content Sync for Small Text Files

## Summary

Extend the Git database sync to optionally fetch and store blob content for small text files under a configurable size cap.

## Background

PR #117 adds Git database support with refs, commits, and trees. The tree listing provides paths and SHAs, but not the actual file content. The `fetchGitBlob` provider method exists but isn't currently used during sync.

## Proposal

Add a new config option to enable blob content syncing:

```typescript
export interface GhfsConfig {
  sync?: {
    git?: {
      enabled?: boolean // default: true
      blobContent?: boolean // default: false
      blobSizeLimit?: number // default: 100KB (102400 bytes)
    }
  }
}
```

## Behavior

When `sync.git.blobContent` is enabled:

1. After fetching HEAD tree, filter for text blobs under size limit
2. Fetch blob content for each matching blob
3. Write to `.ghfs/git/blobs/{sha}.txt` (or `.json` with metadata)

## File Format

Option A - Plain content:
```
.ghfs/git/blobs/abc123.txt
```

Option B - JSON with metadata:
```json
{
  "sha": "abc123...",
  "path": "src/index.ts",
  "size": 1234,
  "encoding": "utf-8",
  "content": "..."
}
```

## Use Cases

- Quick file preview without git clone
- Agent can read file snippets inline
- Offline code review
- Small config files (package.json, tsconfig.json, etc.)

## Constraints

- Only text files (detect via path extension or first bytes)
- Respect size limit (default 100KB)
- Skip binary files automatically
- Rate limit aware (may need batching or delays)

## Implementation Notes

- Use `.gitattributes` patterns if available
- Consider caching strategy (update only if SHA changed)
- Estimate total storage before sync (warn if > 100MB)
- Provide progress feedback for large repos

## Alternatives

- Always sync blobs for specific paths (e.g., `*.json`, `*.md`, `*.txt`)
- Lazy fetch on demand (not during sync)
- Store compressed blobs

## Open Questions

1. Should we sync blobs for all trees or just HEAD?
2. Should we follow `.gitignore` patterns?
3. How to handle encoding detection?
4. Should we dedupe blobs by SHA?

## Related

- PR #117 - Git database foundation
- GitHub Docs: [Get a blob](https://docs.github.com/en/rest/git/blobs#get-a-blob)
