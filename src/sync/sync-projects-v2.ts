import type { ProviderProjectV2, ProviderProjectV2Field, ProviderProjectV2Item } from '../types/graphql-provider'
import type { RepositoryProvider } from '../types/provider'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncProjectsV2(
  directory: string,
  provider: RepositoryProvider,
): Promise<void> {
  const projectsDir = join(directory, 'projects')
  await mkdir(projectsDir, { recursive: true })

  const projects = await provider.fetchProjectsV2()

  const indexPath = join(projectsDir, 'index.md')
  const indexContent = renderProjectsIndex(projects)
  await writeFile(indexPath, indexContent, 'utf-8')

  for (const project of projects) {
    const projectDir = join(projectsDir, `${String(project.number).padStart(5, '0')}-${slugify(project.title)}`)
    await mkdir(projectDir, { recursive: true })

    const projectPath = join(projectDir, 'project.md')
    const projectContent = renderProject(project)
    await writeFile(projectPath, projectContent, 'utf-8')

    const fields = await provider.fetchProjectV2Fields(project.id)
    const fieldsPath = join(projectDir, 'fields.json')
    await writeFile(fieldsPath, JSON.stringify(fields, null, 2), 'utf-8')

    const items = await provider.fetchProjectV2Items(project.id)
    const itemsPath = join(projectDir, 'items.md')
    const itemsContent = renderProjectItems(items, fields)
    await writeFile(itemsPath, itemsContent, 'utf-8')
  }
}

function renderProjectsIndex(projects: ProviderProjectV2[]): string {
  const lines: string[] = [
    '# Projects V2',
    '',
    `Total projects: ${projects.length}`,
    '',
    '| Number | Title | Status | Owner | Updated |',
    '|--------|-------|--------|-------|---------|',
  ]

  for (const project of projects) {
    const status = project.closed ? 'Closed' : 'Open'
    const visibility = project.public ? 'Public' : 'Private'
    const updated = new Date(project.updatedAt).toISOString().split('T')[0]
    lines.push(`| ${project.number} | [${project.title}](${project.url}) | ${status} (${visibility}) | ${project.owner.login} | ${updated} |`)
  }

  lines.push('')
  return lines.join('\n')
}

function renderProject(project: ProviderProjectV2): string {
  const lines: string[] = [
    '---',
    `id: ${project.id}`,
    `number: ${project.number}`,
    `title: ${project.title}`,
    `public: ${project.public}`,
    `closed: ${project.closed}`,
    `owner: ${project.owner.login}`,
    `created_at: ${project.createdAt}`,
    `updated_at: ${project.updatedAt}`,
    project.closedAt ? `closed_at: ${project.closedAt}` : '',
    `url: ${project.url}`,
    '---',
    '',
    `# ${project.title}`,
    '',
  ]

  if (project.shortDescription) {
    lines.push(project.shortDescription, '')
  }

  lines.push(
    `**Status:** ${project.closed ? 'Closed' : 'Open'}`,
    `**Visibility:** ${project.public ? 'Public' : 'Private'}`,
    `**Owner:** ${project.owner.login}`,
    `**Created:** ${project.createdAt}`,
    `**Updated:** ${project.updatedAt}`,
  )

  if (project.closedAt)
    lines.push(`**Closed:** ${project.closedAt}`)

  if (project.readme) {
    lines.push(
      '',
      '## README',
      '',
      project.readme,
    )
  }

  lines.push('')
  return lines.filter(Boolean).join('\n')
}

function renderProjectItems(items: ProviderProjectV2Item[], _fields: ProviderProjectV2Field[]): string {
  const lines: string[] = [
    '# Project Items',
    '',
    `Total items: ${items.length}`,
    '',
  ]

  if (items.length === 0)
    return lines.join('\n')

  const fieldNames = Array.from(
    new Set(items.flatMap(item => item.fieldValues.map(fv => fv.field.name))),
  )

  const headerRow = ['Content', ...fieldNames]
  const separatorRow = headerRow.map(() => '---')
  lines.push(`| ${headerRow.join(' | ')} |`)
  lines.push(`| ${separatorRow.join(' | ')} |`)

  for (const item of items) {
    const fieldValueMap = new Map(
      item.fieldValues.map(fv => [fv.field.name, fv.value]),
    )

    const contentCell = item.content
      ? `[#${item.content.number} - ${item.content.title}](${item.content.url})`
      : 'Draft'

    const cells = [contentCell]
    for (const fieldName of fieldNames) {
      const value = fieldValueMap.get(fieldName)
      cells.push(value != null ? String(value) : '')
    }

    lines.push(`| ${cells.join(' | ')} |`)
  }

  lines.push('')
  return lines.join('\n')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'project'
}
