import type { IssueKind, IssueState } from '../types'
import { join } from 'pathe'
import { CLOSED_DIR_NAME, ISSUE_DIR_NAME, PACKAGES_DIR_NAME, PULL_DIR_NAME, RELEASES_DIR_NAME } from '../constants'
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

export function getReleaseMarkdownPath(storageDirAbsolute: string, tagName: string): string {
  const fileName = getReleaseFileName(tagName)
  return join(storageDirAbsolute, RELEASES_DIR_NAME, fileName)
}

export function getReleaseFileName(tagName: string): string {
  const slug = slugifyTitle(tagName, MAX_SLUG_LENGTH)
  return `${slug}.md`
}

export function getPackageMarkdownPath(storageDirAbsolute: string, packageType: string, packageName: string): string {
  const fileName = getPackageFileName(packageType, packageName)
  return join(storageDirAbsolute, PACKAGES_DIR_NAME, fileName)
}

export function getPackageFileName(packageType: string, packageName: string): string {
  const slug = slugifyTitle(`${packageType}-${packageName}`, MAX_SLUG_LENGTH)
  return `${slug}.md`
}
