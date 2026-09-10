import type { ProviderMergeQueueEntry } from '../types/provider'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearMergeQueue,
  getMergeQueueDir,
  getMergeQueueEntryPath,
  readMergeQueueEntries,
  writeMergeQueueEntries,
} from './sync-merge-queue'

describe('sync-merge-queue', () => {
  let tmpDir: string

  afterEach(async () => {
    if (tmpDir)
      await rm(tmpDir, { recursive: true, force: true })
  })

  it('should write and read merge queue entries', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'ghfs-merge-queue-test-'))

    const entries: ProviderMergeQueueEntry[] = [
      {
        id: 'mq1',
        position: 1,
        state: 'QUEUED',
        pullRequest: {
          number: 42,
          title: 'Fix critical bug',
          url: 'https://github.com/owner/repo/pull/42',
          author: 'alice',
        },
        enqueuedAt: '2026-01-10T10:00:00Z',
        estimatedTimeToMerge: 300,
        headCommit: {
          sha: 'abc123',
          message: 'Fix critical bug',
        },
      },
      {
        id: 'mq2',
        position: 2,
        state: 'AWAITING_CHECKS',
        pullRequest: {
          number: 43,
          title: 'Add feature',
          url: 'https://github.com/owner/repo/pull/43',
          author: 'bob',
        },
        enqueuedAt: '2026-01-10T10:05:00Z',
        estimatedTimeToMerge: 600,
        headCommit: {
          sha: 'def456',
          message: 'Add feature',
        },
      },
    ]

    const written = await writeMergeQueueEntries(tmpDir, entries)
    expect(written).toBe(2)

    const queueDir = getMergeQueueDir(tmpDir)
    const files = await readdir(queueDir)
    expect(files).toHaveLength(2)
    expect(files).toContain('001-pr-00042.json')
    expect(files).toContain('002-pr-00043.json')

    const readEntries = await readMergeQueueEntries(tmpDir)
    expect(readEntries).toHaveLength(2)
    expect(readEntries[0].pullRequest.number).toBe(42)
    expect(readEntries[1].pullRequest.number).toBe(43)
  })

  it('should handle empty merge queue', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'ghfs-merge-queue-test-'))

    const written = await writeMergeQueueEntries(tmpDir, [])
    expect(written).toBe(0)

    const readEntries = await readMergeQueueEntries(tmpDir)
    expect(readEntries).toHaveLength(0)
  })

  it('should clear merge queue', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'ghfs-merge-queue-test-'))

    const entries: ProviderMergeQueueEntry[] = [
      {
        id: 'mq1',
        position: 1,
        state: 'QUEUED',
        pullRequest: {
          number: 42,
          title: 'Fix bug',
          url: 'https://github.com/owner/repo/pull/42',
          author: 'alice',
        },
        enqueuedAt: '2026-01-10T10:00:00Z',
        estimatedTimeToMerge: 300,
        headCommit: {
          sha: 'abc123',
          message: 'Fix bug',
        },
      },
    ]

    await writeMergeQueueEntries(tmpDir, entries)
    let readEntries = await readMergeQueueEntries(tmpDir)
    expect(readEntries).toHaveLength(1)

    await clearMergeQueue(tmpDir)
    readEntries = await readMergeQueueEntries(tmpDir)
    expect(readEntries).toHaveLength(0)
  })

  it('should replace existing entries on write', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'ghfs-merge-queue-test-'))

    const entries1: ProviderMergeQueueEntry[] = [
      {
        id: 'mq1',
        position: 1,
        state: 'QUEUED',
        pullRequest: {
          number: 42,
          title: 'Old PR',
          url: 'https://github.com/owner/repo/pull/42',
          author: 'alice',
        },
        enqueuedAt: '2026-01-10T10:00:00Z',
        estimatedTimeToMerge: 300,
        headCommit: null,
      },
    ]

    await writeMergeQueueEntries(tmpDir, entries1)

    const entries2: ProviderMergeQueueEntry[] = [
      {
        id: 'mq2',
        position: 1,
        state: 'MERGEABLE',
        pullRequest: {
          number: 99,
          title: 'New PR',
          url: 'https://github.com/owner/repo/pull/99',
          author: 'charlie',
        },
        enqueuedAt: '2026-01-10T11:00:00Z',
        estimatedTimeToMerge: 120,
        headCommit: {
          sha: 'xyz789',
          message: 'New PR',
        },
      },
    ]

    await writeMergeQueueEntries(tmpDir, entries2)

    const readEntries = await readMergeQueueEntries(tmpDir)
    expect(readEntries).toHaveLength(1)
    expect(readEntries[0].pullRequest.number).toBe(99)
    expect(readEntries[0].pullRequest.title).toBe('New PR')
  })

  it('should generate correct file paths', () => {
    const storagePath = '/tmp/test'

    expect(getMergeQueueDir(storagePath)).toBe('/tmp/test/merge-queue')
    expect(getMergeQueueEntryPath(storagePath, 1, 42)).toBe('/tmp/test/merge-queue/001-pr-00042.json')
    expect(getMergeQueueEntryPath(storagePath, 10, 999)).toBe('/tmp/test/merge-queue/010-pr-00999.json')
  })
})
