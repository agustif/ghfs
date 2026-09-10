import type { GhfsResolvedConfig } from '../types'
import type { RepositoryProvider, SearchCodeResult, SearchCommitResult, SearchIssueResult } from '../types/provider'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runSearchCoverage } from './search'

describe('search coverage', () => {
  let tempDir: string
  let config: GhfsResolvedConfig
  let mockProvider: RepositoryProvider

  beforeEach(() => {
    tempDir = join(tmpdir(), `ghfs-test-${Date.now()}`)
    config = {
      cwd: tempDir,
      repo: 'owner/repo',
      directory: '.ghfs',
      bots: [],
      auth: { token: 'test-token' },
      sync: {
        issues: true,
        pulls: true,
        closed: false,
        patches: 'open',
      },
      search: {
        codeTodos: true,
        commitRefs: true,
        issueQueries: {},
        mentions: false,
        maxResults: 100,
      },
    }

    mockProvider = {
      searchCode: vi.fn().mockResolvedValue([]),
      searchCommits: vi.fn().mockResolvedValue([]),
      searchIssues: vi.fn().mockResolvedValue([]),
    } as unknown as RepositoryProvider
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create search directory', async () => {
    await runSearchCoverage(config, mockProvider)
    const searchDir = join(tempDir, '.ghfs', 'search')
    expect(existsSync(searchDir)).toBe(true)
  })

  it('should search for TODOs and FIXMEs', async () => {
    const mockResults: SearchCodeResult[] = [
      {
        name: 'test.ts',
        path: 'src/test.ts',
        sha: 'abc123',
        url: 'https://github.com/owner/repo/blob/main/src/test.ts',
        repository: { full_name: 'owner/repo' },
        text_matches: [{ fragment: 'TODO: fix this' }],
      },
    ]
    vi.mocked(mockProvider.searchCode).mockResolvedValue(mockResults)

    await runSearchCoverage(config, mockProvider)

    expect(mockProvider.searchCode).toHaveBeenCalledTimes(4)
    expect(mockProvider.searchCode).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'TODO' }),
    )
    expect(mockProvider.searchCode).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FIXME' }),
    )

    const outputPath = join(tempDir, '.ghfs', 'search', 'code-todos.jsonl')
    expect(existsSync(outputPath)).toBe(true)
  })

  it('should search for commit references', async () => {
    const mockResults: SearchCommitResult[] = [
      {
        sha: 'def456',
        commit: {
          message: 'fixes #123',
          author: { name: 'Test User', date: '2024-01-01T00:00:00Z' },
        },
        html_url: 'https://github.com/owner/repo/commit/def456',
        author: { login: 'testuser' },
      },
    ]
    vi.mocked(mockProvider.searchCommits).mockResolvedValue(mockResults)

    await runSearchCoverage(config, mockProvider)

    expect(mockProvider.searchCommits).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining('fixes'),
      }),
    )

    const outputPath = join(tempDir, '.ghfs', 'search', 'commit-refs.jsonl')
    expect(existsSync(outputPath)).toBe(true)

    const content = await readFile(outputPath, 'utf-8')
    const result = JSON.parse(content)
    expect(result.references).toEqual([123])
  })

  it('should run saved issue queries', async () => {
    config.search.issueQueries = {
      'p1-bugs': 'is:issue is:open label:bug label:p1',
      'needs-triage': 'is:issue is:open no:label',
    }

    const mockResults: SearchIssueResult[] = [
      {
        number: 456,
        title: 'Bug report',
        state: 'open',
        html_url: 'https://github.com/owner/repo/issues/456',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        labels: [{ name: 'bug' }, { name: 'p1' }],
        user: { login: 'reporter' },
      },
    ]
    vi.mocked(mockProvider.searchIssues).mockResolvedValue(mockResults)

    await runSearchCoverage(config, mockProvider)

    expect(mockProvider.searchIssues).toHaveBeenCalledTimes(2)
    expect(existsSync(join(tempDir, '.ghfs', 'search', 'issues-p1-bugs.jsonl'))).toBe(true)
    expect(existsSync(join(tempDir, '.ghfs', 'search', 'issues-needs-triage.jsonl'))).toBe(true)
  })

  it('should skip search when disabled', async () => {
    config.search.codeTodos = false
    config.search.commitRefs = false

    await runSearchCoverage(config, mockProvider)

    expect(mockProvider.searchCode).not.toHaveBeenCalled()
    expect(mockProvider.searchCommits).not.toHaveBeenCalled()
  })

  it('should handle rate limit errors gracefully', async () => {
    vi.mocked(mockProvider.searchCode).mockRejectedValue({ status: 403 })

    await runSearchCoverage(config, mockProvider)

    const outputPath = join(tempDir, '.ghfs', 'search', 'code-todos.jsonl')
    expect(existsSync(outputPath)).toBe(true)
    const content = await readFile(outputPath, 'utf-8')
    expect(content).toBe('')
  })

  it('should respect maxResults setting', async () => {
    config.search.maxResults = 50

    await runSearchCoverage(config, mockProvider)

    expect(mockProvider.searchCode).toHaveBeenCalledWith(
      expect.objectContaining({ maxResults: expect.any(Number) }),
    )
  })

  it('should extract issue references from commit messages', async () => {
    const mockResults: SearchCommitResult[] = [
      {
        sha: 'abc123',
        commit: {
          message: 'Fix bug\n\nFixes #123\nCloses #456\nResolves #789',
          author: { name: 'Test', date: '2024-01-01T00:00:00Z' },
        },
        html_url: 'https://github.com/owner/repo/commit/abc123',
        author: { login: 'test' },
      },
    ]
    vi.mocked(mockProvider.searchCommits).mockResolvedValue(mockResults)

    await runSearchCoverage(config, mockProvider)

    const outputPath = join(tempDir, '.ghfs', 'search', 'commit-refs.jsonl')
    const content = await readFile(outputPath, 'utf-8')
    const result = JSON.parse(content)
    expect(result.references).toEqual([123, 456, 789])
  })

  it('should search for mentions when enabled', async () => {
    config.search.mentions = true

    const mockResults: SearchIssueResult[] = []
    vi.mocked(mockProvider.searchIssues).mockResolvedValue(mockResults)

    await runSearchCoverage(config, mockProvider)

    expect(mockProvider.searchIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining('owner/repo'),
      }),
    )

    const outputPath = join(tempDir, '.ghfs', 'search', 'repo-mentions.jsonl')
    expect(existsSync(outputPath)).toBe(true)
  })
})
