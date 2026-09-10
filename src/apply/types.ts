import type { ReactionTarget } from '../types/provider'
import type { ReactionContent } from '../utils/reactions'

export interface ApplyOptions {
  /**
   * When true, allows dangerous operations like merge and approve.
   * Defaults to false for safety.
   */
  allowDangerous?: boolean
  /**
   * When provided, only applies the action if the item hasn't been updated
   * remotely since this timestamp.
   */
  ifUnchangedSince?: string
}

export interface ActionBase {
  type: string
  number: number
}

export interface CloseAction extends ActionBase {
  type: 'close'
}

export interface ReopenAction extends ActionBase {
  type: 'reopen'
}

export interface SetTitleAction extends ActionBase {
  type: 'set-title'
  title: string
}

export interface SetBodyAction extends ActionBase {
  type: 'set-body'
  body: string
}

export interface CreateCommentAction extends ActionBase {
  type: 'create-comment'
  body: string
}

export interface UpdateCommentAction extends ActionBase {
  type: 'update-comment'
  commentId: number
  body: string
}

export interface AddLabelsAction extends ActionBase {
  type: 'add-labels'
  labels: string[]
}

export interface RemoveLabelsAction extends ActionBase {
  type: 'remove-labels'
  labels: string[]
}

export interface SetLabelsAction extends ActionBase {
  type: 'set-labels'
  labels: string[]
}

export interface AddAssigneesAction extends ActionBase {
  type: 'add-assignees'
  assignees: string[]
}

export interface RemoveAssigneesAction extends ActionBase {
  type: 'remove-assignees'
  assignees: string[]
}

export interface SetAssigneesAction extends ActionBase {
  type: 'set-assignees'
  assignees: string[]
}

export interface SetMilestoneAction extends ActionBase {
  type: 'set-milestone'
  milestone: string | number
}

export interface ClearMilestoneAction extends ActionBase {
  type: 'clear-milestone'
}

export interface LockAction extends ActionBase {
  type: 'lock'
  reason?: 'resolved' | 'off-topic' | 'too heated' | 'too-heated' | 'spam'
}

export interface UnlockAction extends ActionBase {
  type: 'unlock'
}

export interface RequestReviewersAction extends ActionBase {
  type: 'request-reviewers'
  reviewers: string[]
}

export interface RemoveReviewersAction extends ActionBase {
  type: 'remove-reviewers'
  reviewers: string[]
}

export interface MarkReadyForReviewAction extends ActionBase {
  type: 'mark-ready-for-review'
}

export interface ConvertToDraftAction extends ActionBase {
  type: 'convert-to-draft'
}

export interface CreateReviewAction extends ActionBase {
  type: 'create-review'
  event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES'
  body?: string
  /**
   * When true, this is a dangerous operation that requires allowDangerous.
   * APPROVE and REQUEST_CHANGES are considered dangerous.
   */
  dangerous?: boolean
}

export type MergeMethod = 'squash' | 'merge' | 'rebase'

export interface MergeAction extends ActionBase {
  type: 'merge'
  method?: MergeMethod
  commitTitle?: string
  commitMessage?: string
  /**
   * Always true for merge operations.
   */
  dangerous: true
}

export interface UpdatePullAction extends ActionBase {
  type: 'update-pull'
  title?: string
  body?: string
  draft?: boolean
  base?: string
}

export interface AddReactionAction extends ActionBase {
  type: 'add-reaction'
  reaction: ReactionContent
  target?: ReactionTarget
}

export interface RemoveReactionAction extends ActionBase {
  type: 'remove-reaction'
  reaction: ReactionContent
  target?: ReactionTarget
}

export type Action
  = | CloseAction
    | ReopenAction
    | SetTitleAction
    | SetBodyAction
    | CreateCommentAction
    | UpdateCommentAction
    | AddLabelsAction
    | RemoveLabelsAction
    | SetLabelsAction
    | AddAssigneesAction
    | RemoveAssigneesAction
    | SetAssigneesAction
    | SetMilestoneAction
    | ClearMilestoneAction
    | LockAction
    | UnlockAction
    | RequestReviewersAction
    | RemoveReviewersAction
    | MarkReadyForReviewAction
    | ConvertToDraftAction
    | CreateReviewAction
    | MergeAction
    | UpdatePullAction
    | AddReactionAction
    | RemoveReactionAction

export type ActionType = Action['type']

export interface ActionResult {
  success: boolean
  action: Action
  error?: Error
  skipped?: boolean
  skipReason?: string
}

export const DANGEROUS_ACTIONS: ActionType[] = ['merge']

export function isDangerousAction(action: Action): boolean {
  if (action.type === 'merge')
    return true
  if (action.type === 'create-review' && (action.event === 'APPROVE' || action.event === 'REQUEST_CHANGES'))
    return true
  return false
}

export interface CreateIssueAction {
  type: 'create-issue'
  title: string
  body?: string
  labels?: string[]
  assignees?: string[]
  milestone?: string | number
}

export type ActionWithCreate = Action | CreateIssueAction
