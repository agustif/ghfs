import { describe, expect, it } from 'vitest'
import { generateChunkId, generateCommentChunkId, generateReviewChunkId } from './chunk-id'

describe('chunk-id', () => {
  describe('generateChunkId', () => {
    it('generates body chunk id for issue', () => {
      expect(generateChunkId('issue', 123)).toBe('ghfs:issue:123:body')
    })

    it('generates body chunk id for pull', () => {
      expect(generateChunkId('pull', 456)).toBe('ghfs:pull:456:body')
    })

    it('generates custom section chunk id', () => {
      expect(generateChunkId('pull', 789, 'timeline')).toBe('ghfs:pull:789:timeline')
    })
  })

  describe('generateReviewChunkId', () => {
    it('generates review chunk id', () => {
      expect(generateReviewChunkId(123, 456)).toBe('ghfs:pull:123:review:456')
    })
  })

  describe('generateCommentChunkId', () => {
    it('generates comment chunk id', () => {
      expect(generateCommentChunkId(123, 789)).toBe('ghfs:pull:123:comment:789')
    })
  })
})
