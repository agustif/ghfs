import type { IssueKind, IssueState } from '../types'
import { join } from 'pathe'
import { CLOSED_DIR_NAME, ISSUE_DIR_NAME, PULL_DIR_NAME } from '../constants'
import { slugifyTitle } from '../utils/string'

const FILE_NUMBER_PAD_LENGTH = 5
const MAX_SLUG_LENGTH = 48

export function getIssueMarkdownPath(storageDirAbsolute: string, number: number, state: IssueState, title: string): string {
  const fileName = getItemFileName(number, title)
  if (state === 'closed')
    return join(storageDirAbsolute, ISSUE_DIR_NAME, CLOSED_DIR_NAME, fileName)
  return join(storageDirAbsolute, ISSUE_DIR_NAME, fileName)
}

export function getPullMarkdownPath(storageDirAbsolute: string, number: number, state: IssueState, title: string): string {
  const fileName = getItemFileName(number, title)
  if (state === 'closed')
    return join(storageDirAbsolute, PULL_DIR_NAME, CLOSED_DIR_NAME, fileName)
  return join(storageDirAbsolute, PULL_DIR_NAME, fileName)
}

export function getItemMarkdownPath(storageDirAbsolute: string, kind: IssueKind, number: number, state: IssueState, title: string): string {
  if (kind === 'pull')
    return getPullMarkdownPath(storageDirAbsolute, number, state, title)
  return getIssueMarkdownPath(storageDirAbsolute, number, state, title)
}

export function getItemFileName(number: number, title: string): string {
  const padded = String(number).padStart(FILE_NUMBER_PAD_LENGTH, '0')
  const slug = slugifyTitle(title, MAX_SLUG_LENGTH)
  return `${padded}-${slug}.md`
}

export function getPrPatchPath(storageDirAbsolute: string, number: number, title: string): string {
  const markdownFileName = getItemFileName(number, title)
  return join(storageDirAbsolute, PULL_DIR_NAME, markdownFileName.replace(/\.md$/, '.patch'))
}

export function getItemTimelinePath(storageDirAbsolute: string, kind: IssueKind, number: number, state: IssueState, title: string): string {
  const markdownPath = getItemMarkdownPath(storageDirAbsolute, kind, number, state, title)
  return markdownPath.replace(/\.md$/, '.timeline.jsonl')
}

export function getItemCommitsPath(storageDirAbsolute: string, number: number, state: IssueState, title: string): string {
  const markdownPath = getPullMarkdownPath(storageDirAbsolute, number, state, title)
  return markdownPath.replace(/\.md$/, '.commits.json')
}

export function getItemReviewCommentsPath(storageDirAbsolute: string, number: number, state: IssueState, title: string): string {
  const markdownPath = getPullMarkdownPath(storageDirAbsolute, number, state, title)
  return markdownPath.replace(/\.md$/, '.review-comments.jsonl')
}

export function getItemCheckStatusPath(storageDirAbsolute: string, number: number, state: IssueState, title: string): string {
  const markdownPath = getPullMarkdownPath(storageDirAbsolute, number, state, title)
  return markdownPath.replace(/\.md$/, '.check-status.json')
}

export function getActionsRunDir(storageDirAbsolute: string, runId: number): string {
  return join(storageDirAbsolute, 'actions', 'runs', String(runId))
}

export function getActionsJobsDir(storageDirAbsolute: string, runId: number): string {
  return join(storageDirAbsolute, 'actions', 'runs', String(runId), 'jobs')
}

export function getActionsJobLogPath(storageDirAbsolute: string, runId: number, jobId: number): string {
  return join(getActionsJobsDir(storageDirAbsolute, runId), String(jobId), 'log.txt')
}

export function getActionsJobFailDigestPath(storageDirAbsolute: string, runId: number, jobId: number): string {
  return join(getActionsJobsDir(storageDirAbsolute, runId), String(jobId), 'fail.md')
}

export function getActionsArtifactsPath(storageDirAbsolute: string, runId: number): string {
  return join(getActionsRunDir(storageDirAbsolute, runId), 'artifacts.json')
}

export function getWebhooksDir(storageDirAbsolute: string): string {
  return join(storageDirAbsolute, 'webhooks')
}

export function getWebhooksConfigPath(storageDirAbsolute: string): string {
  return join(getWebhooksDir(storageDirAbsolute), 'config.json')
}

export function getWebhookDeliveriesPath(storageDirAbsolute: string, hookId: number): string {
  return join(getWebhooksDir(storageDirAbsolute), `${hookId}-deliveries.json`)
}

export function getPackageMarkdownPath(storageDir: string, name: string): string {
  const safe = name.replace(/[^\w.-]+/g, '-')
  return `${storageDir}/packages/${safe}.md`
}
