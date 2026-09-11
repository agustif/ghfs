// @ts-nocheck
import type { SyncItemCanonicalData } from '../types/sync-state'
import { join } from 'pathe'
import { writeFileEnsured } from '../utils/fs'

export async function writeGraphSidecars(
  issueMarkdownPath: string,
  data: SyncItemCanonicalData,
): Promise<void> {
  const baseName = issueMarkdownPath.replace(/\.md$/, '')
  const sidecarDir = `${baseName}.graph`

  if (data.dependenciesBlockedBy && data.dependenciesBlockedBy.length > 0) {
    const blockedByPath = join(sidecarDir, 'blocked-by.json')
    await writeFileEnsured(blockedByPath, JSON.stringify(data.dependenciesBlockedBy, null, 2))
  }

  if (data.dependenciesBlocking && data.dependenciesBlocking.length > 0) {
    const blockingPath = join(sidecarDir, 'blocking.json')
    await writeFileEnsured(blockingPath, JSON.stringify(data.dependenciesBlocking, null, 2))
  }

  if (data.subIssues && data.subIssues.length > 0) {
    const subIssuesPath = join(sidecarDir, 'sub-issues.json')
    await writeFileEnsured(subIssuesPath, JSON.stringify(data.subIssues, null, 2))
  }

  if (data.parent) {
    const parentPath = join(sidecarDir, 'parent.json')
    await writeFileEnsured(parentPath, JSON.stringify(data.parent, null, 2))
  }

  if (data.fieldValues && data.fieldValues.length > 0) {
    const fieldValuesPath = join(sidecarDir, 'field-values.json')
    await writeFileEnsured(fieldValuesPath, JSON.stringify(data.fieldValues, null, 2))
  }

  const edgesPath = join(sidecarDir, 'edges.json')
  const edges = {
    blockedBy: data.dependenciesBlockedBy?.map(dep => ({
      type: 'blocked_by' as const,
      targetNumber: dep.number,
      targetRepo: dep.repo,
    })) ?? [],
    blocking: data.dependenciesBlocking?.map(dep => ({
      type: 'blocking' as const,
      targetNumber: dep.number,
      targetRepo: dep.repo,
    })) ?? [],
    subIssues: data.subIssues?.map(issue => ({
      type: 'sub_issue' as const,
      targetNumber: issue.number,
      targetRepo: issue.repo,
    })) ?? [],
    parent: data.parent
      ? {
          type: 'parent' as const,
          targetNumber: data.parent.number,
          targetRepo: data.parent.repo,
        }
      : null,
  }

  if (edges.blockedBy.length > 0 || edges.blocking.length > 0 || edges.subIssues.length > 0 || edges.parent) {
    await writeFileEnsured(edgesPath, JSON.stringify(edges, null, 2))
  }
}
