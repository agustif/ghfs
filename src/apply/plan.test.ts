import { describe, expect, it } from 'vitest'
import type { Action } from './types'
import { describeAction, filterDangerousActions, filterSafeActions, planActions } from './plan'

describe('planActions', () => {
  it('should count safe and dangerous actions', () => {
    const actions: Action[] = [
      { type: 'close', number: 123 },
      { type: 'merge', number: 456, dangerous: true },
      { type: 'add-labels', number: 789, labels: ['bug'] },
      { type: 'create-review', number: 100, event: 'APPROVE', body: 'LGTM' },
    ]

    const plan = planActions(actions)

    expect(plan.actions).toEqual(actions)
    expect(plan.safeCount).toBe(2)
    expect(plan.dangerousCount).toBe(2)
  })

  it('should handle empty actions', () => {
    const plan = planActions([])

    expect(plan.actions).toEqual([])
    expect(plan.safeCount).toBe(0)
    expect(plan.dangerousCount).toBe(0)
  })

  it('should handle all safe actions', () => {
    const actions: Action[] = [
      { type: 'close', number: 123 },
      { type: 'add-labels', number: 456, labels: ['bug'] },
    ]

    const plan = planActions(actions)

    expect(plan.safeCount).toBe(2)
    expect(plan.dangerousCount).toBe(0)
  })

  it('should handle all dangerous actions', () => {
    const actions: Action[] = [
      { type: 'merge', number: 123, dangerous: true },
      { type: 'create-review', number: 456, event: 'APPROVE' },
    ]

    const plan = planActions(actions)

    expect(plan.safeCount).toBe(0)
    expect(plan.dangerousCount).toBe(2)
  })
})

describe('filterSafeActions', () => {
  it('should filter safe actions', () => {
    const actions: Action[] = [
      { type: 'close', number: 123 },
      { type: 'merge', number: 456, dangerous: true },
      { type: 'add-labels', number: 789, labels: ['bug'] },
    ]

    const safe = filterSafeActions(actions)

    expect(safe).toHaveLength(2)
    expect(safe[0].type).toBe('close')
    expect(safe[1].type).toBe('add-labels')
  })
})

describe('filterDangerousActions', () => {
  it('should filter dangerous actions', () => {
    const actions: Action[] = [
      { type: 'close', number: 123 },
      { type: 'merge', number: 456, dangerous: true },
      { type: 'create-review', number: 789, event: 'APPROVE' },
    ]

    const dangerous = filterDangerousActions(actions)

    expect(dangerous).toHaveLength(2)
    expect(dangerous[0].type).toBe('merge')
    expect(dangerous[1].type).toBe('create-review')
  })
})

describe('describeAction', () => {
  it('should describe close action', () => {
    const action: Action = { type: 'close', number: 123 }
    expect(describeAction(action)).toBe('Close #123')
  })

  it('should describe reopen action', () => {
    const action: Action = { type: 'reopen', number: 123 }
    expect(describeAction(action)).toBe('Reopen #123')
  })

  it('should describe set-title action', () => {
    const action: Action = { type: 'set-title', number: 123, title: 'New Title' }
    expect(describeAction(action)).toBe('Set title of #123 to "New Title"')
  })

  it('should describe set-body action', () => {
    const action: Action = { type: 'set-body', number: 123, body: 'New body' }
    expect(describeAction(action)).toBe('Set body of #123')
  })

  it('should describe create-comment action', () => {
    const action: Action = { type: 'create-comment', number: 123, body: 'Comment' }
    expect(describeAction(action)).toBe('Add comment to #123')
  })

  it('should describe add-labels action', () => {
    const action: Action = { type: 'add-labels', number: 123, labels: ['bug', 'feature'] }
    expect(describeAction(action)).toBe('Add labels [bug, feature] to #123')
  })

  it('should describe remove-labels action', () => {
    const action: Action = { type: 'remove-labels', number: 123, labels: ['wontfix'] }
    expect(describeAction(action)).toBe('Remove labels [wontfix] from #123')
  })

  it('should describe set-labels action', () => {
    const action: Action = { type: 'set-labels', number: 123, labels: ['bug'] }
    expect(describeAction(action)).toBe('Set labels of #123 to [bug]')
  })

  it('should describe add-assignees action', () => {
    const action: Action = { type: 'add-assignees', number: 123, assignees: ['alice', 'bob'] }
    expect(describeAction(action)).toBe('Add assignees [alice, bob] to #123')
  })

  it('should describe remove-assignees action', () => {
    const action: Action = { type: 'remove-assignees', number: 123, assignees: ['charlie'] }
    expect(describeAction(action)).toBe('Remove assignees [charlie] from #123')
  })

  it('should describe set-assignees action', () => {
    const action: Action = { type: 'set-assignees', number: 123, assignees: ['dave'] }
    expect(describeAction(action)).toBe('Set assignees of #123 to [dave]')
  })

  it('should describe set-milestone action', () => {
    const action: Action = { type: 'set-milestone', number: 123, milestone: 'v1.0' }
    expect(describeAction(action)).toBe('Set milestone of #123 to "v1.0"')
  })

  it('should describe clear-milestone action', () => {
    const action: Action = { type: 'clear-milestone', number: 123 }
    expect(describeAction(action)).toBe('Clear milestone of #123')
  })

  it('should describe lock action with reason', () => {
    const action: Action = { type: 'lock', number: 123, reason: 'spam' }
    expect(describeAction(action)).toBe('Lock #123 (spam)')
  })

  it('should describe lock action without reason', () => {
    const action: Action = { type: 'lock', number: 123 }
    expect(describeAction(action)).toBe('Lock #123')
  })

  it('should describe unlock action', () => {
    const action: Action = { type: 'unlock', number: 123 }
    expect(describeAction(action)).toBe('Unlock #123')
  })

  it('should describe request-reviewers action', () => {
    const action: Action = { type: 'request-reviewers', number: 123, reviewers: ['reviewer1'] }
    expect(describeAction(action)).toBe('Request reviewers [reviewer1] for #123')
  })

  it('should describe remove-reviewers action', () => {
    const action: Action = { type: 'remove-reviewers', number: 123, reviewers: ['reviewer2'] }
    expect(describeAction(action)).toBe('Remove reviewers [reviewer2] from #123')
  })

  it('should describe mark-ready-for-review action', () => {
    const action: Action = { type: 'mark-ready-for-review', number: 123 }
    expect(describeAction(action)).toBe('Mark #123 ready for review')
  })

  it('should describe convert-to-draft action', () => {
    const action: Action = { type: 'convert-to-draft', number: 123 }
    expect(describeAction(action)).toBe('Convert #123 to draft')
  })

  it('should describe create-review action', () => {
    const action: Action = { type: 'create-review', number: 123, event: 'APPROVE' }
    expect(describeAction(action)).toBe('Submit approve review on #123')
  })

  it('should describe merge action with method', () => {
    const action: Action = { type: 'merge', number: 123, dangerous: true, method: 'squash' }
    expect(describeAction(action)).toBe('Merge #123 (squash)')
  })

  it('should describe merge action without method', () => {
    const action: Action = { type: 'merge', number: 123, dangerous: true }
    expect(describeAction(action)).toBe('Merge #123 (squash)')
  })

  it('should describe update-pull action', () => {
    const action: Action = { type: 'update-pull', number: 123, title: 'New' }
    expect(describeAction(action)).toBe('Update #123')
  })

  it('should describe add-reaction action', () => {
    const action: Action = { type: 'add-reaction', number: 123, reaction: '+1' }
    expect(describeAction(action)).toBe('Add reaction +1 to #123')
  })

  it('should describe remove-reaction action', () => {
    const action: Action = { type: 'remove-reaction', number: 123, reaction: '-1' }
    expect(describeAction(action)).toBe('Remove reaction -1 from #123')
  })
})
