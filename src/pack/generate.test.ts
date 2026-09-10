import type { SyncItemState } from '../types'
import { describe, expect, it } from 'vitest'
import { generatePack } from './generate'

describe('generate', () => {
  const mockItemState: SyncItemState = {
    number: 123,
    kind: 'issue',
    state: 'open',
    lastUpdatedAt: '2026-09-10T00:00:00Z',
    lastSyncedAt: '2026-09-10T01:00:00Z',
    filePath: 'issues/00123-test-issue.md',
    data: {
      item: {
        number: 123,
        kind: 'issue',
        state: 'open',
        updatedAt: '2026-09-10T00:00:00Z',
        createdAt: '2026-09-01T00:00:00Z',
        closedAt: null,
        title: 'Test Issue',
        body: 'This is a test issue body',
        author: 'testuser',
        labels: ['bug', 'enhancement'],
        assignees: ['assignee1'],
        milestone: 'v1.0',
        url: 'https://github.com/test/repo/issues/123',
      },
      comments: [
        {
          id: 1,
          body: 'First comment',
          createdAt: '2026-09-02T00:00:00Z',
          updatedAt: '2026-09-02T00:00:00Z',
          author: 'commenter1',
        },
        {
          id: 2,
          body: 'Second comment',
          createdAt: '2026-09-03T00:00:00Z',
          updatedAt: '2026-09-03T00:00:00Z',
          author: 'commenter2',
        },
      ],
    },
  }

  describe('small pack', () => {
    it('generates small pack for issue', () => {
      const pack = generatePack({ size: 'small', itemState: mockItemState })

      expect(pack.metadata.size).toBe('small')
      expect(pack.metadata.chunkId).toBe('ghfs:issue:123:body')
      expect(pack.content.number).toBe(123)
      expect(pack.content.title).toBe('Test Issue')
      expect(pack.content.state).toBe('open')
      expect('body' in pack.content).toBe(false)
    })

    it('includes gate summary for pull request', () => {
      const prState: SyncItemState = {
        ...mockItemState,
        kind: 'pull',
        data: {
          ...mockItemState.data,
          item: { ...mockItemState.data.item, kind: 'pull' },
          pull: {
            isDraft: false,
            merged: false,
            mergedAt: null,
            baseRef: 'main',
            headRef: 'feature',
            requestedReviewers: ['reviewer1'],
            mergeable: true,
            mergeableState: 'clean',
            reviewDecision: 'approved',
          },
        },
      }

      const pack = generatePack({ size: 'small', itemState: prState })

      expect(pack.content.gate).toBeDefined()
      expect(pack.content.gate?.mergeable).toBe(true)
      expect(pack.content.gate?.reviewDecision).toBe('approved')
      expect(pack.content.gate?.checksDigestPlaceholder).toContain('PR #2')
    })
  })

  describe('medium pack', () => {
    it('generates medium pack with body and metadata', () => {
      const pack = generatePack({ size: 'medium', itemState: mockItemState })

      expect(pack.metadata.size).toBe('medium')
      expect(pack.content.body).toBe('This is a test issue body')
      expect(pack.content.author).toBe('testuser')
      expect(pack.content.labels).toEqual(['bug', 'enhancement'])
      expect('commentCount' in pack.content).toBe(false)
    })
  })

  describe('large pack', () => {
    it('generates large pack with full details', () => {
      const pack = generatePack({ size: 'large', itemState: mockItemState })

      expect(pack.metadata.size).toBe('large')
      expect(pack.content.assignees).toEqual(['assignee1'])
      expect(pack.content.milestone).toBe('v1.0')
      expect(pack.content.commentCount).toBe(2)
      expect(pack.content.commentSummary).toContain('2 comments')
      expect(pack.content.commentSummary).toContain('2 participants')
    })

    it('includes owners list', () => {
      const pack = generatePack({ size: 'large', itemState: mockItemState })

      expect(pack.content.owners).toBeDefined()
      expect(pack.content.owners?.length).toBeGreaterThan(0)
      expect(pack.content.owners?.find(o => o.login === 'testuser')?.role).toBe('author')
      expect(pack.content.owners?.find(o => o.login === 'assignee1')?.role).toBe('assignee')
    })

    it('includes PR details for pull requests', () => {
      const prState: SyncItemState = {
        ...mockItemState,
        kind: 'pull',
        data: {
          ...mockItemState.data,
          item: { ...mockItemState.data.item, kind: 'pull' },
          pull: {
            isDraft: true,
            merged: false,
            mergedAt: null,
            baseRef: 'main',
            headRef: 'feature',
            requestedReviewers: ['reviewer1', 'reviewer2'],
            mergeable: null,
            mergeableState: 'unknown',
            reviewDecision: 'review_required',
          },
        },
      }

      const pack = generatePack({ size: 'large', itemState: prState })

      expect(pack.content.pr).toBeDefined()
      expect(pack.content.pr?.isDraft).toBe(true)
      expect(pack.content.pr?.baseRef).toBe('main')
      expect(pack.content.pr?.requestedReviewers).toEqual(['reviewer1', 'reviewer2'])
    })
  })
})
