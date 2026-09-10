# Apply Module Decision

## Context

Started implementing WRITE adapters for Issues + PRs (mutations) in `src/apply/` module with Action types and executors to feed plan/apply workflows.

## Decision

**STOPPED** - Apply/mutation logic belongs in forked alchemy later, not in ghfs core.

## Rationale

- ghfs priority is the **Effect-native observe path** (read-only sync, filesystem representation)
- Mutation/apply logic adds complexity that should live in a separate concern
- Better separation: ghfs = observe/read, alchemy fork = plan/apply/mutate
- User priority is getting the observe path right first

## Work Completed

Partial implementation in `src/apply/`:
- `types.ts` - Action type definitions with safety flags
- `executor.ts` - Execute functions wrapping provider methods
- `plan.ts` - Planning utilities (safe/dangerous filtering, descriptions)
- Comprehensive tests with mocks

**Note**: The existing `src/execute/` module already handles the apply path for the current use case (execute.md, execute.yml). The new apply module was intended for future plan/apply agent workflows but is premature.

## Next Steps

1. Roll back apply module changes
2. Focus on Effect-native observe path
3. Revisit apply/mutations in alchemy fork when needed

## Provider Actions Already Available

The `RepositoryProvider` interface already exposes all needed mutation methods:
- `actionClose`, `actionReopen`
- `actionSetTitle`, `actionSetBody`
- `actionAddComment`
- `actionAddLabels`, `actionRemoveLabels`, `actionSetLabels`
- `actionAddAssignees`, `actionRemoveAssignees`, `actionSetAssignees`
- `actionSetMilestone`, `actionClearMilestone`
- `actionLock`, `actionUnlock`
- `actionRequestReviewers`, `actionRemoveReviewers`
- `actionMarkReadyForReview`, `actionConvertToDraft`
- `actionApprove`, `actionRequestChanges`, `actionReviewComment`
- `actionMerge`, `actionEnqueueMerge`
- `actionAddReaction`, `actionRemoveReaction`

These are already used by `src/execute/index.ts` for the current execution flow.

## Files to Remove

```bash
src/apply/types.ts
src/apply/executor.ts
src/apply/plan.ts
src/apply/index.ts
src/apply/executor.test.ts
src/apply/plan.test.ts
src/apply/types.test.ts
```

---

**Status**: Branch `cursor/write-adapters-apply-module-3979` contains partial work, marked as WIP/abandoned.

**Date**: 2026-09-10
