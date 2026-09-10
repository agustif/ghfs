import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { EXTENDED_GRAPH_FILE_NAME } from '../constants'
import { buildMeSummary, renderMeSummary } from './me-summary'
import { buildGraph } from './refs-graph'
import { buildSearchIndex, renderSearchIndex } from './search-index'
import { buildSecuritySummary } from './security-summary'

export async function writeExtendedMetadata(context: SyncContext): Promise<void> {
  const storageDirAbsolute = context.storageDirAbsolute
  const config = context.config.extended

  if (!config)
    return

  await mkdir(storageDirAbsolute, { recursive: true })

  if (config.graph) {
    const graph = buildGraph(context.syncState.items, context.syncedAt)
    await writeFile(
      join(storageDirAbsolute, EXTENDED_GRAPH_FILE_NAME),
      `${graph.nodes.map(n => JSON.stringify({ ...n, type: 'node' })).join('\n')
      }\n${
        graph.edges.map(e => JSON.stringify({ ...e, type: 'edge' })).join('\n')
      }\n`,
      'utf8',
    )
  }

  if (config.search) {
    const searchIndex = buildSearchIndex(context.syncState.items)
    await writeFile(
      join(storageDirAbsolute, 'search.jsonl'),
      renderSearchIndex(searchIndex),
      'utf8',
    )
  }

  if (config.me) {
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
  }

  if (config.security) {
    const securityDir = join(storageDirAbsolute, 'security')
    await mkdir(securityDir, { recursive: true })
    const securitySummary = await buildSecuritySummary(context.provider, context.syncedAt)
    if (securitySummary) {
      await writeFile(
        join(securityDir, 'summary.json'),
        `${JSON.stringify(securitySummary, null, 2)}\n`,
        'utf8',
      )
    }
  }

  if (config.syncState) {
    await writeFile(
      join(storageDirAbsolute, 'sync-state.json'),
      `${JSON.stringify({
        lastSync: context.syncedAt,
        itemCount: Object.keys(context.syncState.items).length,
        items: context.syncState.items,
      }, null, 2)}\n`,
      'utf8',
    )
import { writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import {
  ACTIVITY_EVENTS_FILE_NAME,
  COMMIT_COMMENTS_FILE_NAME,
  FEEDS_FILE_NAME,
  FORK_STATUS_FILE_NAME,
  NETWORK_SUMMARY_FILE_NAME,
  REPO_INVITATIONS_FILE_NAME,
  REPO_TEMPLATE_FILE_NAME,
  VIEWER_STATUS_FILE_NAME,
} from '../constants'

export async function writeExtendedMetadata(context: SyncContext): Promise<void> {
  await Promise.all([
    writeCommitComments(context),
    writeRepoInvitations(context),
    writeViewerStatus(context),
    writeTemplateInfo(context),
    writeForkStatus(context),
    writeNetworkSummary(context),
    writeActivityEvents(context),
    writeFeeds(context),
  ])
}

async function writeCommitComments(context: SyncContext): Promise<void> {
  try {
    const comments = await context.provider.fetchCommitComments(30)
    const lines = comments.map(comment => JSON.stringify(comment))
    await writeFile(
      join(context.storageDirAbsolute, COMMIT_COMMENTS_FILE_NAME),
      lines.length > 0 ? `${lines.join('\n')}\n` : '',
      'utf8',
    )
  }
  catch {
  }
}

async function writeRepoInvitations(context: SyncContext): Promise<void> {
  try {
    const invitations = await context.provider.fetchRepoInvitations()
    await writeFile(
      join(context.storageDirAbsolute, REPO_INVITATIONS_FILE_NAME),
      `${JSON.stringify(invitations, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function writeViewerStatus(context: SyncContext): Promise<void> {
  try {
    const status = await context.provider.fetchViewerStatus()
    await writeFile(
      join(context.storageDirAbsolute, VIEWER_STATUS_FILE_NAME),
      `${JSON.stringify(status, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function writeTemplateInfo(context: SyncContext): Promise<void> {
  try {
    const info = await context.provider.fetchTemplateInfo()
    await writeFile(
      join(context.storageDirAbsolute, REPO_TEMPLATE_FILE_NAME),
      `${JSON.stringify(info, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function writeForkStatus(context: SyncContext): Promise<void> {
  try {
    const status = await context.provider.fetchForkStatus()
    await writeFile(
      join(context.storageDirAbsolute, FORK_STATUS_FILE_NAME),
      `${JSON.stringify(status, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function writeNetworkSummary(context: SyncContext): Promise<void> {
  try {
    const summary = await context.provider.fetchNetworkSummary()
    await writeFile(
      join(context.storageDirAbsolute, NETWORK_SUMMARY_FILE_NAME),
      `${JSON.stringify(summary, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function writeActivityEvents(context: SyncContext): Promise<void> {
  try {
    const events = await context.provider.fetchActivityEvents(100)
    const lines = events.map(event => JSON.stringify(event))
    await writeFile(
      join(context.storageDirAbsolute, ACTIVITY_EVENTS_FILE_NAME),
      lines.length > 0 ? `${lines.join('\n')}\n` : '',
      'utf8',
    )
  }
  catch {
  }
}

async function writeFeeds(context: SyncContext): Promise<void> {
  try {
    const feeds = await context.provider.fetchFeeds()
    await writeFile(
      join(context.storageDirAbsolute, FEEDS_FILE_NAME),
      `${JSON.stringify(feeds, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}
