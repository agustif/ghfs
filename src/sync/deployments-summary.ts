import type { SyncContext } from './sync-repository-types'

export interface DeploymentsSummary {
  environments: Record<string, {
    latest: {
      id: number
      state: string
      description: string | null
      createdAt: string
      updatedAt: string
      creator: string | null
      ref: string
      sha: string
      url?: string
    }
    count: number
  }>
  syncedAt: string
}

export async function buildDeploymentsSummary(
  context: SyncContext,
): Promise<DeploymentsSummary | null> {
  if (!context.provider.fetchDeployments)
    return null

  try {
    const deployments = await context.provider.fetchDeployments()

    const environments: DeploymentsSummary['environments'] = {}

    for (const deployment of deployments) {
      const env = deployment.environment

      if (!environments[env]) {
        environments[env] = {
          latest: {
            id: deployment.id,
            state: deployment.state,
            description: deployment.description,
            createdAt: deployment.createdAt,
            updatedAt: deployment.updatedAt,
            creator: deployment.creator,
            ref: deployment.ref,
            sha: deployment.sha,
            url: deployment.url,
          },
          count: 1,
        }
      }
      else {
        environments[env].count += 1

        const currentLatest = new Date(environments[env].latest.createdAt)
        const thisCreated = new Date(deployment.createdAt)

        if (thisCreated > currentLatest) {
          environments[env].latest = {
            id: deployment.id,
            state: deployment.state,
            description: deployment.description,
            createdAt: deployment.createdAt,
            updatedAt: deployment.updatedAt,
            creator: deployment.creator,
            ref: deployment.ref,
            sha: deployment.sha,
            url: deployment.url,
          }
        }
      }
    }

    return {
      environments,
      syncedAt: context.syncedAt,
    }
  }
  catch {
    return null
  }
}

export function renderDeploymentsSummary(summary: DeploymentsSummary): string {
  const lines: string[] = [
    '# Deployments',
    '',
    `Synced at: ${summary.syncedAt}`,
    `Total environments: ${Object.keys(summary.environments).length}`,
    '',
  ]

  if (Object.keys(summary.environments).length === 0) {
    lines.push('No deployments found')
    return `${lines.join('\n')}\n`
  }

  for (const [env, data] of Object.entries(summary.environments)) {
    lines.push(`## ${env}`, '')
    lines.push(`- **Total deployments**: ${data.count}`)
    lines.push(`- **Latest state**: ${data.latest.state}`)
    lines.push(`- **Latest creator**: @${data.latest.creator ?? 'unknown'}`)
    lines.push(`- **Latest ref**: ${data.latest.ref}`)
    lines.push(`- **Latest SHA**: ${data.latest.sha.substring(0, 7)}`)
    lines.push(`- **Created**: ${data.latest.createdAt}`)
    lines.push(`- **Updated**: ${data.latest.updatedAt}`)

    if (data.latest.url)
      lines.push(`- **URL**: ${data.latest.url}`)

    if (data.latest.description)
      lines.push(`- **Description**: ${data.latest.description}`)

    lines.push('')
  }

  return lines.join('\n')
}
