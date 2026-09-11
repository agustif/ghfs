// @ts-nocheck
import type { SyncContext } from './sync-repository-types'

export async function buildAgentHints(context: SyncContext): Promise<any> {
  const repository = await context.provider.fetchRepository()
  const topics = await context.provider.fetchRepositoryTopics?.()
  const pinnedIssues = await context.provider.fetchPinnedIssues?.()
  const releases = await context.provider.fetchReleases?.(5)

  return {
    repository,
    topics,
    pinnedIssues,
    releases,
    totalIssues: context.syncState.itemsByState.open.length + context.syncState.itemsByState.closed.length,
    totalPulls: Object.values(context.syncState.items).filter(i => i.kind === 'pull').length,
  }
}

export function renderAgentHints(data: any): string {
  const sections: string[] = []

  sections.push('# Repository Agent Hints')
  sections.push('')
  sections.push(`Description: ${data.repository.description || 'No description'}`)
  sections.push('')

  if (data.topics?.names.length) {
    sections.push('## Topics')
    sections.push('')
    sections.push(data.topics.names.map((t: string) => `- ${t}`).join('\n'))
    sections.push('')
  }

  sections.push('## Features')
  sections.push('')
  sections.push(`- Issues: ${data.repository.has_issues ? 'enabled' : 'disabled'}`)
  sections.push(`- Projects: ${data.repository.has_projects ? 'enabled' : 'disabled'}`)
  sections.push(`- Wiki: ${data.repository.has_wiki ? 'enabled' : 'disabled'}`)
  sections.push(`- Merge Queue: ${data.repository.merge_queue_enabled ? 'enabled' : 'disabled'}`)
  sections.push('')

  sections.push('## Activity Summary')
  sections.push('')
  sections.push(`- Total issues tracked: ${data.totalIssues}`)
  sections.push(`- Total PRs tracked: ${data.totalPulls}`)
  sections.push(`- Open issues: ${data.repository.open_issues_count}`)
  sections.push('')

  if (data.pinnedIssues?.length) {
    sections.push('## Pinned Issues')
    sections.push('')
    sections.push('Focus on these issues first:')
    sections.push(data.pinnedIssues.map((n: number) => `- #${n}`).join('\n'))
    sections.push('')
  }

  if (data.releases?.length) {
    sections.push('## Recent Releases')
    sections.push('')
    for (const release of data.releases.slice(0, 3)) {
      sections.push(`- ${release.tag_name} (${release.published_at?.split('T')[0] || 'draft'})`)
    }
    sections.push('')
  }

  sections.push('**Tier**: Issues/PRs = hot, Constitution = cold, Actions = warm')

  return sections.join('\n')
}

export async function generateAgentHints(context: SyncContext): Promise<string> {
  const repository = await context.provider.fetchRepository()
  const topics = await context.provider.fetchRepositoryTopics?.()
  const pinnedIssues = await context.provider.fetchPinnedIssues?.()
  const releases = await context.provider.fetchReleases?.(5)

  const sections: string[] = []

  sections.push('# Repository Agent Hints')
  sections.push('')
  sections.push(`Repository: ${context.repoSlug}`)
  sections.push(`Description: ${repository.description || 'No description'}`)
  sections.push('')

  if (topics?.names.length) {
    sections.push('## Topics')
    sections.push('')
    sections.push(topics.names.map(t => `- ${t}`).join('\n'))
    sections.push('')
  }

  sections.push('## Features')
  sections.push('')
  sections.push(`- Issues: ${repository.has_issues ? 'enabled' : 'disabled'}`)
  sections.push(`- Projects: ${repository.has_projects ? 'enabled' : 'disabled'}`)
  sections.push(`- Wiki: ${repository.has_wiki ? 'enabled' : 'disabled'}`)
  sections.push(`- Merge Queue: ${repository.merge_queue_enabled ? 'enabled' : 'disabled'}`)
  sections.push('')

  sections.push('## Activity Summary')
  sections.push('')
  sections.push(`- Total issues tracked: ${context.totalIssues}`)
  sections.push(`- Total PRs tracked: ${context.totalPulls}`)
  sections.push(`- Open issues: ${repository.open_issues_count}`)
  sections.push('')

  if (pinnedIssues?.length) {
    sections.push('## Pinned Issues')
    sections.push('')
    sections.push('Focus on these issues first:')
    sections.push(pinnedIssues.map(n => `- #${n}`).join('\n'))
    sections.push('')
  }

  if (releases?.length) {
    sections.push('## Recent Releases')
    sections.push('')
    for (const release of releases.slice(0, 3)) {
      sections.push(`- ${release.tag_name} (${release.published_at?.split('T')[0] || 'draft'})`)
    }
    sections.push('')
  }

  const contributingExists = await checkFileExists(context, 'CONTRIBUTING.md')
  if (contributingExists) {
    sections.push('## Contributing')
    sections.push('')
    sections.push('This repository has contributing guidelines. Review CONTRIBUTING.md before submitting PRs.')
    sections.push('')
  }

  sections.push('## Data Freshness')
  sections.push('')
  sections.push(`Last synced: ${context.syncedAt}`)
  sections.push('')
  sections.push('**Tier**: Issues/PRs = hot, Constitution = cold, Actions = warm')

  return sections.join('\n')
}

async function checkFileExists(context: SyncContext, path: string): Promise<boolean> {
  const content = await context.provider.fetchRepositoryContent?.(path)
  return content !== null
}
