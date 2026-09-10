import type { ProviderProjectItemConnection, ProviderReviewThread, ProviderStatusCheckRollup } from '../types/graphql-provider'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export interface PullRequestAugmentations {
  projectConnections: ProviderProjectItemConnection | null
  statusCheckRollups: ProviderStatusCheckRollup[]
  reviewThreads: ProviderReviewThread[]
}

export async function writePullAugmentations(
  pullDirectory: string,
  number: number,
  augmentations: PullRequestAugmentations,
): Promise<void> {
  const augmentDir = join(pullDirectory, `${String(number).padStart(5, '0')}-augment`)
  await mkdir(augmentDir, { recursive: true })

  if (augmentations.projectConnections && augmentations.projectConnections.projectV2Items.length > 0) {
    const projectsPath = join(augmentDir, 'projects.md')
    const projectsContent = renderProjectConnections(augmentations.projectConnections)
    await writeFile(projectsPath, projectsContent, 'utf-8')
  }

  if (augmentations.statusCheckRollups.length > 0) {
    const statusPath = join(augmentDir, 'status-checks.md')
    const statusContent = renderStatusCheckRollups(augmentations.statusCheckRollups)
    await writeFile(statusPath, statusContent, 'utf-8')
  }

  if (augmentations.reviewThreads.length > 0) {
    const threadsPath = join(augmentDir, 'review-threads.md')
    const threadsContent = renderReviewThreads(augmentations.reviewThreads)
    await writeFile(threadsPath, threadsContent, 'utf-8')
  }
}

function renderProjectConnections(connections: ProviderProjectItemConnection): string {
  const lines: string[] = [
    '# Project Connections',
    '',
    `This pull request is in ${connections.projectV2Items.length} project(s):`,
    '',
  ]

  for (const item of connections.projectV2Items) {
    lines.push(
      `## Project #${item.projectNumber}: ${item.projectTitle}`,
      '',
    )

    if (item.fieldValues.length > 0) {
      lines.push('### Field Values', '')
      for (const fv of item.fieldValues) {
        const value = fv.value != null ? String(fv.value) : 'N/A'
        lines.push(`- **${fv.fieldName}:** ${value}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

function renderStatusCheckRollups(rollups: ProviderStatusCheckRollup[]): string {
  const lines: string[] = [
    '# Status Check Rollups',
    '',
  ]

  for (const rollup of rollups) {
    lines.push(
      `## Commit: \`${rollup.commit.sha.slice(0, 7)}\``,
      '',
      `**Overall state:** ${rollup.state}`,
      '',
      '### Checks',
      '',
    )

    for (const ctx of rollup.contexts) {
      const icon = ctx.state === 'SUCCESS' ? '✅' : ctx.state === 'FAILURE' ? '❌' : ctx.state === 'PENDING' ? '⏳' : '⚠️'
      lines.push(`#### ${icon} ${ctx.context}`)

      if (ctx.description)
        lines.push('', ctx.description)

      if (ctx.targetUrl)
        lines.push('', `**Details:** ${ctx.targetUrl}`)

      lines.push(
        '',
        `**Created:** ${new Date(ctx.createdAt).toISOString()}`,
        '',
      )
    }
  }

  return lines.join('\n')
}

function renderReviewThreads(threads: ProviderReviewThread[]): string {
  const lines: string[] = [
    '# Review Threads',
    '',
    `Total threads: ${threads.length}`,
    '',
  ]

  const resolved = threads.filter(t => t.isResolved)
  const unresolved = threads.filter(t => !t.isResolved)

  if (unresolved.length > 0) {
    lines.push(`## Unresolved (${unresolved.length})`, '')
    for (const thread of unresolved)
      lines.push(...renderThread(thread))
  }

  if (resolved.length > 0) {
    lines.push(`## Resolved (${resolved.length})`, '')
    for (const thread of resolved)
      lines.push(...renderThread(thread))
  }

  return lines.join('\n')
}

function renderThread(thread: ProviderReviewThread): string[] {
  const lines: string[] = []

  const status = thread.isResolved ? '✅ Resolved' : '🔴 Unresolved'
  const outdated = thread.isOutdated ? ' (Outdated)' : ''

  lines.push(
    `### ${status}${outdated}`,
    '',
    `**File:** \`${thread.path}\``,
  )

  if (thread.line != null)
    lines.push(`**Line:** ${thread.line} (${thread.diffSide})`)

  if (thread.startLine != null)
    lines.push(`**Lines:** ${thread.startLine}-${thread.line}`)

  lines.push('')

  for (const comment of thread.comments) {
    const author = comment.author ?? 'Unknown'
    lines.push(
      `#### ${author} - ${new Date(comment.createdAt).toISOString()}`,
      '',
      comment.body,
      '',
    )
  }

  if (thread.suggestedChange) {
    lines.push(
      '**Suggested Change:**',
      '',
      '```',
      thread.suggestedChange.suggestedCode,
      '```',
      '',
    )
  }

  return lines
}
