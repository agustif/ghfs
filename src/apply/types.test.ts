import { describe, expect, it } from 'vitest'
import type { Action } from './types'
import { isDangerousAction } from './types'

describe('isDangerousAction', () => {
  it('should identify merge as dangerous', () => {
    const action: Action = { type: 'merge', number: 123, dangerous: true }
    expect(isDangerousAction(action)).toBe(true)
  })

  it('should identify APPROVE review as dangerous', () => {
    const action: Action = { type: 'create-review', number: 123, event: 'APPROVE' }
    expect(isDangerousAction(action)).toBe(true)
  })

  it('should identify REQUEST_CHANGES review as dangerous', () => {
    const action: Action = { type: 'create-review', number: 123, event: 'REQUEST_CHANGES' }
    expect(isDangerousAction(action)).toBe(true)
  })

  it('should not identify COMMENT review as dangerous', () => {
    const action: Action = { type: 'create-review', number: 123, event: 'COMMENT' }
    expect(isDangerousAction(action)).toBe(false)
  })

  it('should not identify close as dangerous', () => {
    const action: Action = { type: 'close', number: 123 }
    expect(isDangerousAction(action)).toBe(false)
  })

  it('should not identify reopen as dangerous', () => {
    const action: Action = { type: 'reopen', number: 123 }
    expect(isDangerousAction(action)).toBe(false)
  })

  it('should not identify add-labels as dangerous', () => {
    const action: Action = { type: 'add-labels', number: 123, labels: ['bug'] }
    expect(isDangerousAction(action)).toBe(false)
  })

  it('should not identify set-title as dangerous', () => {
    const action: Action = { type: 'set-title', number: 123, title: 'New' }
    expect(isDangerousAction(action)).toBe(false)
  })
})
