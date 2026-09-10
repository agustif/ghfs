import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { buildActivitySummary, renderActivitySummary } from './activity-summary'
import { buildAgentHints, renderAgentHints } from './agent-hints'
import { buildDeploymentsSummary, renderDeploymentsSummary } from './deployments-summary'

export async function writeExtendedMetadataErgonomics(context: SyncContext): Promise<void> {
  const storageDirAbsolute = context.storageDirAbsolute
  const config = context.config.extended

  if (!config)
    return

  await mkdir(storageDirAbsolute, { recursive: true })

  if (config.activity !== false) {
    const activitySummary = await buildActivitySummary(context, 50)
    if (activitySummary) {
      await writeFile(
        join(storageDirAbsolute, 'activity.md'),
        renderActivitySummary(activitySummary),
        'utf8',
      )
    }
  }

  if (config.agentHints !== false) {
    const agentHints = await buildAgentHints(context)
    await writeFile(
      join(storageDirAbsolute, 'agent-hints.md'),
      renderAgentHints(agentHints),
      'utf8',
    )
  }

  if (config.deployments !== false) {
    const deploymentsDir = join(storageDirAbsolute, 'deployments')
    await mkdir(deploymentsDir, { recursive: true })

    const deploymentsSummary = await buildDeploymentsSummary(context)
    if (deploymentsSummary) {
      await writeFile(
        join(deploymentsDir, 'summary.md'),
        renderDeploymentsSummary(deploymentsSummary),
        'utf8',
      )

      await writeFile(
        join(deploymentsDir, 'summary.json'),
        `${JSON.stringify(deploymentsSummary, null, 2)}\n`,
        'utf8',
      )
    }
  }
}
