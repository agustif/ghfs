import type { IssueKind } from '../types'

export function generateChunkId(kind: IssueKind, number: number, section?: string): string {
  const prefix = kind === 'pull' ? 'ghfs:pull' : 'ghfs:issue'
  if (section) {
    return `${prefix}:${number}:${section}`
  }
  return `${prefix}:${number}:body`
}

export function generateReviewChunkId(number: number, reviewId: number): string {
  return `ghfs:pull:${number}:review:${reviewId}`
}

export function generateCommentChunkId(number: number, commentId: number): string {
  return `ghfs:pull:${number}:comment:${commentId}`
}
