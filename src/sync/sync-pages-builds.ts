import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function writePagesBuilds(context: SyncContext): Promise<void> {
  if (!context.config.sync.pagesBuilds)
    return

  try {
    const builds = await context.provider.fetchPagesBuilds()
    const pagesDir = join(context.storageDirAbsolute, 'pages')
    await mkdir(pagesDir, { recursive: true })

    const snapshot = {
      repo: context.repoSlug,
      synced_at: context.syncedAt,
      builds: builds.map(build => ({
        url: build.url,
        status: build.status,
        error: build.error,
        commit: build.commit,
        duration: build.duration,
        created_at: build.created_at,
        updated_at: build.updated_at,
        pusher: build.pusher,
      })),
    }

    await writeFile(
      join(pagesDir, 'builds.json'),
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
