import type { SyncItemState } from '../types'

export interface MeSummary {
  assigned: Array<{
    number: number
    kind: 'issue' | 'pull'
    title: string
    state: 'open' | 'closed'
    updatedAt: string
  }>
  reviewRequested: Array<{
    number: number
    title: string
    state: 'open' | 'closed'
    updatedAt: string
  }>
  mentions: Array<{
    number: number
    kind: 'issue' | 'pull'
    title: string
    state: 'open' | 'closed'
    updatedAt: string
    context: string
  }>
  syncedAt: string
}

export function buildMeSummary(
  items: Record<string, SyncItemState>,
  currentUser: string | null,
  syncedAt: string,
): MeSummary | null {
  if (!currentUser)
    return null

  const assigned: MeSummary['assigned'] = []
  const reviewRequested: MeSummary['reviewRequested'] = []
  const mentions: MeSummary['mentions'] = []

  for (const item of Object.values(items)) {
    if (item.data.item.assignees?.includes(currentUser)) {
      assigned.push({
        number: item.number,
        kind: item.kind,
        title: item.data.item.title,
        state: item.state,
        updatedAt: item.data.item.updatedAt,
      })
    }

    if (item.kind === 'pull' && item.data.pull?.requestedReviewers?.includes(currentUser)) {
      reviewRequested.push({
        number: item.number,
        title: item.data.item.title,
        state: item.state,
        updatedAt: item.data.item.updatedAt,
      })
    }

    const bodyMention = item.data.item.body?.includes(`@${currentUser}`)
    if (bodyMention) {
      mentions.push({
        number: item.number,
        kind: item.kind,
        title: item.data.item.title,
        state: item.state,
        updatedAt: item.data.item.updatedAt,
        context: 'body',
      })
    }

    for (const comment of item.data.comments ?? []) {
      if (comment.body?.includes(`@${currentUser}`)) {
        mentions.push({
          number: item.number,
          kind: item.kind,
          title: item.data.item.title,
          state: item.state,
          updatedAt: item.data.item.updatedAt,
          context: 'comment',
        })
        break
      }
    }
  }

  return {
    assigned: assigned.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    reviewRequested: reviewRequested.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    mentions: mentions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    syncedAt,
  }
}

export function renderMeSummary(summary: MeSummary): string {
  const lines: string[] = [
    '# My Items',
    '',
    `Synced at: ${summary.syncedAt}`,
    '',
  ]

  lines.push(`## Assigned to me (${summary.assigned.length})`, '')
  if (summary.assigned.length > 0) {
    for (const item of summary.assigned) {
      lines.push(`- [${item.state === 'open' ? ' ' : 'x'}] #${item.number} ${item.title}`)
    }
  }
  else {
    lines.push('None')
  }
  lines.push('')

  lines.push(`## Review requested (${summary.reviewRequested.length})`, '')
  if (summary.reviewRequested.length > 0) {
    for (const item of summary.reviewRequested) {
      lines.push(`- [${item.state === 'open' ? ' ' : 'x'}] #${item.number} ${item.title}`)
    }
  }
  else {
    lines.push('None')
  }
  lines.push('')

  lines.push(`## Mentions (${summary.mentions.length})`, '')
  if (summary.mentions.length > 0) {
    for (const item of summary.mentions) {
      lines.push(`- #${item.number} ${item.title} (in ${item.context})`)
    }
  }
  else {
    lines.push('None')
  }
  lines.push('')

  return lines.join('\n')
}
