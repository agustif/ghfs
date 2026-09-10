import type { ProviderProjectV2 } from '../types/provider'
import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { PROJECTS_DIR_NAME, PROJECTS_FILE_NAME } from '../constants'

export async function syncProjects(context: SyncContext): Promise<void> {
  if (!context.config.sync.projects)
    return

  if (!context.provider.fetchProjectsV2)
    return

  try {
    const projects = await context.provider.fetchProjectsV2()

    if (projects.length === 0)
      return

    await writeProjectsSnapshot(context, projects)
    await writeProjectBoards(context, projects)
  }
  catch {
    // Gracefully degrade - projects sync is optional
  }
}

async function writeProjectsSnapshot(context: SyncContext, projects: ProviderProjectV2[]): Promise<void> {
  const projectsDir = join(context.storageDirAbsolute, PROJECTS_DIR_NAME)
  await mkdir(projectsDir, { recursive: true })

  const projectsData = {
    repo: context.repoSlug,
    synced_at: context.syncedAt,
    projects: projects.map(project => ({
      id: project.id,
      number: project.number,
      title: project.title,
      shortDescription: project.shortDescription,
      public: project.public,
      closed: project.closed,
      url: project.url,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      fields: project.fields,
      itemCount: project.items.length,
    })),
  }

  await writeFile(
    join(projectsDir, PROJECTS_FILE_NAME),
    `${JSON.stringify(projectsData, null, 2)}\n`,
    'utf8',
  )
}

async function writeProjectBoards(context: SyncContext, projects: ProviderProjectV2[]): Promise<void> {
  const projectsDir = join(context.storageDirAbsolute, PROJECTS_DIR_NAME)

  for (const project of projects) {
    const projectSlug = slugify(`${project.number}-${project.title}`)
    const projectFile = join(projectsDir, `${projectSlug}.json`)

    const projectData = {
      id: project.id,
      number: project.number,
      title: project.title,
      shortDescription: project.shortDescription,
      public: project.public,
      closed: project.closed,
      url: project.url,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      fields: project.fields,
      items: project.items.map(item => ({
        id: item.id,
        type: item.contentType,
        number: item.contentNumber,
        fieldValues: item.fieldValues,
      })),
    }

    await writeFile(projectFile, `${JSON.stringify(projectData, null, 2)}\n`, 'utf8')
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function getProjectStatusForItem(
  projects: ProviderProjectV2[],
  itemNumber: number,
  itemKind: 'issue' | 'pull',
): string | null {
  const contentType = itemKind === 'pull' ? 'PullRequest' : 'Issue'

  for (const project of projects) {
    const item = project.items.find(
      item => item.contentType === contentType && item.contentNumber === itemNumber,
    )

    if (item) {
      const statusField = Object.values(item.fieldValues).find(
        field => field.fieldName.toLowerCase() === 'status',
      )
      if (statusField && statusField.value)
        return statusField.value
    }
  }

  return null
}
