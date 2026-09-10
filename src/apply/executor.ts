import type { RepositoryProvider } from '../types/provider'
import type { Action, ActionResult, ApplyOptions, CreateIssueAction } from './types'
import { diagnostics } from '../logger'
import { isDangerousAction } from './types'

export async function executeAction(
  provider: RepositoryProvider,
  action: Action,
  options: ApplyOptions = {},
): Promise<ActionResult> {
  if (isDangerousAction(action) && !options.allowDangerous) {
    return {
      success: false,
      action,
      skipped: true,
      skipReason: 'Dangerous action blocked by allowDangerous=false',
      error: new Error(`Dangerous action "${action.type}" blocked. Set allowDangerous=true to allow.`),
    }
  }

  if (options.ifUnchangedSince) {
    try {
      const item = await provider.fetchItemSnapshot(action.number)
      const remoteUpdatedAt = item.updatedAt
      if (remoteUpdatedAt && new Date(remoteUpdatedAt).getTime() > new Date(options.ifUnchangedSince).getTime()) {
        return {
          success: false,
          action,
          skipped: true,
          skipReason: `Item updated remotely since ${options.ifUnchangedSince}`,
          error: diagnostics.GHFS0101({ remoteUpdatedAt }),
        }
      }
    }
    catch (error) {
      return {
        success: false,
        action,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  try {
    switch (action.type) {
      case 'close':
        await provider.actionClose(action.number)
        break

      case 'reopen':
        await provider.actionReopen(action.number)
        break

      case 'set-title':
        await provider.actionSetTitle(action.number, action.title)
        break

      case 'set-body':
        await provider.actionSetBody(action.number, action.body)
        break

      case 'create-comment':
        await provider.actionAddComment(action.number, action.body)
        break

      case 'update-comment':
        throw new Error('update-comment not yet implemented in provider')

      case 'add-labels':
        await provider.actionAddLabels(action.number, action.labels)
        break

      case 'remove-labels':
        await provider.actionRemoveLabels(action.number, action.labels)
        break

      case 'set-labels':
        await provider.actionSetLabels(action.number, action.labels)
        break

      case 'add-assignees':
        await provider.actionAddAssignees(action.number, action.assignees)
        break

      case 'remove-assignees':
        await provider.actionRemoveAssignees(action.number, action.assignees)
        break

      case 'set-assignees':
        await provider.actionSetAssignees(action.number, action.assignees)
        break

      case 'set-milestone':
        await provider.actionSetMilestone(action.number, action.milestone)
        break

      case 'clear-milestone':
        await provider.actionClearMilestone(action.number)
        break

      case 'lock':
        await provider.actionLock(action.number, action.reason)
        break

      case 'unlock':
        await provider.actionUnlock(action.number)
        break

      case 'request-reviewers':
        await provider.actionRequestReviewers(action.number, action.reviewers)
        break

      case 'remove-reviewers':
        await provider.actionRemoveReviewers(action.number, action.reviewers)
        break

      case 'mark-ready-for-review':
        await provider.actionMarkReadyForReview(action.number)
        break

      case 'convert-to-draft':
        await provider.actionConvertToDraft(action.number)
        break

      case 'create-review':
        if (action.event === 'APPROVE')
          await provider.actionApprove(action.number, action.body)
        else if (action.event === 'REQUEST_CHANGES')
          await provider.actionRequestChanges(action.number, action.body ?? '')
        else
          await provider.actionReviewComment(action.number, action.body ?? '')
        break

      case 'merge':
        await provider.actionMerge(action.number, {
          method: action.method,
          commitTitle: action.commitTitle,
          commitMessage: action.commitMessage,
        })
        break

      case 'update-pull':
        if (action.title !== undefined)
          await provider.actionSetTitle(action.number, action.title)
        if (action.body !== undefined)
          await provider.actionSetBody(action.number, action.body)
        if (action.draft === true)
          await provider.actionConvertToDraft(action.number)
        else if (action.draft === false)
          await provider.actionMarkReadyForReview(action.number)
        break

      case 'add-reaction':
        await provider.actionAddReaction(action.number, action.reaction, action.target ?? { kind: 'item' })
        break

      case 'remove-reaction':
        await provider.actionRemoveReaction(action.number, action.reaction, action.target ?? { kind: 'item' })
        break

      default: {
        const exhaustive: never = action
        throw new Error(`Unknown action type: ${(exhaustive as Action).type}`)
      }
    }

    return {
      success: true,
      action,
    }
  }
  catch (error) {
    return {
      success: false,
      action,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

export async function executeActions(
  provider: RepositoryProvider,
  actions: Action[],
  options: ApplyOptions = {},
): Promise<ActionResult[]> {
  const results: ActionResult[] = []

  for (const action of actions) {
    const result = await executeAction(provider, action, options)
    results.push(result)

    if (!result.success && !options.allowDangerous)
      break
  }

  return results
}

export async function createIssue(
  provider: RepositoryProvider,
  action: CreateIssueAction,
): Promise<ActionResult & { number?: number }> {
  throw new Error('createIssue not yet implemented in provider')
}
