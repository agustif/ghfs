import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { buildCrossRefsGraph } from './refs-graph'
import { buildMeSummary, renderMeSummary } from './me-summary'
import { buildSearchIndex, renderSearchIndex } from './search-index'
import { buildSecuritySummary } from './security-summary'

export async function writeExtendedMetadata(context: SyncContext): Promise<void> {
  const storageDirAbsolute = context.storageDirAbsolute
  await mkdir(storageDirAbsolute, { recursive: true })

  const refsGraph = buildCrossRefsGraph(context.syncState.items, context.syncedAt)
  await writeFile(
    join(storageDirAbsolute, 'refs.json'),
    JSON.stringify(refsGraph, null, 2) + '\n',
    'utf8',
  )

  const searchIndex = buildSearchIndex(context.syncState.items)
  await writeFile(
    join(storageDirAbsolute, 'search.jsonl'),
    renderSearchIndex(searchIndex),
    'utf8',
  )

  const currentUser = await context.provider.fetchAuthenticatedUser()
  if (currentUser) {
    const meSummary = buildMeSummary(context.syncState.items, currentUser.login, context.syncedAt)
    if (meSummary) {
      await writeFile(
        join(storageDirAbsolute, 'me.md'),
        renderMeSummary(meSummary),
        'utf8',
      )
    }
  }

  const securityDir = join(storageDirAbsolute, 'security')
  await mkdir(securityDir, { recursive: true })
  const securitySummary = await buildSecuritySummary(context.provider, context.syncedAt)
  if (securitySummary) {
    await writeFile(
      join(securityDir, 'summary.json'),
      JSON.stringify(securitySummary, null, 2) + '\n',
      'utf8',
    )
  }

  await writeFile(
    join(storageDirAbsolute, 'sync-state.json'),
    JSON.stringify({
      lastSync: context.syncedAt,
      itemCount: Object.keys(context.syncState.items).length,
      items: context.syncState.items,
    }, null, 2) + '\n',
    'utf8',
  )
}
