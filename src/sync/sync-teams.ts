import type { ProviderGraphQLTeam } from '../types/graphql-provider'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncTeams(
  directory: string,
  teams: ProviderGraphQLTeam[],
): Promise<void> {
  const teamsDir = join(directory, 'teams')
  await mkdir(teamsDir, { recursive: true })

  const indexPath = join(teamsDir, 'index.md')
  const indexContent = renderTeamsIndex(teams)
  await writeFile(indexPath, indexContent, 'utf-8')

  for (const team of teams) {
    const teamPath = join(teamsDir, `${team.slug}.md`)
    const teamContent = renderTeam(team)
    await writeFile(teamPath, teamContent, 'utf-8')
  }
}

function renderTeamsIndex(teams: ProviderGraphQLTeam[]): string {
  const lines: string[] = [
    '# Organization Teams',
    '',
    `Total teams: ${teams.length}`,
    '',
    '| Name | Privacy | Members | Repositories | Updated |',
    '|------|---------|---------|--------------|---------|',
  ]

  for (const team of teams) {
    const updated = new Date(team.updatedAt).toISOString().split('T')[0]
    lines.push(`| [${team.name}](${team.url}) | ${team.privacy} | ${team.membersCount} | ${team.repositoriesCount} | ${updated} |`)
  }

  lines.push('')
  return lines.join('\n')
}

function renderTeam(team: ProviderGraphQLTeam): string {
  const lines: string[] = [
    '---',
    `id: ${team.id}`,
    `slug: ${team.slug}`,
    `name: ${team.name}`,
    `privacy: ${team.privacy}`,
    `members_count: ${team.membersCount}`,
    `repositories_count: ${team.repositoriesCount}`,
    `created_at: ${team.createdAt}`,
    `updated_at: ${team.updatedAt}`,
    `url: ${team.url}`,
    '---',
    '',
    `# ${team.name}`,
    '',
  ]

  if (team.description)
    lines.push(team.description, '')

  lines.push(
    `**Slug:** ${team.slug}`,
    `**Privacy:** ${team.privacy}`,
    `**Members:** ${team.membersCount}`,
    `**Repositories:** ${team.repositoriesCount}`,
    `**Created:** ${new Date(team.createdAt).toISOString().split('T')[0]}`,
    `**Updated:** ${new Date(team.updatedAt).toISOString().split('T')[0]}`,
    '',
  )

  return lines.join('\n')
}
