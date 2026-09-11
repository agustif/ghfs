// @ts-nocheck
import type { GhfsResolvedConfig } from '../types'
import type { RepositoryProvider } from '../types/provider'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { getStorageDirAbsolute } from '../config/load'

interface SearchResultBase {
  source: string
  timestamp: string
}

interface CodeTodoResult extends SearchResultBase {
  type: 'code'
  path: string
  sha: string
  url: string
  fragments: string[]
}

interface CommitRefResult extends SearchResultBase {
  type: 'commit'
  sha: string
  message: string
  author: string
  date: string
  url: string
  references: number[]
}

interface IssueSearchResult extends SearchResultBase {
  type: 'issue'
  number: number
  title: string
  state: 'open' | 'closed'
  url: string
  labels: string[]
  author: string | null
  created: string
  updated: string
}

export async function runSearchCoverage(
  config: GhfsResolvedConfig,
  provider: RepositoryProvider,
): Promise<void> {
  if (!config.search)
    return

  const storageDir = getStorageDirAbsolute(config)
  const searchDir = join(storageDir, 'search')

  await mkdir(searchDir, { recursive: true })

  const timestamp = new Date().toISOString()

  if (config.search.codeTodos)
    await searchCodeTodos(provider, searchDir, timestamp, config.search.maxResults)

  if (config.search.commitRefs)
    await searchCommitRefs(provider, searchDir, timestamp, config.search.maxResults)

  if (config.search.issueQueries && Object.keys(config.search.issueQueries).length > 0)
    await runIssueSearches(provider, searchDir, timestamp, config.search.issueQueries, config.search.maxResults)

  if (config.search.mentions)
    await searchMentions(provider, config.repo, searchDir, timestamp, config.search.maxResults)
}

async function searchCodeTodos(
  provider: RepositoryProvider,
  searchDir: string,
  timestamp: string,
  maxResults: number,
): Promise<void> {
  const queries = ['TODO', 'FIXME', '@todo', '@fixme']
  const allResults: CodeTodoResult[] = []

  for (const term of queries) {
    try {
      const results = await provider.searchCode({
        query: term,
        maxResults: Math.ceil(maxResults / queries.length),
      })

      for (const item of results) {
        allResults.push({
          type: 'code',
          source: 'code-search',
          timestamp,
          path: item.path,
          sha: item.sha,
          url: item.url,
          fragments: item.text_matches?.map(m => m.fragment) ?? [],
        })
      }
    }
    catch {
    }
  }

  const outputPath = join(searchDir, 'code-todos.jsonl')
  await writeJsonl(outputPath, allResults)
}

async function searchCommitRefs(
  provider: RepositoryProvider,
  searchDir: string,
  timestamp: string,
  maxResults: number,
): Promise<void> {
  const results: CommitRefResult[] = []

  try {
    const commits = await provider.searchCommits({
      query: 'fixes OR closes OR resolves OR fix OR close OR resolve',
      maxResults,
      sort: 'committer-date',
      order: 'desc',
    })

    for (const commit of commits) {
      const message = commit.commit.message
      const issueRefs = extractIssueReferences(message)

      if (issueRefs.length > 0) {
        results.push({
          type: 'commit',
          source: 'commit-search',
          timestamp,
          sha: commit.sha,
          message,
          author: commit.author?.login ?? commit.commit.author.name,
          date: commit.commit.author.date,
          url: commit.html_url,
          references: issueRefs,
        })
      }
    }
  }
  catch {
  }

  const outputPath = join(searchDir, 'commit-refs.jsonl')
  await writeJsonl(outputPath, results)
}

async function runIssueSearches(
  provider: RepositoryProvider,
  searchDir: string,
  timestamp: string,
  queries: Record<string, string>,
  maxResults: number,
): Promise<void> {
  for (const [key, query] of Object.entries(queries)) {
    try {
      const results = await provider.searchIssues({
        query,
        maxResults,
      })

      const mapped: IssueSearchResult[] = results.map(item => ({
        type: 'issue',
        source: `issue-search:${key}`,
        timestamp,
        number: item.number,
        title: item.title,
        state: item.state,
        url: item.html_url,
        labels: item.labels.map(l => l.name),
        author: item.user?.login ?? null,
        created: item.created_at,
        updated: item.updated_at,
      }))

      const outputPath = join(searchDir, `issues-${key}.jsonl`)
      await writeJsonl(outputPath, mapped)
    }
    catch {
    }
  }
}

async function searchMentions(
  provider: RepositoryProvider,
  repo: string,
  searchDir: string,
  timestamp: string,
  maxResults: number,
): Promise<void> {
  const results: IssueSearchResult[] = []

  try {
    const [owner, repoName] = repo.split('/')
    const items = await provider.searchIssues({
      query: `${owner}/${repoName} OR ${repoName}`,
      maxResults,
    })

    for (const item of items) {
      results.push({
        type: 'issue',
        source: 'mention-search',
        timestamp,
        number: item.number,
        title: item.title,
        state: item.state,
        url: item.html_url,
        labels: item.labels.map(l => l.name),
        author: item.user?.login ?? null,
        created: item.created_at,
        updated: item.updated_at,
      })
    }
  }
  catch {
  }

  const outputPath = join(searchDir, 'repo-mentions.jsonl')
  await writeJsonl(outputPath, results)
}

function extractIssueReferences(message: string): number[] {
  const pattern = /(?:fix(?:es|ed)?|close(?:s|d)?|resolve(?:s|d)?)\s+#(\d+)/gi
  const matches = [...message.matchAll(pattern)]
  return [...new Set(matches.map(m => Number.parseInt(m[1], 10)))]
}

async function writeJsonl<T>(path: string, items: T[]): Promise<void> {
  const content = items.map(item => JSON.stringify(item)).join('\n')
  await writeFile(path, content, 'utf-8')
}
