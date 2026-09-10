import type { Action } from './types'
import { isDangerousAction } from './types'

export interface PlanResult {
  actions: Action[]
  dangerousCount: number
  safeCount: number
}

export function planActions(actions: Action[]): PlanResult {
  let dangerousCount = 0
  let safeCount = 0

  for (const action of actions) {
    if (isDangerousAction(action))
      dangerousCount++
    else
      safeCount++
  }

  return {
    actions,
    dangerousCount,
    safeCount,
  }
}

export function filterSafeActions(actions: Action[]): Action[] {
  return actions.filter(action => !isDangerousAction(action))
}

export function filterDangerousActions(actions: Action[]): Action[] {
  return actions.filter(action => isDangerousAction(action))
}

export function describeAction(action: Action): string {
  switch (action.type) {
    case 'close':
      return `Close #${action.number}`
    case 'reopen':
      return `Reopen #${action.number}`
    case 'set-title':
      return `Set title of #${action.number} to "${action.title}"`
    case 'set-body':
      return `Set body of #${action.number}`
    case 'create-comment':
      return `Add comment to #${action.number}`
    case 'update-comment':
      return `Update comment ${action.commentId} on #${action.number}`
    case 'add-labels':
      return `Add labels [${action.labels.join(', ')}] to #${action.number}`
    case 'remove-labels':
      return `Remove labels [${action.labels.join(', ')}] from #${action.number}`
    case 'set-labels':
      return `Set labels of #${action.number} to [${action.labels.join(', ')}]`
    case 'add-assignees':
      return `Add assignees [${action.assignees.join(', ')}] to #${action.number}`
    case 'remove-assignees':
      return `Remove assignees [${action.assignees.join(', ')}] from #${action.number}`
    case 'set-assignees':
      return `Set assignees of #${action.number} to [${action.assignees.join(', ')}]`
    case 'set-milestone':
      return `Set milestone of #${action.number} to "${action.milestone}"`
    case 'clear-milestone':
      return `Clear milestone of #${action.number}`
    case 'lock':
      return `Lock #${action.number}${action.reason ? ` (${action.reason})` : ''}`
    case 'unlock':
      return `Unlock #${action.number}`
    case 'request-reviewers':
      return `Request reviewers [${action.reviewers.join(', ')}] for #${action.number}`
    case 'remove-reviewers':
      return `Remove reviewers [${action.reviewers.join(', ')}] from #${action.number}`
    case 'mark-ready-for-review':
      return `Mark #${action.number} ready for review`
    case 'convert-to-draft':
      return `Convert #${action.number} to draft`
    case 'create-review':
      return `Submit ${action.event.toLowerCase()} review on #${action.number}`
    case 'merge':
      return `Merge #${action.number} (${action.method ?? 'squash'})`
    case 'update-pull':
      return `Update #${action.number}`
    case 'add-reaction':
      return `Add reaction ${action.reaction} to #${action.number}`
    case 'remove-reaction':
      return `Remove reaction ${action.reaction} from #${action.number}`
    default: {
      const exhaustive: never = action
      return `Unknown action on #${(exhaustive as Action).number}`
    }
  }
}
