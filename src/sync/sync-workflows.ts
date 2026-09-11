// @ts-nocheck
import type { SyncContext } from './sync-repository-types'
import { writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncWorkflows(context: SyncContext): Promise<{
  written: number
}> {
  if (!context.config.sync.workflows)
    return { written: 0 }

  try {
    const runs = await context.provider.fetchRecentWorkflowRuns(20)
    if (runs.length === 0)
      return { written: 0 }

    const lines: string[] = []
    lines.push('# Recent Workflow Runs\n')
    lines.push(`Last synced: ${new Date().toISOString()}\n`)
    lines.push(`Total runs: ${runs.length}\n`)

    const statusEmoji: Record<string, string> = {
      completed: '✅',
      in_progress: '🔄',
      queued: '⏳',
      waiting: '⏸️',
    }

    const conclusionEmoji: Record<string, string> = {
      success: '✅',
      failure: '❌',
      cancelled: '🚫',
      skipped: '⏭️',
      timed_out: '⏱️',
    }

    for (const run of runs) {
      const statusIcon = statusEmoji[run.status] ?? '❓'
      const conclusionIcon = run.conclusion ? (conclusionEmoji[run.conclusion] ?? '❓') : ''

      lines.push(`## ${statusIcon} ${conclusionIcon} ${run.name}\n`)
      lines.push(`**Status**: ${run.status}`)

      if (run.conclusion)
        lines.push(`**Conclusion**: ${run.conclusion}`)

      lines.push(`**Branch**: \`${run.headBranch}\``)
      lines.push(`**Commit**: \`${run.headSha.slice(0, 7)}\``)
      lines.push(`**Event**: ${run.event}`)
      lines.push(`**Created**: ${new Date(run.createdAt).toISOString()}`)
      lines.push(`**Updated**: ${new Date(run.updatedAt).toISOString()}`)

      if (run.pullRequests && run.pullRequests.length > 0) {
        const prNumbers = run.pullRequests.map(pr => `#${pr.number}`).join(', ')
        lines.push(`**Pull Requests**: ${prNumbers}`)
      }

      lines.push(`**URL**: ${run.url}\n`)
    }

    const workflowsPath = join(context.storageDirAbsolute, 'workflows.md')
    await writeFile(workflowsPath, lines.join('\n'), 'utf8')

    return { written: 1 }
  }
  catch {
    return { written: 0 }
  }
}
