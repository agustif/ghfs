// @ts-nocheck
import type { ProviderEvent } from '../types/provider'
import type { SyncContext } from './sync-repository-types'

export interface ActivitySummary {
  events: Array<{
    id: string
    type: string
    actor: string | null
    createdAt: string
    description: string
  }>
  syncedAt: string
}

export async function buildActivitySummary(
  context: SyncContext,
  limit = 50,
): Promise<ActivitySummary | null> {
  if (!context.provider.fetchEvents)
    return null

  try {
    const events = await context.provider.fetchEvents(limit)
    return {
      events: events.map(event => ({
        id: event.id,
        type: event.type,
        actor: event.actor,
        createdAt: event.createdAt,
        description: formatEventDescription(event),
      })),
      syncedAt: context.syncedAt,
    }
  }
  catch {
    return null
  }
}

function formatEventDescription(event: ProviderEvent): string {
  const payload = event.payload ?? {}

  switch (event.type) {
    case 'PushEvent':
      return `pushed ${payload.size ?? 0} commit(s) to ${payload.ref ?? 'unknown'}`
    case 'PullRequestEvent':
      return `${payload.action ?? 'opened'} pull request #${payload.number ?? 'unknown'}`
    case 'IssuesEvent':
      return `${payload.action ?? 'opened'} issue #${payload.number ?? 'unknown'}`
    case 'IssueCommentEvent':
      return `commented on #${payload.issue?.number ?? 'unknown'}`
    case 'CreateEvent':
      return `created ${payload.ref_type ?? 'ref'} ${payload.ref ?? ''}`
    case 'DeleteEvent':
      return `deleted ${payload.ref_type ?? 'ref'} ${payload.ref ?? ''}`
    case 'ForkEvent':
      return `forked to ${payload.forkee?.full_name ?? 'unknown'}`
    case 'WatchEvent':
      return `starred the repository`
    case 'ReleaseEvent':
      return `${payload.action ?? 'published'} release ${payload.release?.tag_name ?? 'unknown'}`
    default:
      return event.type.replace(/Event$/, '').toLowerCase()
  }
}

export function renderActivitySummary(summary: ActivitySummary): string {
  const lines: string[] = [
    '# Repository Activity',
    '',
    `Synced at: ${summary.syncedAt}`,
    `Total events: ${summary.events.length}`,
    '',
  ]

  if (summary.events.length === 0) {
    lines.push('No recent activity')
    return `${lines.join('\n')}\n`
  }

  lines.push('## Recent Events', '')

  for (const event of summary.events) {
    const timestamp = new Date(event.createdAt).toISOString()
    const actor = event.actor ?? 'unknown'
    lines.push(`- **${timestamp}** - @${actor} ${event.description}`)
  }

  lines.push('')
  return lines.join('\n')
}
