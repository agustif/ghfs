# Two-Way Apply Architecture

## Status: Design Phase

This document outlines the architecture for making ghfs two-way (read + write), inspired by Ansible and alchemy.run.

## Core Architecture Decision

**Apply engine = alchemy.run v2 GitHub provider + Effect v4 RC**

ghfs will NOT build a bespoke apply-only mutation stack. Instead:

1. **Leverage alchemy.run** for GitHub infrastructure-as-code primitives
2. **Use Effect v4 RC** as the effect system
3. **Delegate to alchemy resources** where they exist:
   - `Comment` - Issue/PR comments ✅
   - `Secret` - GitHub Actions secrets ✅
   - `RepositoryEnvironment` - Deployment environments ✅
   - `RepositoryWebhook` - Webhooks ✅

4. **Custom Effect services** only for gaps alchemy doesn't cover:
   - Issue/PR state changes (open/close)
   - Issue/PR title/body edits
   - Labels, assignees, milestones
   - PR reviews, merges, draft conversions
   - Wiki pages (if we add them)

## Workflow

### 1. Pull (existing)
GitHub → `.ghfs/` observed state

### 2. Desired State
User/agent edits mirrored files under `.ghfs/issues/` and `.ghfs/pulls/`:
- Edit frontmatter: `title`, `state`, `labels`, `assignees`, `milestone`
- Changes detected by comparing frontmatter to last synced state

### 3. Plan
```bash
ghfs plan
```
- Diff observed vs desired state
- Print operations that WOULD run
- No mutations
- Output can be JSON (`--json`)

### 4. Apply
```bash
ghfs apply --yes
```
- Execute mutations via Effect + alchemy
- Dry-run by default (requires `--yes`)
- Audit log to `.ghfs/apply-log.jsonl`

## Write Surfaces (Priority Order)

### Immediate (via alchemy Comment)
- [x] Add comment to issue/PR

### Phase 1 (Custom Effect services)
- [ ] Issues: create, edit title/body, labels, assignees, milestone, state open/close
- [ ] PRs: request reviewers, add labels, convert draft, merge (with method)

### Phase 2 (Custom Effect services)
- [ ] Labels/milestones: create/update
- [ ] PR reviews: approve/request-changes (careful)

### Phase 3+ (To be determined)
- [ ] Wiki pages: create/update page content from `.ghfs/wiki/`
- [ ] Discussions: post comment / create discussion
- [ ] Projects v2: set field values on items
- [ ] Merge queue: enqueue
- [ ] Releases: draft release from file
- [ ] Branch protection / rulesets: DANGEROUS - needs explicit flags

## Safety

- **Dry-run default**: `apply` without `--yes` only shows plan
- **Dangerous operations**: Require `--allow-dangerous` flag
- **Audit log**: All applied actions → `.ghfs/apply-log.jsonl`
- **Provenance**: Record what was pushed, when, by whom
- **Secret handling**: Never write secrets without explicit `--allow-secrets` and redact in logs

## Implementation Notes

### Why alchemy.run?

1. **Proven GitHub infra-as-code**: Already manages repos, secrets, environments, webhooks
2. **Effect-native**: Built on Effect, matches our desired architecture
3. **Avoid reinventing**: Don't build mutation primitives from scratch
4. **Composable**: Can mix alchemy resources with custom Effect services

### Effect v4 Migration First

Before building apply, the existing ghfs codebase should migrate to Effect v4:
- Current: Promises, callbacks, imperative error handling
- Target: Effect-based composition, layered services, type-safe errors

### Future: Full alchemy Stack

Long-term vision: ghfs plan/apply could become a thin wrapper over alchemy deploy:
```typescript
// .ghfs/desired.alchemy.ts
import * as GitHub from 'alchemy/GitHub'

export default Stack('my-repo', function* () {
  yield* GitHub.Comment('welcome-comment', {
    owner: 'org',
    repository: 'repo',
    issueNumber: 123,
    body: 'Welcome!'
  })
})
```

Then `ghfs apply` becomes `alchemy deploy`.

## References

- [alchemy.run GitHub Provider](https://alchemy.run/providers/github/)
- [alchemy.run GitHub Setup](https://alchemy.run/github/setup/)
- [Effect v4 RC](https://effect.website)
- Existing: `src/execute/` (current one-way write system)

## Next Steps

1. ✅ Document architecture decision
2. ⏸️  Hold on apply implementation
3. 🎯 Prioritize Effect v4 migration of existing codebase
4. 🔮 Resume apply work after migration complete

---

**Note**: This document represents the design direction. Implementation is paused pending Effect migration of the existing codebase.
