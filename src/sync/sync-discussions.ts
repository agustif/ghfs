// @ts-nocheck
import type { ProviderDiscussion, ProviderDiscussionCategory, ProviderDiscussionComment } from '../types/provider'
import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { formatReactions } from '../utils/reactions'

export async function syncDiscussions(context: SyncContext): Promise<{
  written: number
  skipped: number
}> {
  if (!context.config.sync.discussions)
    return { written: 0, skipped: 0 }

  // TODO: Register with graph.jsonl when foundation lands
  // Tier: WARM (sync if stale - discussions update moderately)

  try {
    const categories = await context.provider.fetchDiscussionCategories()
    if (categories.length === 0)
      return { written: 0, skipped: 0 }

    const discussionsDir = join(context.storageDirAbsolute, 'discussions')
    await mkdir(discussionsDir, { recursive: true })

    let written = 0
    const categoryIndexes: Array<{ category: ProviderDiscussionCategory, discussions: ProviderDiscussion[] }> = []

    for (const category of categories) {
      const categoryDir = join(discussionsDir, sanitizeCategorySlug(category.slug))
      await mkdir(categoryDir, { recursive: true })

      const discussions = await context.provider.fetchDiscussions(category.id)

      for (const discussion of discussions) {
        const fileName = `${String(discussion.number).padStart(5, '0')}-${sanitizeTitle(discussion.title)}.md`
        const filePath = join(categoryDir, fileName)

        const comments = await context.provider.fetchDiscussionComments(discussion.id)
        const content = formatDiscussion(discussion, comments, category)
        await writeFile(filePath, content, 'utf8')
        written++
      }

      categoryIndexes.push({ category, discussions })
    }

    const indexPath = join(context.storageDirAbsolute, 'discussions.md')
    const indexContent = formatDiscussionsIndex(categoryIndexes)
    await writeFile(indexPath, indexContent, 'utf8')
    written++

    return { written, skipped: 0 }
  }
  catch {
    return { written: 0, skipped: 0 }
  }
}

function sanitizeCategorySlug(slug: string): string {
  return slug
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .toLowerCase()
}

function sanitizeTitle(title: string): string {
  return title
    .slice(0, 50)
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .toLowerCase()
}

function formatDiscussion(
  discussion: ProviderDiscussion,
  comments: ProviderDiscussionComment[],
  category: ProviderDiscussionCategory,
): string {
  const lines: string[] = []

  lines.push('---')
  lines.push(`number: ${discussion.number}`)
  lines.push(`title: ${JSON.stringify(discussion.title)}`)
  lines.push(`author: ${discussion.author ?? 'unknown'}`)
  lines.push(`category: ${category.name}`)
  lines.push(`created: ${discussion.createdAt}`)
  lines.push(`updated: ${discussion.updatedAt}`)

  if (discussion.closedAt)
    lines.push(`closed: ${discussion.closedAt}`)

  if (discussion.locked)
    lines.push(`locked: true`)

  if (discussion.answerChosenAt) {
    lines.push(`answered: true`)
    if (discussion.answerChosenBy)
      lines.push(`answer_chosen_by: ${discussion.answerChosenBy}`)
  }

  if (discussion.upvoteCount !== undefined && discussion.upvoteCount > 0)
    lines.push(`upvotes: ${discussion.upvoteCount}`)

  if (discussion.labels && discussion.labels.length > 0) {
    lines.push(`labels:`)
    for (const label of discussion.labels) {
      lines.push(`  - name: ${JSON.stringify(label.name)}`)
      lines.push(`    color: "#${label.color}"`)
    }
  }

  if (discussion.url)
    lines.push(`url: ${discussion.url}`)

  lines.push('---\n')

  lines.push(`# ${discussion.title}\n`)

  if (discussion.author) {
    lines.push(`**Author**: @${discussion.author}`)
  }

  const createdDate = new Date(discussion.createdAt)
  lines.push(`**Created**: ${createdDate.toISOString()}`)

  const updatedDate = new Date(discussion.updatedAt)
  lines.push(`**Updated**: ${updatedDate.toISOString()}`)

  if (discussion.closedAt) {
    const closedDate = new Date(discussion.closedAt)
    lines.push(`**Closed**: ${closedDate.toISOString()}`)
  }

  if (discussion.locked)
    lines.push('**Status**: Locked')

  if (discussion.upvoteCount !== undefined && discussion.upvoteCount > 0)
    lines.push(`**Upvotes**: ${discussion.upvoteCount} 👍`)

  if (discussion.labels && discussion.labels.length > 0) {
    const labelTags = discussion.labels.map(l => `\`${l.name}\``).join(' ')
    lines.push(`**Labels**: ${labelTags}`)
  }

  if (discussion.reactions && discussion.reactions.totalCount > 0) {
    lines.push(`\n**Reactions**: ${formatReactions(discussion.reactions)}`)
  }

  lines.push('\n---\n')

  if (discussion.body) {
    lines.push(discussion.body)
    lines.push('\n')
  }

  if (discussion.poll) {
    lines.push('## 📊 Poll\n')
    lines.push(`**${discussion.poll.question}**\n`)
    lines.push(`Total votes: ${discussion.poll.totalVoteCount}\n`)
    for (const option of discussion.poll.options) {
      const percentage = discussion.poll.totalVoteCount > 0
        ? ((option.totalVoteCount / discussion.poll.totalVoteCount) * 100).toFixed(1)
        : '0.0'
      lines.push(`- **${option.option}**: ${option.totalVoteCount} votes (${percentage}%)`)
    }
    lines.push('')
  }

  if (comments.length > 0) {
    lines.push('## Comments\n')

    for (const comment of comments) {
      lines.push(formatComment(comment, 0))
    }
  }

  return lines.join('\n')
}

function formatComment(comment: ProviderDiscussionComment, depth: number): string {
  const lines: string[] = []
  const indent = '  '.repeat(depth)

  const answerBadge = comment.isAnswer ? ' ✅ **[ANSWER]**' : ''
  lines.push(`${indent}### Comment by @${comment.author ?? 'unknown'}${answerBadge}`)
  lines.push(`${indent}*Posted: ${new Date(comment.createdAt).toISOString()}*\n`)

  if (comment.upvoteCount !== undefined && comment.upvoteCount > 0) {
    lines.push(`${indent}**Upvotes**: ${comment.upvoteCount} 👍\n`)
  }

  if (comment.reactions && comment.reactions.totalCount > 0) {
    lines.push(`${indent}**Reactions**: ${formatReactions(comment.reactions)}\n`)
  }

  const bodyLines = comment.body.split('\n')
  for (const line of bodyLines) {
    lines.push(`${indent}${line}`)
  }

  lines.push('')

  if (comment.replies && comment.replies.length > 0) {
    for (const reply of comment.replies) {
      lines.push(formatComment(reply, depth + 1))
    }
  }

  return lines.join('\n')
}

function formatDiscussionsIndex(
  categoryIndexes: Array<{ category: ProviderDiscussionCategory, discussions: ProviderDiscussion[] }>,
): string {
  const lines: string[] = []

  lines.push('# Discussions\n')
  lines.push(`Last synced: ${new Date().toISOString()}\n`)

  const totalDiscussions = categoryIndexes.reduce((acc, cat) => acc + cat.discussions.length, 0)
  const totalAnswered = categoryIndexes.reduce((acc, cat) =>
    acc + cat.discussions.filter(d => d.answerChosenAt).length, 0)
  const totalUnanswered = categoryIndexes.reduce((acc, cat) =>
    acc + cat.discussions.filter(d => cat.category.isAnswerable && !d.answerChosenAt && !d.closedAt).length, 0)

  lines.push(`Total discussions: ${totalDiscussions}`)
  lines.push(`Total categories: ${categoryIndexes.length}`)
  lines.push(`Answered: ${totalAnswered} | Unanswered: ${totalUnanswered}\n`)

  for (const { category, discussions } of categoryIndexes) {
    lines.push(`## ${category.emoji ? `${category.emoji} ` : ''}${category.name}\n`)

    if (category.description)
      lines.push(`*${category.description}*\n`)

    lines.push(`**Type**: ${category.isAnswerable ? 'Q&A' : 'Discussion'}`)
    lines.push(`**Count**: ${discussions.length}`)

    if (category.isAnswerable) {
      const answered = discussions.filter(d => d.answerChosenAt).length
      const unanswered = discussions.filter(d => !d.answerChosenAt && !d.closedAt).length
      lines.push(`**Answered**: ${answered} | **Unanswered**: ${unanswered}`)
    }

    lines.push('')

    if (category.isAnswerable) {
      const unanswered = discussions.filter(d => !d.answerChosenAt && !d.closedAt)
      if (unanswered.length > 0) {
        lines.push('### Unanswered\n')
        for (const disc of unanswered) {
          const fileName = `${String(disc.number).padStart(5, '0')}-${sanitizeTitle(disc.title)}.md`
          const upvotes = disc.upvoteCount ? ` (${disc.upvoteCount} 👍)` : ''
          lines.push(`- ❓ [#${disc.number} ${disc.title}](discussions/${sanitizeCategorySlug(category.slug)}/${fileName})${upvotes}`)
        }
        lines.push('')
      }

      const answered = discussions.filter(d => d.answerChosenAt)
      if (answered.length > 0) {
        lines.push('### Answered\n')
        for (const disc of answered) {
          const fileName = `${String(disc.number).padStart(5, '0')}-${sanitizeTitle(disc.title)}.md`
          const upvotes = disc.upvoteCount ? ` (${disc.upvoteCount} 👍)` : ''
          lines.push(`- ✅ [#${disc.number} ${disc.title}](discussions/${sanitizeCategorySlug(category.slug)}/${fileName})${upvotes}`)
        }
        lines.push('')
      }

      const closed = discussions.filter(d => d.closedAt && !d.answerChosenAt)
      if (closed.length > 0) {
        lines.push('### Closed (No Answer)\n')
        for (const disc of closed) {
          const fileName = `${String(disc.number).padStart(5, '0')}-${sanitizeTitle(disc.title)}.md`
          lines.push(`- 🔒 [#${disc.number} ${disc.title}](discussions/${sanitizeCategorySlug(category.slug)}/${fileName})`)
        }
        lines.push('')
      }
    }
    else {
      for (const disc of discussions) {
        const fileName = `${String(disc.number).padStart(5, '0')}-${sanitizeTitle(disc.title)}.md`
        const status = disc.closedAt ? '🔒' : '💬'
        const upvotes = disc.upvoteCount ? ` (${disc.upvoteCount} 👍)` : ''
        const poll = disc.poll ? ' 📊' : ''
        lines.push(`- ${status} [#${disc.number} ${disc.title}](discussions/${sanitizeCategorySlug(category.slug)}/${fileName})${upvotes}${poll}`)
      }

      lines.push('')
    }
  }

  return { written: totalDiscussions, skipped: 0 }
}
