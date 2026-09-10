# Epic: Effect + alchemy.run Integration for Desired-State Management

## Overview

Integrate Effect v4 RC and alchemy.run v2 to enable declarative, Infrastructure-as-Code style management of GitHub repository resources (issues, PRs, labels, milestones).

## Goals

1. **Effect-native architecture**: Use Effect Schema, Config, and Layers throughout
2. **Leverage alchemy infrastructure**: Reuse alchemy's plan/apply/state management instead of building parallel system
3. **Type-safe resource declarations**: GitHub resources as alchemy Resource types
4. **Seamless CLI integration**: `ghfs status` shows drift, `ghfs apply` delegates to alchemy
5. **Migration path**: Coexist with existing execute model during transition

## Non-Goals

- Building a custom DSL parallel to alchemy
- Using Node.js built-in fs/http modules (use `@effect/platform` instead)
- Supporting non-alchemy apply paths

## Architecture

```
ghfs CLI → ghfs.run.ts (Alchemy.Stack) → GitHub Provider (reconcile/delete) → GitHub API
```

## Success Criteria

- [ ] GitHub resources (Issue, Pull, Label, Milestone) implemented as alchemy Resource types
- [ ] GitHub provider Layer implements reconcile/delete lifecycle
- [ ] `ghfs.run.ts` Stack template created
- [ ] `ghfs status` shows alchemy plan output
- [ ] `ghfs apply` delegates to `alchemy deploy`
- [ ] Documentation includes Effect + alchemy examples
- [ ] Tests validate reconcile logic

## Dependencies

- effect@rc (v4.0.0-rc)
- @effect/platform@rc (v4.0.0-rc)
- alchemy@^2.0.0

## Child Issues

### Phase 1: Foundation (P0)

- [ ] #001: Install Effect v4 RC + alchemy dependencies
- [ ] #002: Create GitHub resource type definitions (Issue, Pull, Label, Milestone)
- [ ] #003: Implement Effect Schema for resource props and outputs

### Phase 2: Provider Implementation (P0)

- [ ] #004: Implement GitHub Provider Layer skeleton
- [ ] #005: Implement Issue provider (reconcile/delete/read)
- [ ] #006: Implement Label provider (reconcile/delete)
- [ ] #007: Implement Milestone provider (reconcile/delete)
- [ ] #008: Implement Pull provider (reconcile only - delete closes)

### Phase 3: Stack & CLI (P0)

- [ ] #009: Create `ghfs.run.ts` Stack template
- [ ] #010: Implement `ghfs init-alchemy` command
- [ ] #011: Update `ghfs status` to show alchemy plan
- [ ] #012: Implement `ghfs apply` command (delegates to alchemy)

### Phase 4: Testing (P0)

- [ ] #013: Write unit tests for resource schemas
- [ ] #014: Write tests for provider reconcile logic
- [ ] #015: Write integration tests for Stack deployment
- [ ] #016: Add E2E tests for CLI commands

### Phase 5: Documentation (P1)

- [ ] #017: Document Effect + alchemy integration patterns
- [ ] #018: Write migration guide from execute model
- [ ] #019: Add examples for common workflows
- [ ] #020: Update README with alchemy integration

### Phase 6: Extended Resources (P2)

- [ ] #021: Implement Project resource (GitHub Projects v2)
- [ ] #022: Implement Wiki resource
- [ ] #023: Implement RepoSettings resource
- [ ] #024: Implement BranchProtection resource

## Timeline

- Phase 1-2: 1 sprint (foundation + provider implementation)
- Phase 3: 1 sprint (Stack + CLI integration)
- Phase 4: 1 sprint (testing)
- Phase 5: 0.5 sprint (documentation)
- Phase 6: Future (extended resources)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| alchemy v2 API instability | High | Pin to specific version, monitor changelog |
| Effect v4 RC breaking changes | High | Use @effect/tsgo for migration detection |
| Octokit API rate limits | Medium | Implement retry/throttling in provider |
| GitHub API limitations (e.g., can't create PRs) | Low | Document limitations clearly |

## References

- [Effect v4 RC Documentation](https://effect.website/)
- [alchemy.run v2 Documentation](https://alchemy.run/)
- [Design Doc: Effect + alchemy Integration](../effect-alchemy-integration.md)
- [Design Doc: Desired-State DSL](../desired-state-dsl.md)
