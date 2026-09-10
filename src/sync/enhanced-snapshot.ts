import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import {
  ACTIONS_DIR_NAME,
  ACTIONS_FILE_NAME,
  CONSTITUTION_DIR_NAME,
  LABELS_FILE_NAME,
  META_FILE_NAME,
  MILESTONES_FILE_NAME,
  RELEASES_DIR_NAME,
  RELEASES_FILE_NAME,
  RULESETS_DIR_NAME,
  RULESETS_FILE_NAME,
} from '../constants'

export async function writeEnhancedSnapshots(context: SyncContext): Promise<void> {
  const tasks: Promise<void>[] = []

  if (context.config.sync.meta !== false)
    tasks.push(writeMetaFile(context))

  if (context.config.sync.labelsAndMilestones !== false) {
    tasks.push(writeLabelsFile(context))
    tasks.push(writeMilestonesFile(context))
  }

  if (context.config.sync.releases !== false)
    tasks.push(writeReleasesFile(context))

  if (context.config.sync.rulesets !== false)
    tasks.push(writeRulesetsFile(context))

  if (context.config.sync.constitution !== false)
    tasks.push(writeConstitutionFiles(context))

  if (context.config.sync.actions !== false)
    tasks.push(writeActionsFile(context))

  await Promise.all(tasks)
}

async function writeMetaFile(context: SyncContext): Promise<void> {
  const repository = await context.provider.fetchRepository()
  const topics = await context.provider.fetchRepositoryTopics?.()
  const pinnedIssues = await context.provider.fetchPinnedIssues?.()
  const readmeExcerpt = await fetchReadmeExcerpt(context)

  const meta = {
    repo: context.repoSlug,
    synced_at: context.syncedAt,
    description: repository.description,
    default_branch: repository.default_branch,
    topics: topics?.names ?? [],
    visibility: repository.private ? 'private' : 'public',
    archived: repository.archived,
    fork: repository.fork,
    features: {
      issues: repository.has_issues,
      projects: repository.has_projects,
      wiki: repository.has_wiki,
      merge_queue: repository.merge_queue_enabled ?? null,
    },
    counts: {
      open_issues: repository.open_issues_count,
      total_issues: context.totalIssues,
      total_pulls: context.totalPulls,
    },
    pinned_issues: pinnedIssues ?? [],
    readme_excerpt: readmeExcerpt,
    created_at: repository.created_at,
    updated_at: repository.updated_at,
    pushed_at: repository.pushed_at,
  }

  await mkdir(context.storageDirAbsolute, { recursive: true })
  await writeFile(
    join(context.storageDirAbsolute, META_FILE_NAME),
    `${JSON.stringify(meta, null, 2)}\n`,
    'utf8',
  )
}

async function fetchReadmeExcerpt(context: SyncContext): Promise<string | null> {
  const paths = ['README.md', 'README', 'readme.md', 'Readme.md']

  for (const path of paths) {
    const content = await context.provider.fetchRepositoryContent?.(path)
    if (content?.content && content.encoding === 'base64') {
      const decoded = Buffer.from(content.content, 'base64').toString('utf8')
      return extractExcerpt(decoded, 500)
    }
  }

  return null
}

function extractExcerpt(markdown: string, maxLength: number): string {
  let text = markdown
    .split('\n')
    .filter(line => !line.trim().startsWith('#'))
    .filter(line => !line.trim().startsWith('<!--'))
    .filter(line => !line.trim().startsWith('!['))
    .filter(line => line.trim().length > 0)
    .join(' ')
    .trim()

  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  text = text.replace(/`([^`]+)`/g, '$1')
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')

  if (text.length <= maxLength)
    return text

  const cutoff = text.lastIndexOf(' ', maxLength)
  return cutoff > 0 ? `${text.slice(0, cutoff)}...` : `${text.slice(0, maxLength)}...`
}

async function writeLabelsFile(context: SyncContext): Promise<void> {
  const labels = await context.provider.fetchRepositoryLabels()
  const formatted = labels
    .map(label => ({
      name: label.name,
      color: label.color,
      description: label.description ?? null,
      default: label.default,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  await mkdir(context.storageDirAbsolute, { recursive: true })
  await writeFile(
    join(context.storageDirAbsolute, LABELS_FILE_NAME),
    `${JSON.stringify(formatted, null, 2)}\n`,
    'utf8',
  )
}

async function writeMilestonesFile(context: SyncContext): Promise<void> {
  const milestones = await context.provider.fetchRepositoryMilestones()
  const formatted = milestones
    .map(milestone => ({
      number: milestone.number,
      title: milestone.title,
      state: milestone.state,
      description: milestone.description ?? null,
      due_on: milestone.due_on,
      open_issues: milestone.open_issues,
      closed_issues: milestone.closed_issues,
      created_at: milestone.created_at,
      updated_at: milestone.updated_at,
      closed_at: milestone.closed_at,
    }))
    .sort((a, b) => a.number - b.number)

  await mkdir(context.storageDirAbsolute, { recursive: true })
  await writeFile(
    join(context.storageDirAbsolute, MILESTONES_FILE_NAME),
    `${JSON.stringify(formatted, null, 2)}\n`,
    'utf8',
  )
}

async function writeReleasesFile(context: SyncContext): Promise<void> {
  const releases = await context.provider.fetchReleases?.(30)
  if (!releases)
    return

  const releasesDir = join(context.storageDirAbsolute, RELEASES_DIR_NAME)
  await mkdir(releasesDir, { recursive: true })

  await writeFile(
    join(releasesDir, RELEASES_FILE_NAME),
    `${JSON.stringify(releases, null, 2)}\n`,
    'utf8',
  )
}

async function writeRulesetsFile(context: SyncContext): Promise<void> {
  const repository = await context.provider.fetchRepository()
  const protection = await context.provider.fetchBranchProtection?.(repository.default_branch)

  if (!protection)
    return

  const rulesetsDir = join(context.storageDirAbsolute, RULESETS_DIR_NAME)
  await mkdir(rulesetsDir, { recursive: true })

  const rulesets = {
    synced_at: context.syncedAt,
    default_branch: repository.default_branch,
    protection,
  }

  await writeFile(
    join(rulesetsDir, RULESETS_FILE_NAME),
    `${JSON.stringify(rulesets, null, 2)}\n`,
    'utf8',
  )
}

async function writeConstitutionFiles(context: SyncContext): Promise<void> {
  const constitutionDir = join(context.storageDirAbsolute, CONSTITUTION_DIR_NAME)
  await mkdir(constitutionDir, { recursive: true })

  const files = [
    'CONTRIBUTING.md',
    'SECURITY.md',
    'CODE_OF_CONDUCT.md',
    'SUPPORT.md',
    'FUNDING.yml',
    'CODEOWNERS',
  ]

  const fetchPromises = files.map(async (file) => {
    const content = await context.provider.fetchRepositoryContent?.(file)
      ?? await context.provider.fetchRepositoryContent?.(`.github/${file}`)

    if (content?.content && content.encoding === 'base64') {
      const decoded = Buffer.from(content.content, 'base64').toString('utf8')
      await writeFile(join(constitutionDir, file), decoded, 'utf8')
    }
  })

  await Promise.allSettled(fetchPromises)
}

async function writeActionsFile(context: SyncContext): Promise<void> {
  const runs = await context.provider.fetchRecentWorkflowRuns?.(20)
  if (!runs)
    return

  const actionsDir = join(context.storageDirAbsolute, ACTIONS_DIR_NAME)
  await mkdir(actionsDir, { recursive: true })

  await writeFile(
    join(actionsDir, ACTIONS_FILE_NAME),
    `${JSON.stringify({ synced_at: context.syncedAt, runs }, null, 2)}\n`,
    'utf8',
  )
}
