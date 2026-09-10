import type { Pack, PackLargeContent, PackMediumContent } from '../types'
import { stringify } from 'yaml'

export function renderPackMarkdown(pack: Pack): string {
  const { metadata, content } = pack
  const sections: string[] = []

  sections.push('---')
  sections.push(stringify({
    chunk_id: metadata.chunkId,
    generated_at: metadata.generatedAt,
    ghfs_version: metadata.ghfsVersion,
    pack_size: metadata.size,
  }).trimEnd())
  sections.push('---')
  sections.push('')

  sections.push(`# ${content.title}`)
  sections.push('')
  sections.push(`**${content.kind === 'pull' ? 'Pull Request' : 'Issue'} #${content.number}** | State: \`${content.state}\``)
  sections.push('')
  sections.push(`🔗 [View on GitHub](${content.url})`)
  sections.push('')

  if (content.gate) {
    sections.push('## Gate Summary')
    sections.push('')
    sections.push(`- **Mergeable**: ${content.gate.mergeable === null ? 'unknown' : content.gate.mergeable ? 'yes' : 'no'}`)
    if (content.gate.mergeableState)
      sections.push(`- **Mergeable State**: \`${content.gate.mergeableState}\``)
    if (content.gate.reviewDecision)
      sections.push(`- **Review Decision**: \`${content.gate.reviewDecision}\``)
    sections.push(`- **Checks Status**: \`${content.gate.checksStatus}\``)
    if (content.gate.checksDigestPlaceholder)
      sections.push(`- **Checks Digest**: ${content.gate.checksDigestPlaceholder}`)
    sections.push('')
  }

  if (content.fileList && content.fileList.length > 0) {
    sections.push('## File List')
    sections.push('')
    for (const file of content.fileList) {
      let line = `- \`${file.path}\``
      if (file.additions !== undefined || file.deletions !== undefined) {
        const parts: string[] = []
        if (file.additions !== undefined)
          parts.push(`+${file.additions}`)
        if (file.deletions !== undefined)
          parts.push(`-${file.deletions}`)
        line += ` (${parts.join(', ')})`
      }
      sections.push(line)
    }
    sections.push('')
  }

  if (metadata.size === 'small') {
    return sections.join('\n')
  }

  const mediumContent = content as PackMediumContent
  sections.push('## Description')
  sections.push('')
  sections.push(mediumContent.body)
  sections.push('')
  sections.push(`**Author**: @${mediumContent.author}`)
  sections.push('')
  if (mediumContent.labels.length > 0) {
    sections.push(`**Labels**: ${mediumContent.labels.map(l => `\`${l}\``).join(', ')}`)
    sections.push('')
  }
  sections.push(`**Created**: ${mediumContent.createdAt}`)
  sections.push(`**Updated**: ${mediumContent.updatedAt}`)
  sections.push('')

  if (metadata.size === 'medium') {
    return sections.join('\n')
  }

  const largeContent = content as PackLargeContent

  if (largeContent.assignees.length > 0) {
    sections.push(`**Assignees**: ${largeContent.assignees.map(a => `@${a}`).join(', ')}`)
    sections.push('')
  }

  if (largeContent.milestone) {
    sections.push(`**Milestone**: ${largeContent.milestone}`)
    sections.push('')
  }

  if (largeContent.closedAt) {
    sections.push(`**Closed**: ${largeContent.closedAt}`)
    sections.push('')
  }

  if (largeContent.owners && largeContent.owners.length > 0) {
    sections.push('## Owners')
    sections.push('')
    for (const owner of largeContent.owners) {
      sections.push(`- @${owner.login} (${owner.role})`)
    }
    sections.push('')
  }

  if (largeContent.linkedIssues && largeContent.linkedIssues.length > 0) {
    sections.push('## Linked Issues')
    sections.push('')
    for (const linked of largeContent.linkedIssues) {
      sections.push(`- #${linked.number}: ${linked.title} [\`${linked.state}\`]`)
    }
    sections.push('')
  }

  if (largeContent.commentCount > 0) {
    sections.push('## Comments')
    sections.push('')
    sections.push(`${largeContent.commentSummary || `${largeContent.commentCount} comment(s)`}`)
    sections.push('')
  }

  if (largeContent.pr) {
    sections.push('## Pull Request Details')
    sections.push('')
    sections.push(`- **Draft**: ${largeContent.pr.isDraft ? 'yes' : 'no'}`)
    sections.push(`- **Merged**: ${largeContent.pr.merged ? 'yes' : 'no'}`)
    if (largeContent.pr.mergedAt)
      sections.push(`- **Merged At**: ${largeContent.pr.mergedAt}`)
    sections.push(`- **Base**: \`${largeContent.pr.baseRef}\``)
    sections.push(`- **Head**: \`${largeContent.pr.headRef}\``)
    if (largeContent.pr.requestedReviewers.length > 0)
      sections.push(`- **Requested Reviewers**: ${largeContent.pr.requestedReviewers.map(r => `@${r}`).join(', ')}`)
    if (largeContent.pr.reviewSummary)
      sections.push(`- **Reviews**: ${largeContent.pr.reviewSummary}`)
    sections.push('')
  }

  return sections.join('\n')
}
