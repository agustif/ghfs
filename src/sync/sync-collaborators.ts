import type { CollaboratorsSummary } from '../types/people'
import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { COLLABORATORS_FILE_NAME } from '../constants'

export async function syncCollaborators(context: SyncContext): Promise<void> {
  try {
    const [collaborators, teams, apps] = await Promise.all([
      context.provider.fetchCollaborators(),
      context.provider.fetchTeams(),
      context.provider.fetchAppInstallations(),
    ])

    const summary: CollaboratorsSummary = {
      collaborators: collaborators.map(c => ({
        login: c.login,
        name: c.name,
        avatarUrl: c.avatarUrl,
        permission: c.permission,
        ...(c.roleName ? { role_name: c.roleName } : {}),
      })),
      teams: teams.map(t => ({
        name: t.name,
        slug: t.slug,
        description: t.description,
        permission: t.permission,
        members: t.members,
      })),
      apps: apps.map(a => ({
        name: a.name,
        slug: a.slug,
        description: a.description,
        permissions: a.permissions,
      })),
      syncedAt: context.syncedAt,
    }

    await mkdir(context.storageDirAbsolute, { recursive: true })
    await writeFile(
      join(context.storageDirAbsolute, COLLABORATORS_FILE_NAME),
      `${JSON.stringify(summary, null, 2)}\n`,
      'utf8',
    )
  }
  catch (error) {
    const status = (error as { status?: number }).status
    if (status === 403 || status === 404)
      return

    throw error
  }
}
