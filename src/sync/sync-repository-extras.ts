import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function writeRepositoryExtras(context: SyncContext): Promise<void> {
  const config = context.config.sync

  await mkdir(context.storageDirAbsolute, { recursive: true })

  const promises: Promise<void>[] = []

  if (config.stargazers) {
    promises.push(writeStargazers(context))
  }

  if (config.watchers) {
    promises.push(writeWatchers(context))
  }

  if (config.forks) {
    promises.push(writeForks(context))
  }

  if (config.traffic) {
    promises.push(writeTraffic(context))
  }

  if (config.contributors) {
    promises.push(writeContributors(context))
  }

  await Promise.all(promises)
}

async function writeStargazers(context: SyncContext): Promise<void> {
  try {
    const stargazers = await context.provider.fetchStargazers()
    const lines = stargazers.map(s => JSON.stringify(s))
    await writeFile(
      join(context.storageDirAbsolute, 'stargazers.jsonl'),
      lines.length > 0 ? `${lines.join('\n')}\n` : '',
      'utf8',
    )
  }
  catch {
  }
}

async function writeWatchers(context: SyncContext): Promise<void> {
  try {
    const watchers = await context.provider.fetchWatchers()
    const lines = watchers.map(w => JSON.stringify(w))
    await writeFile(
      join(context.storageDirAbsolute, 'watchers.jsonl'),
      lines.length > 0 ? `${lines.join('\n')}\n` : '',
      'utf8',
    )
  }
  catch {
  }
}

async function writeForks(context: SyncContext): Promise<void> {
  try {
    const forks = await context.provider.fetchForks()
    await writeFile(
      join(context.storageDirAbsolute, 'forks.json'),
      `${JSON.stringify(forks, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function writeTraffic(context: SyncContext): Promise<void> {
  const trafficDir = join(context.storageDirAbsolute, 'traffic')
  await mkdir(trafficDir, { recursive: true })

  const promises: Promise<void>[] = []

  promises.push(writeTrafficViews(context, trafficDir))
  promises.push(writeTrafficClones(context, trafficDir))
  promises.push(writeTrafficPaths(context, trafficDir))
  promises.push(writeTrafficReferrers(context, trafficDir))

  await Promise.all(promises)
}

async function writeTrafficViews(context: SyncContext, trafficDir: string): Promise<void> {
  try {
    const views = await context.provider.fetchTrafficViews()
    if (views) {
      await writeFile(
        join(trafficDir, 'views.json'),
        `${JSON.stringify(views, null, 2)}\n`,
        'utf8',
      )
    }
  }
  catch {
  }
}

async function writeTrafficClones(context: SyncContext, trafficDir: string): Promise<void> {
  try {
    const clones = await context.provider.fetchTrafficClones()
    if (clones) {
      await writeFile(
        join(trafficDir, 'clones.json'),
        `${JSON.stringify(clones, null, 2)}\n`,
        'utf8',
      )
    }
  }
  catch {
  }
}

async function writeTrafficPaths(context: SyncContext, trafficDir: string): Promise<void> {
  try {
    const paths = await context.provider.fetchTrafficPaths()
    await writeFile(
      join(trafficDir, 'paths.json'),
      `${JSON.stringify(paths, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function writeTrafficReferrers(context: SyncContext, trafficDir: string): Promise<void> {
  try {
    const referrers = await context.provider.fetchTrafficReferrers()
    await writeFile(
      join(trafficDir, 'referrers.json'),
      `${JSON.stringify(referrers, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}

async function writeContributors(context: SyncContext): Promise<void> {
  try {
    const contributors = await context.provider.fetchContributors()
    await writeFile(
      join(context.storageDirAbsolute, 'contributors.json'),
      `${JSON.stringify(contributors, null, 2)}\n`,
      'utf8',
    )
  }
  catch {
  }
}
