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
