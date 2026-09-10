import type { IssueKind, PackSize } from '../types'
import { join } from 'pathe'

export function getPackDirectory(storageDirAbsolute: string, size: PackSize): string {
  return join(storageDirAbsolute, 'packs', size)
}

export function getPackPath(storageDirAbsolute: string, size: PackSize, kind: IssueKind, number: number): string {
  const packDir = getPackDirectory(storageDirAbsolute, size)
  const prefix = kind === 'pull' ? 'pr' : 'issue'
  return join(packDir, `${prefix}-${number}.md`)
}
