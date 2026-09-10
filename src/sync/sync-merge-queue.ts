import type { ProviderMergeQueueEntry } from '../types/provider'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

const MERGE_QUEUE_DIR = 'merge-queue'

export function getMergeQueueDir(storageDirAbsolute: string): string {
  return join(storageDirAbsolute, MERGE_QUEUE_DIR)
}

export function getMergeQueueEntryPath(storageDirAbsolute: string, position: number, prNumber: number): string {
  const fileName = `${String(position).padStart(3, '0')}-pr-${String(prNumber).padStart(5, '0')}.json`
  return join(getMergeQueueDir(storageDirAbsolute), fileName)
}

export async function writeMergeQueueEntries(
  storageDirAbsolute: string,
  entries: ProviderMergeQueueEntry[],
): Promise<number> {
  const queueDir = getMergeQueueDir(storageDirAbsolute)
  await mkdir(queueDir, { recursive: true })

  const existingFiles = await readdir(queueDir).catch(() => [] as string[])
  for (const file of existingFiles) {
    if (file.endsWith('.json'))
      await rm(join(queueDir, file))
  }

  let written = 0
  for (const entry of entries) {
    const entryPath = getMergeQueueEntryPath(storageDirAbsolute, entry.position, entry.pullRequest.number)
    const content = JSON.stringify(entry, null, 2)
    await writeFile(entryPath, content, 'utf8')
    written += 1
  }

  return written
}

export async function readMergeQueueEntries(storageDirAbsolute: string): Promise<ProviderMergeQueueEntry[]> {
  const queueDir = getMergeQueueDir(storageDirAbsolute)
  try {
    const files = await readdir(queueDir)
    const entries: ProviderMergeQueueEntry[] = []

    for (const file of files) {
      if (!file.endsWith('.json'))
        continue

      const filePath = join(queueDir, file)
      const content = await readFile(filePath, 'utf8')
      const entry = JSON.parse(content) as ProviderMergeQueueEntry
      entries.push(entry)
    }

    return entries.sort((a, b) => a.position - b.position)
  }
  catch {
    return []
  }
}

export async function clearMergeQueue(storageDirAbsolute: string): Promise<void> {
  const queueDir = getMergeQueueDir(storageDirAbsolute)
  try {
    await rm(queueDir, { recursive: true, force: true })
  }
  catch {
  }
}
