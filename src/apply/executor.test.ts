import { describe, expect, it, vi } from 'vitest'
import type { RepositoryProvider } from '../types/provider'
import type { Action } from './types'
import { executeAction, executeActions } from './executor'

function createMockProvider(): RepositoryProvider {
  return {
    paginateItems: vi.fn(),
    fetchItems: vi.fn(),
    eachItem: vi.fn(),
    fetchItemsByNumbers: vi.fn(),
    fetchComments: vi.fn(),
    fetchPullMetadata: vi.fn(),
    fetchPullPatch: vi.fn(),
    fetchPullCommits: vi.fn(),
    fetchReviewComments: vi.fn(),
    fetchTimeline: vi.fn(),
    fetchItemSnapshot: vi.fn(async () => ({
      number: 123,
      kind: 'issue' as const,
      updatedAt: '2024-01-01T00:00:00Z',
    })),
    fetchRepository: vi.fn(),
    fetchRepositoryLabels: vi.fn(),
    fetchRepositoryMilestones: vi.fn(),
    fetchAuthenticatedUser: vi.fn(),
    countUpdatedSince: vi.fn(),
    getRequestCount: vi.fn(() => 0),
    actionClose: vi.fn(async () => {}),
    actionReopen: vi.fn(async () => {}),
    actionSetTitle: vi.fn(async () => {}),
    actionSetBody: vi.fn(async () => {}),
    actionAddComment: vi.fn(async () => {}),
    actionAddLabels: vi.fn(async () => {}),
    actionRemoveLabels: vi.fn(async () => {}),
    actionSetLabels: vi.fn(async () => {}),
    actionAddAssignees: vi.fn(async () => {}),
    actionRemoveAssignees: vi.fn(async () => {}),
    actionSetAssignees: vi.fn(async () => {}),
    actionSetMilestone: vi.fn(async () => {}),
    actionClearMilestone: vi.fn(async () => {}),
    actionLock: vi.fn(async () => {}),
    actionUnlock: vi.fn(async () => {}),
    actionRequestReviewers: vi.fn(async () => {}),
    actionRemoveReviewers: vi.fn(async () => {}),
    actionMarkReadyForReview: vi.fn(async () => {}),
    actionConvertToDraft: vi.fn(async () => {}),
    actionApprove: vi.fn(async () => {}),
    actionRequestChanges: vi.fn(async () => {}),
    actionReviewComment: vi.fn(async () => {}),
    actionMerge: vi.fn(async () => {}),
    actionEnqueueMerge: vi.fn(async () => {}),
    actionAddReaction: vi.fn(async () => {}),
    actionRemoveReaction: vi.fn(async () => {}),
    fetchViewerReactions: vi.fn(async () => []),
  }
}

describe('executeAction', () => {
  it('should execute close action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'close', number: 123 }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(result.action).toBe(action)
    expect(provider.actionClose).toHaveBeenCalledWith(123)
  })

  it('should execute reopen action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'reopen', number: 123 }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionReopen).toHaveBeenCalledWith(123)
  })

  it('should execute set-title action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'set-title', number: 123, title: 'New Title' }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionSetTitle).toHaveBeenCalledWith(123, 'New Title')
  })

  it('should execute set-body action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'set-body', number: 123, body: 'New body content' }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionSetBody).toHaveBeenCalledWith(123, 'New body content')
  })

  it('should execute create-comment action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'create-comment', number: 123, body: 'Great work!' }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionAddComment).toHaveBeenCalledWith(123, 'Great work!')
  })

  it('should execute add-labels action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'add-labels', number: 123, labels: ['bug', 'enhancement'] }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionAddLabels).toHaveBeenCalledWith(123, ['bug', 'enhancement'])
  })

  it('should execute remove-labels action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'remove-labels', number: 123, labels: ['wontfix'] }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionRemoveLabels).toHaveBeenCalledWith(123, ['wontfix'])
  })

  it('should execute set-labels action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'set-labels', number: 123, labels: ['bug'] }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionSetLabels).toHaveBeenCalledWith(123, ['bug'])
  })

  it('should execute add-assignees action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'add-assignees', number: 123, assignees: ['alice', 'bob'] }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionAddAssignees).toHaveBeenCalledWith(123, ['alice', 'bob'])
  })

  it('should execute remove-assignees action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'remove-assignees', number: 123, assignees: ['charlie'] }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionRemoveAssignees).toHaveBeenCalledWith(123, ['charlie'])
  })

  it('should execute set-assignees action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'set-assignees', number: 123, assignees: ['dave'] }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionSetAssignees).toHaveBeenCalledWith(123, ['dave'])
  })

  it('should execute set-milestone action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'set-milestone', number: 123, milestone: 'v1.0' }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionSetMilestone).toHaveBeenCalledWith(123, 'v1.0')
  })

  it('should execute clear-milestone action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'clear-milestone', number: 123 }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionClearMilestone).toHaveBeenCalledWith(123)
  })

  it('should execute lock action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'lock', number: 123, reason: 'spam' }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionLock).toHaveBeenCalledWith(123, 'spam')
  })

  it('should execute unlock action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'unlock', number: 123 }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionUnlock).toHaveBeenCalledWith(123)
  })

  it('should execute request-reviewers action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'request-reviewers', number: 123, reviewers: ['reviewer1'] }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionRequestReviewers).toHaveBeenCalledWith(123, ['reviewer1'])
  })

  it('should execute remove-reviewers action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'remove-reviewers', number: 123, reviewers: ['reviewer2'] }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionRemoveReviewers).toHaveBeenCalledWith(123, ['reviewer2'])
  })

  it('should execute mark-ready-for-review action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'mark-ready-for-review', number: 123 }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionMarkReadyForReview).toHaveBeenCalledWith(123)
  })

  it('should execute convert-to-draft action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'convert-to-draft', number: 123 }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionConvertToDraft).toHaveBeenCalledWith(123)
  })

  it('should execute create-review action with APPROVE', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'create-review', number: 123, event: 'APPROVE', body: 'LGTM' }

    const result = await executeAction(provider, action, { allowDangerous: true })

    expect(result.success).toBe(true)
    expect(provider.actionApprove).toHaveBeenCalledWith(123, 'LGTM')
  })

  it('should execute create-review action with REQUEST_CHANGES', async () => {
    const provider = createMockProvider()
    const action: Action = {
      type: 'create-review',
      number: 123,
      event: 'REQUEST_CHANGES',
      body: 'Needs work',
    }

    const result = await executeAction(provider, action, { allowDangerous: true })

    expect(result.success).toBe(true)
    expect(provider.actionRequestChanges).toHaveBeenCalledWith(123, 'Needs work')
  })

  it('should execute create-review action with COMMENT', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'create-review', number: 123, event: 'COMMENT', body: 'Note' }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionReviewComment).toHaveBeenCalledWith(123, 'Note')
  })

  it('should execute merge action', async () => {
    const provider = createMockProvider()
    const action: Action = {
      type: 'merge',
      number: 123,
      dangerous: true,
      method: 'squash',
      commitTitle: 'Merge PR',
    }

    const result = await executeAction(provider, action, { allowDangerous: true })

    expect(result.success).toBe(true)
    expect(provider.actionMerge).toHaveBeenCalledWith(123, {
      method: 'squash',
      commitTitle: 'Merge PR',
      commitMessage: undefined,
    })
  })

  it('should execute update-pull action', async () => {
    const provider = createMockProvider()
    const action: Action = {
      type: 'update-pull',
      number: 123,
      title: 'Updated Title',
      body: 'Updated body',
      draft: false,
    }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionSetTitle).toHaveBeenCalledWith(123, 'Updated Title')
    expect(provider.actionSetBody).toHaveBeenCalledWith(123, 'Updated body')
    expect(provider.actionMarkReadyForReview).toHaveBeenCalledWith(123)
  })

  it('should execute add-reaction action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'add-reaction', number: 123, reaction: '+1' }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionAddReaction).toHaveBeenCalledWith(123, '+1', { kind: 'item' })
  })

  it('should execute remove-reaction action', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'remove-reaction', number: 123, reaction: '-1' }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(true)
    expect(provider.actionRemoveReaction).toHaveBeenCalledWith(123, '-1', { kind: 'item' })
  })

  it('should block dangerous actions by default', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'merge', number: 123, dangerous: true }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(false)
    expect(result.skipped).toBe(true)
    expect(result.skipReason).toContain('allowDangerous=false')
    expect(provider.actionMerge).not.toHaveBeenCalled()
  })

  it('should allow dangerous actions when allowDangerous is true', async () => {
    const provider = createMockProvider()
    const action: Action = { type: 'merge', number: 123, dangerous: true, method: 'merge' }

    const result = await executeAction(provider, action, { allowDangerous: true })

    expect(result.success).toBe(true)
    expect(provider.actionMerge).toHaveBeenCalled()
  })

  it('should check ifUnchangedSince', async () => {
    const provider = createMockProvider()
    provider.fetchItemSnapshot = vi.fn(async () => ({
      number: 123,
      kind: 'issue',
      updatedAt: '2024-01-02T00:00:00Z',
    }))

    const action: Action = { type: 'close', number: 123 }

    const result = await executeAction(provider, action, {
      ifUnchangedSince: '2024-01-01T00:00:00Z',
    })

    expect(result.success).toBe(false)
    expect(result.skipped).toBe(true)
    expect(result.skipReason).toContain('updated remotely')
    expect(provider.actionClose).not.toHaveBeenCalled()
  })

  it('should handle provider errors', async () => {
    const provider = createMockProvider()
    provider.actionClose = vi.fn(async () => {
      throw new Error('Network error')
    })

    const action: Action = { type: 'close', number: 123 }

    const result = await executeAction(provider, action)

    expect(result.success).toBe(false)
    expect(result.error?.message).toBe('Network error')
  })
})

describe('executeActions', () => {
  it('should execute multiple actions', async () => {
    const provider = createMockProvider()
    const actions: Action[] = [
      { type: 'close', number: 123 },
      { type: 'add-labels', number: 123, labels: ['closed'] },
    ]

    const results = await executeActions(provider, actions)

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
    expect(provider.actionClose).toHaveBeenCalledWith(123)
    expect(provider.actionAddLabels).toHaveBeenCalledWith(123, ['closed'])
  })

  it('should stop on first error by default', async () => {
    const provider = createMockProvider()
    provider.actionClose = vi.fn(async () => {
      throw new Error('Failed')
    })

    const actions: Action[] = [
      { type: 'close', number: 123 },
      { type: 'add-labels', number: 123, labels: ['closed'] },
    ]

    const results = await executeActions(provider, actions)

    expect(results).toHaveLength(1)
    expect(results[0].success).toBe(false)
    expect(provider.actionAddLabels).not.toHaveBeenCalled()
  })

  it('should execute all actions with allowDangerous', async () => {
    const provider = createMockProvider()
    const actions: Action[] = [
      { type: 'close', number: 123 },
      { type: 'merge', number: 456, dangerous: true },
    ]

    const results = await executeActions(provider, actions, { allowDangerous: true })

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
  })
})
