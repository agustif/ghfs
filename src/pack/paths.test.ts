import { describe, expect, it } from 'vitest'
import { getPackDirectory, getPackPath } from './paths'

describe('paths', () => {
  const storageDirAbsolute = '/test/storage'

  describe('getPackDirectory', () => {
    it('returns correct directory for small packs', () => {
      expect(getPackDirectory(storageDirAbsolute, 'small')).toBe('/test/storage/packs/small')
    })

    it('returns correct directory for medium packs', () => {
      expect(getPackDirectory(storageDirAbsolute, 'medium')).toBe('/test/storage/packs/medium')
    })

    it('returns correct directory for large packs', () => {
      expect(getPackDirectory(storageDirAbsolute, 'large')).toBe('/test/storage/packs/large')
    })
  })

  describe('getPackPath', () => {
    it('returns correct path for issue pack', () => {
      expect(getPackPath(storageDirAbsolute, 'small', 'issue', 123)).toBe(
        '/test/storage/packs/small/issue-123.md',
      )
    })

    it('returns correct path for pull pack', () => {
      expect(getPackPath(storageDirAbsolute, 'medium', 'pull', 456)).toBe(
        '/test/storage/packs/medium/pr-456.md',
      )
    })
  })
})
