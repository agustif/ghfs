import type { SyncItemState } from '../types'

export interface SearchIndexEntry {
  id: string
  number: number
  kind: 'issue' | 'pull'
  title: string
  labels: string[]
  state: 'open' | 'closed'
  path: string
  author: string | null
  assignees: string[]
  milestone: string | null
  updatedAt: string
}

export function buildSearchIndex(items: Record<string, SyncItemState>): SearchIndexEntry[] {
  return Object.values(items).map(item => ({
    id: `ghfs:${item.kind}:${item.number}`,
    number: item.number,
    kind: item.kind,
    title: item.data.item.title,
    labels: item.data.item.labels ?? [],
    state: item.state,
    path: item.filePath,
    author: item.data.item.author,
    assignees: item.data.item.assignees ?? [],
    milestone: item.data.item.milestone,
    updatedAt: item.data.item.updatedAt,
  }))
}

export function renderSearchIndex(entries: SearchIndexEntry[]): string {
  return `${entries.map(entry => JSON.stringify(entry)).join('\n')}\n`
}
