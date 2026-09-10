import type { SyncContext } from './sync-repository-types'
import { writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncMergeQueue(context: SyncContext): Promise<{
  written: number
}> {
  if (!context.config.sync.mergeQueue)
    return { written: 0 }

  // TODO: Register with graph.jsonl when foundation lands
  // Tier: HOT (sync every time - queue changes frequently)

  try {
    const entries = await context.provider.fetchMergeQueueEntries()
    if (entries.length === 0)
      return { written: 0 }

    const lines: string[] = []
    lines.push('# Merge Queue\n')
    lines.push(`Last synced: ${new Date().toISOString()}\n`)
    lines.push(`Total entries: ${entries.length}\n`)

    for (const entry of entries) {
      lines.push(`## Position ${entry.position}: PR #${entry.pullRequest.number}\n`)
      lines.push(`**Title**: ${entry.pullRequest.title}`)
      lines.push(`**Author**: @${entry.pullRequest.author ?? 'unknown'}`)
      lines.push(`**State**: ${entry.state}`)
      lines.push(`**Enqueued**: ${new Date(entry.enqueuedAt).toISOString()}`)

      if (entry.estimatedTimeToMerge)
        lines.push(`**Estimated Time to Merge**: ${entry.estimatedTimeToMerge}`)

      if (entry.baseCommit)
        lines.push(`**Base Commit**: \`${entry.baseCommit.sha.slice(0, 7)}\` - ${entry.baseCommit.message.split('\n')[0]}`)

      if (entry.headCommit)
        lines.push(`**Head Commit**: \`${entry.headCommit.sha.slice(0, 7)}\` - ${entry.headCommit.message.split('\n')[0]}`)

      lines.push(`**URL**: ${entry.pullRequest.url}\n`)
    }

    const mergeQueuePath = join(context.storageDirAbsolute, 'merge-queue.md')
    await writeFile(mergeQueuePath, lines.join('\n'), 'utf8')

    return { written: 1 }
  }
  catch {
    return { written: 0 }
  }
}
import type { ProviderMergeQueueEntry } from '../types/graphql-provider'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncMergeQueue(
  directory: string,
  entries: ProviderMergeQueueEntry[],
): Promise<void> {
  const mergeQueueDir = join(directory, 'merge-queue')
  await mkdir(mergeQueueDir, { recursive: true })

  const indexPath = join(mergeQueueDir, 'index.md')
  const indexContent = renderMergeQueueIndex(entries)
  await writeFile(indexPath, indexContent, 'utf-8')

  for (const entry of entries) {
    const entryPath = join(mergeQueueDir, `${String(entry.pullRequest.number).padStart(5, '0')}.md`)
    const entryContent = renderMergeQueueEntry(entry)
    await writeFile(entryPath, entryContent, 'utf-8')
  }
}

function renderMergeQueueIndex(entries: ProviderMergeQueueEntry[]): string {
  const lines: string[] = [
    '# Merge Queue',
    '',
    `Total entries: ${entries.length}`,
    '',
    '| Position | PR | State | Enqueued At | Estimated Time to Merge |',
    '|----------|-------|-------|-------------|-------------------------|',
  ]

  for (const entry of entries) {
    const prLink = `[#${entry.pullRequest.number}](${entry.pullRequest.url})`
    const state = entry.state.toLowerCase().replace(/_/g, ' ')
    const enqueuedAt = new Date(entry.enqueuedAt).toISOString()
    const estimatedTime = entry.estimatedTimeToMerge
      ? new Date(entry.estimatedTimeToMerge).toISOString()
      : 'N/A'

    lines.push(`| ${entry.position} | ${prLink} | ${state} | ${enqueuedAt} | ${estimatedTime} |`)
  }

  lines.push('')
  return lines.join('\n')
}

function renderMergeQueueEntry(entry: ProviderMergeQueueEntry): string {
  const lines: string[] = [
    '---',
    `id: ${entry.id}`,
    `pr_number: ${entry.pullRequest.number}`,
    `position: ${entry.position}`,
    `state: ${entry.state}`,
    `enqueued_at: ${entry.enqueuedAt}`,
    entry.estimatedTimeToMerge ? `estimated_time_to_merge: ${entry.estimatedTimeToMerge}` : '',
    '---',
    '',
    `# ${entry.pullRequest.title}`,
    '',
    `**PR:** [#${entry.pullRequest.number}](${entry.pullRequest.url})`,
    `**Position in queue:** ${entry.position}`,
    `**State:** ${entry.state}`,
    `**Enqueued at:** ${entry.enqueuedAt}`,
  ]

  if (entry.estimatedTimeToMerge)
    lines.push(`**Estimated time to merge:** ${entry.estimatedTimeToMerge}`)

  lines.push(
    '',
    '## Head Commit',
    '',
    `**SHA:** \`${entry.headCommit.sha}\``,
    '',
    '```',
    entry.headCommit.message,
    '```',
    '',
  )

  return lines.filter(Boolean).join('\n')
}
