import type { Pack, PackLargeContent, PackMediumContent, PackSize, PackSmallContent, SyncItemState } from '../types'
import { VERSION } from '../meta'
import { generateChunkId } from './chunk-id'

export interface GeneratePackOptions {
  size: PackSize
  itemState: SyncItemState
}

export function generatePack(options: GeneratePackOptions): Pack {
  const { size, itemState } = options
  const { item, comments, pull } = itemState.data

  const chunkId = generateChunkId(item.kind, item.number)
  const url = item.url || `https://github.com/${itemState.data.item.number}/${item.kind === 'pull' ? 'pull' : 'issues'}/${item.number}`

  const metadata = {
    chunkId,
    generatedAt: new Date().toISOString(),
    ghfsVersion: VERSION,
    size,
  }

  if (size === 'small') {
    const content: PackSmallContent = {
      number: item.number,
      kind: item.kind,
      title: item.title,
      state: item.state,
      url,
    }

    if (pull) {
      content.gate = {
        mergeable: pull.mergeable,
        mergeableState: pull.mergeableState,
        reviewDecision: pull.reviewDecision,
        checksStatus: 'unknown',
        checksDigestPlaceholder: 'Depends on PR #2 (gate/checks implementation)',
      }
    }

    return { metadata, content }
  }

  if (size === 'medium') {
    const content: PackMediumContent = {
      number: item.number,
      kind: item.kind,
      title: item.title,
      state: item.state,
      url,
      body: item.body || '_No description._',
      author: item.author || 'unknown',
      labels: item.labels,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }

    if (pull) {
      content.gate = {
        mergeable: pull.mergeable,
        mergeableState: pull.mergeableState,
        reviewDecision: pull.reviewDecision,
        checksStatus: 'unknown',
        checksDigestPlaceholder: 'Depends on PR #2 (gate/checks implementation)',
      }
    }

    return { metadata, content }
  }

  const content: PackLargeContent = {
    number: item.number,
    kind: item.kind,
    title: item.title,
    state: item.state,
    url,
    body: item.body || '_No description._',
    author: item.author || 'unknown',
    labels: item.labels,
    assignees: item.assignees,
    milestone: item.milestone,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    closedAt: item.closedAt,
    commentCount: comments.length,
  }

  if (comments.length > 0) {
    const commentAuthors = [...new Set(comments.map(c => c.author).filter(Boolean))]
    content.commentSummary = `${comments.length} comment${comments.length === 1 ? '' : 's'} from ${commentAuthors.length} participant${commentAuthors.length === 1 ? '' : 's'}`
  }

  const owners = new Set<string>()
  if (item.author)
    owners.add(item.author)
  item.assignees.forEach(a => owners.add(a))

  if (pull) {
    content.gate = {
      mergeable: pull.mergeable,
      mergeableState: pull.mergeableState,
      reviewDecision: pull.reviewDecision,
      checksStatus: 'unknown',
      checksDigestPlaceholder: 'Depends on PR #2 (gate/checks implementation)',
    }

    pull.requestedReviewers.forEach(r => owners.add(r))

    content.pr = {
      isDraft: pull.isDraft,
      merged: pull.merged,
      mergedAt: pull.mergedAt,
      baseRef: pull.baseRef,
      headRef: pull.headRef,
      requestedReviewers: pull.requestedReviewers,
    }
  }

  content.owners = Array.from(owners).map((login) => {
    if (login === item.author)
      return { login, role: 'author' as const }
    if (item.assignees.includes(login))
      return { login, role: 'assignee' as const }
    return { login, role: 'reviewer' as const }
  })

  return { metadata, content }
}
