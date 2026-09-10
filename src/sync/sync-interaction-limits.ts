import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function writeInteractionLimits(context: SyncContext): Promise<void> {
  if (!context.config.sync.interactionLimits)
    return

  try {
    const limits = await context.provider.fetchInteractionLimits()
    const governanceDir = join(context.storageDirAbsolute, 'governance')
    await mkdir(governanceDir, { recursive: true })

    const snapshot = {
      repo: context.repoSlug,
      synced_at: context.syncedAt,
      restrictions: {
        limit: limits.limit,
        origin: limits.origin,
        expires_at: limits.expires_at,
      },
    }

    await writeFile(
      join(governanceDir, 'interaction-limits.json'),
      `${JSON.stringify(snapshot, null, 2)}\n`,
      'utf8',
    )
  }
  catch (error: any) {
    if (error.status === 404) {
      return
    }
    throw error
  }
}
