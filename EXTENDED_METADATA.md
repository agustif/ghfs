# Extended Metadata for Agent Ergonomics

ghfs generates additional metadata files to help AI agents navigate repositories offline without repeated API calls.

## Files Generated

### `graph.jsonl` - Relationship Graph

Foundation-compatible node/edge graph for agent navigation.

**Node types**: `issue`, `pull`, `commit`, `person`, `label`, `milestone`  
**Edge types**: `references`, `fixes`, `fixed_by`, `mentions`, `assigns`, `labels`, `review_requested`, `connected`, `duplicate_of`

**Node ID format**: `ghfs:pull:123`, `ghfs:issue:456`, `ghfs:person:alice`, `ghfs:label:bug`, `ghfs:milestone:v1.0`, `ghfs:commit:abc123`

**Format**: JSONL with `{type: "node", ...}` and `{type: "edge", ...}` entries

**Example**:
```jsonl
{"type":"node","id":"ghfs:pull:42","kind":"pull","metadata":{"number":42,"title":"Fix bug","state":"open"}}
{"type":"node","id":"ghfs:issue:123","kind":"issue","metadata":{"number":123,"title":"Bug report","state":"closed"}}
{"type":"node","id":"ghfs:person:alice","kind":"person","metadata":{"login":"alice"}}
{"type":"edge","from":"ghfs:pull:42","to":"ghfs:issue:123","relation":"fixes"}
{"type":"edge","from":"ghfs:pull:42","to":"ghfs:person:alice","relation":"review_requested"}
```

**Agent use cases**:
- Find all PRs that fix an issue
- Find all items assigned to a person
- Trace commit relationships
- Discover related work

**Config toggle**: `extended.graph` (default: `true`)

---

### `search.jsonl` - Fast Search Index

JSON Lines format for fast grep/jq queries without parsing markdown.

**Fields**: `id`, `number`, `kind`, `title`, `labels`, `state`, `path`, `author`, `assignees`, `milestone`, `updatedAt`

**ID format**: Matches foundation pack chunk namespace (`ghfs:issue:N`, `ghfs:pull:N`)

**Example**:
```jsonl
{"id":"ghfs:issue:123","number":123,"kind":"issue","title":"Bug report","labels":["bug","high-priority"],"state":"open","path":"issues/00123-bug-report.md","author":"alice","assignees":["bob"],"milestone":"v1.0","updatedAt":"2026-09-10T09:00:00Z"}
{"id":"ghfs:pull:42","number":42,"kind":"pull","title":"Fix bug","labels":[],"state":"open","path":"pulls/00042-fix-bug.md","author":"bob","assignees":[],"milestone":null,"updatedAt":"2026-09-10T09:30:00Z"}
```

**Agent use cases**:
- Fast search: `jq -r 'select(.labels[] == "bug") | .path' search.jsonl`
- Filter by state: `jq 'select(.state == "open")' search.jsonl`
- Find by author: `grep '"author":"alice"' search.jsonl`
- Date filtering: `jq 'select(.updatedAt > "2026-09-01")' search.jsonl`

**Config toggle**: `extended.search` (default: `true`)

---

### `me.md` - Personal Work Summary

Markdown summary of work assigned to the authenticated user.

**Sections**:
- Assigned to me (issues + PRs)
- Review requested from me (PRs)
- Mentions of @me (in bodies/comments)

**Category**: Hot (failing-related context)

**Behavior**: Only created if `fetchAuthenticatedUser()` returns a user. Gracefully skipped otherwise.

**Example**:
```markdown
# My Items

Synced at: 2026-09-10T09:30:00Z

## Assigned to me (2)

- [ ] #42 Fix critical bug
- [x] #43 Add feature

## Review requested (1)

- [ ] #44 Update docs

## Mentions (1)

- #45 Question about API (in comment)
```

**Agent use cases**:
- Quickly find "my work"
- Prioritize review requests
- Track mentions

**Config toggle**: `extended.me` (default: `true`)

---

### `security/summary.json` - Security Alerts

Counts and top N security alerts from Dependabot, code scanning, and secret scanning.

**Category**: Warm (periodic review context)

**Fields per alert type**:
- `total`, `open`, `critical`, `high`, `medium`, `low`
- `topAlerts` (top 10 by severity)

**Behavior**: Gracefully skips if GitHub Advanced Security unavailable or no permissions.

**Example**:
```json
{
  "dependabot": {
    "total": 5,
    "open": 3,
    "critical": 1,
    "high": 2,
    "medium": 0,
    "low": 0,
    "topAlerts": [
      {
        "number": 1,
        "state": "open",
        "severity": "critical",
        "package": "lodash",
        "ecosystem": "npm",
        "vulnerableVersionRange": "< 4.17.21",
        "createdAt": "2026-09-01T00:00:00Z",
        "dismissedAt": null,
        "fixedAt": null
      }
    ]
  },
  "codeScanning": { ... },
  "secretScanning": { ... },
  "syncedAt": "2026-09-10T09:30:00Z"
}
```

**Agent use cases**:
- Check security posture without API calls
- Prioritize critical alerts
- Track remediation progress

**Config toggle**: `extended.security` (default: `true`)

---

### `sync-state.json` - Sync Metadata

Full sync state for staleness detection and incremental operations.

**Fields**: `lastSync`, `itemCount`, `items` (full sync state)

**Example**:
```json
{
  "lastSync": "2026-09-10T09:30:00Z",
  "itemCount": 42,
  "items": {
    "123": { ... },
    "124": { ... }
  }
}
```

**Agent use cases**:
- Check if sync is stale
- Implement incremental sync logic
- Understand sync state

**Config toggle**: `extended.syncState` (default: `true`)

---

## Configuration

In `ghfs.config.ts`:

```typescript
import type { GhfsUserConfig } from '@ghfs/cli'

export default {
  repo: 'owner/repo',
  extended: {
    // Generate graph.jsonl (default: true)
    graph: true,
    
    // Generate search.jsonl (default: true)
    search: true,
    
    // Generate me.md (default: true)
    me: true,
    
    // Generate security/summary.json (default: true)
    security: true,
    
    // Generate sync-state.json (default: true)
    syncState: true,
  },
} satisfies GhfsUserConfig
```

**Disable all extended metadata**:
```typescript
export default {
  repo: 'owner/repo',
  extended: {
    graph: false,
    search: false,
    me: false,
    security: false,
    syncState: false,
  },
}
```

**Selective enablement** (e.g., only graph and search):
```typescript
export default {
  repo: 'owner/repo',
  extended: {
    graph: true,
    search: true,
    me: false,
    security: false,
    syncState: false,
  },
}
```

---

## Foundation Integration

These files are designed to be **foundation-compatible** building blocks:

- `graph.jsonl` → Foundation's graph system can consume/extend with `check`, `workflow`, `file_path`, `discussion` nodes
- `search.jsonl` → Foundation's context packs can use stable IDs for small/medium/large bundles
- `me.md` → Hot tier (failing-related category)
- `security/` → Warm tier
- `sync-state.json` → Freshness tracking foundation

See Epic #4 for foundation architecture.

---

## Performance

All extended metadata generation:
- Runs during sync write phase
- Gracefully degrades on errors (doesn't block sync)
- Can be disabled per-feature via config
- Adds minimal overhead (~50-200ms for typical repos)

---

## Future Extensions

Foundation agent will extend with:
- Context packs (small/medium/large per issue/PR)
- Policy/gate DSL
- Tiered freshness (hot/warm/cold)
- Locks/notes for coordination
- Activity tracking
- Agent hints (test/lint/build commands)
- Deployments status
