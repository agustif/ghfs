import type { GhfsResolvedConfig } from '../types'
import type { RepositoryProvider } from '../types/provider'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export interface MetadataSyncOptions {
  provider: RepositoryProvider
  storageDirAbsolute: string
  config: GhfsResolvedConfig
  syncedAt: string
}

export async function syncRepositoryMetadata(options: MetadataSyncOptions): Promise<void> {
  const { provider, storageDirAbsolute, config, syncedAt } = options
  const metadataDir = join(storageDirAbsolute, 'metadata')

  await mkdir(metadataDir, { recursive: true })

  const syncTasks: Array<Promise<void>> = []

  if (config.sync.metadata.notifications) {
    syncTasks.push(
      syncNotifications(provider, metadataDir, syncedAt),
    )
  }

  if (config.sync.metadata.rateLimit) {
    syncTasks.push(
      syncRateLimit(provider, storageDirAbsolute, syncedAt),
    )
  }

  if (config.sync.metadata.permissions) {
    syncTasks.push(
      syncPermissions(provider, storageDirAbsolute, syncedAt),
    )
  }

  if (config.sync.metadata.communityProfile) {
    syncTasks.push(
      syncCommunityProfile(provider, storageDirAbsolute, syncedAt),
    )
  }

  if (config.sync.metadata.interactionLimits) {
    syncTasks.push(
      syncInteractionLimits(provider, storageDirAbsolute, syncedAt),
    )
  }

  if (config.sync.metadata.customProperties) {
    syncTasks.push(
      syncCustomProperties(provider, storageDirAbsolute, syncedAt),
    )
  }

  if (config.sync.metadata.topics) {
    syncTasks.push(
      syncTopics(provider, storageDirAbsolute, syncedAt),
    )
  }

  if (config.sync.metadata.environments) {
    syncTasks.push(
      syncEnvironments(provider, metadataDir, syncedAt),
    )
  }

  if (config.sync.metadata.deployKeys) {
    syncTasks.push(
      syncDeployKeys(provider, storageDirAbsolute, syncedAt),
    )
  }

  if (config.sync.metadata.actionsCaches) {
    syncTasks.push(
      syncActionsCaches(provider, metadataDir, syncedAt),
    )
  }

  if (config.sync.metadata.pagesBuilds) {
    syncTasks.push(
      syncPagesBuilds(provider, metadataDir, syncedAt),
    )
  }

  if (config.sync.metadata.tagProtection) {
    syncTasks.push(
      syncTagProtection(provider, storageDirAbsolute, syncedAt),
    )
  }

  if (config.sync.metadata.autolinks) {
    syncTasks.push(
      syncAutolinks(provider, storageDirAbsolute, syncedAt),
    )
  }

  await Promise.all(syncTasks)
}

async function syncNotifications(
  provider: RepositoryProvider,
  metadataDir: string,
  syncedAt: string,
): Promise<void> {
  try {
    const notifications = await provider.fetchNotifications()
    const notificationsDir = join(metadataDir, 'notifications')
    await mkdir(notificationsDir, { recursive: true })

    const data = {
      synced_at: syncedAt,
      notifications,
    }

    await writeFile(
      join(notificationsDir, 'participating.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncRateLimit(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  syncedAt: string,
): Promise<void> {
  try {
    const rateLimit = await provider.fetchRateLimit()
    const data = {
      synced_at: syncedAt,
      ...rateLimit,
    }

    await writeFile(
      join(storageDirAbsolute, 'rate-limit.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncPermissions(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  syncedAt: string,
): Promise<void> {
  try {
    const permission = await provider.fetchPermission()
    const data = {
      synced_at: syncedAt,
      ...permission,
    }

    await writeFile(
      join(storageDirAbsolute, 'permissions.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncCommunityProfile(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  syncedAt: string,
): Promise<void> {
  try {
    const profile = await provider.fetchCommunityProfile()
    const data = {
      synced_at: syncedAt,
      ...profile,
    }

    await writeFile(
      join(storageDirAbsolute, 'community-profile.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncInteractionLimits(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  syncedAt: string,
): Promise<void> {
  try {
    const limits = await provider.fetchInteractionLimits()
    if (limits) {
      const data = {
        synced_at: syncedAt,
        ...limits,
      }

      await writeFile(
        join(storageDirAbsolute, 'interaction-limits.json'),
        `${JSON.stringify(data, null, 2)}\n`,
        'utf8',
      )
    }
  }
  catch {
  }
}

async function syncCustomProperties(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  syncedAt: string,
): Promise<void> {
  try {
    const properties = await provider.fetchCustomProperties()
    const data = {
      synced_at: syncedAt,
      properties,
    }

    await writeFile(
      join(storageDirAbsolute, 'custom-properties.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncTopics(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  syncedAt: string,
): Promise<void> {
  try {
    const topics = await provider.fetchTopics()
    const data = {
      synced_at: syncedAt,
      topics,
    }

    await writeFile(
      join(storageDirAbsolute, 'topics.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncEnvironments(
  provider: RepositoryProvider,
  metadataDir: string,
  syncedAt: string,
): Promise<void> {
  try {
    const environments = await provider.fetchEnvironments()
    const environmentsDir = join(metadataDir, 'environments')
    await mkdir(environmentsDir, { recursive: true })

    for (const env of environments) {
      const envData = {
        synced_at: syncedAt,
        ...env,
      }

      await writeFile(
        join(environmentsDir, `${env.name}.json`),
        `${JSON.stringify(envData, null, 2)}\n`,
        'utf8',
      )
    }

    const indexData = {
      synced_at: syncedAt,
      environments: environments.map(e => ({
        name: e.name,
        id: e.id,
        created_at: e.created_at,
        updated_at: e.updated_at,
      })),
    }

    await writeFile(
      join(environmentsDir, 'index.json'),
      `${JSON.stringify(indexData, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncDeployKeys(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  syncedAt: string,
): Promise<void> {
  try {
    const keys = await provider.fetchDeployKeys()
    const data = {
      synced_at: syncedAt,
      deploy_keys: keys.map(key => ({
        id: key.id,
        title: key.title,
        verified: key.verified,
        created_at: key.created_at,
        read_only: key.read_only,
        url: key.url,
      })),
    }

    await writeFile(
      join(storageDirAbsolute, 'deploy-keys.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncActionsCaches(
  provider: RepositoryProvider,
  metadataDir: string,
  syncedAt: string,
): Promise<void> {
  try {
    const caches = await provider.fetchActionsCaches()
    const actionsDir = join(metadataDir, 'actions')
    await mkdir(actionsDir, { recursive: true })

    const data = {
      synced_at: syncedAt,
      caches,
    }

    await writeFile(
      join(actionsDir, 'caches.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncPagesBuilds(
  provider: RepositoryProvider,
  metadataDir: string,
  syncedAt: string,
): Promise<void> {
  try {
    const builds = await provider.fetchPagesBuilds()
    const pagesDir = join(metadataDir, 'pages')
    await mkdir(pagesDir, { recursive: true })

    const data = {
      synced_at: syncedAt,
      builds,
    }

    await writeFile(
      join(pagesDir, 'builds.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncTagProtection(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  syncedAt: string,
): Promise<void> {
  try {
    const rules = await provider.fetchTagProtection()
    const data = {
      synced_at: syncedAt,
      rules,
    }

    await writeFile(
      join(storageDirAbsolute, 'tag-protection.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function syncAutolinks(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  syncedAt: string,
): Promise<void> {
  try {
    const autolinks = await provider.fetchAutolinks()
    const data = {
      synced_at: syncedAt,
      autolinks,
    }

    await writeFile(
      join(storageDirAbsolute, 'autolinks.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}
