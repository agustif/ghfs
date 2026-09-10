import type { GhfsResolvedConfig } from '../types'
import type { ProviderActionsWorkflowJob, ProviderActionsWorkflowRun, RepositoryProvider } from '../types/provider'
import { Buffer } from 'node:buffer'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'pathe'
import {
  getActionsArtifactsPath,
  getActionsJobFailDigestPath,
  getActionsJobLogPath,
  getWebhookDeliveriesPath,
  getWebhooksConfigPath,
} from './paths'

export interface SyncActionsOptions {
  provider: RepositoryProvider
  storageDirAbsolute: string
  config: GhfsResolvedConfig
}

export async function syncActions(options: SyncActionsOptions): Promise<void> {
  const { provider, storageDirAbsolute, config } = options
  const { actionsLogs, actionsArtifacts, actionsLogsMaxKb } = config.sync

  if (!actionsLogs && !actionsArtifacts)
    return

  const runs = await provider.fetchActionsWorkflowRuns({ limit: config.sync.actionsRunsLimit })

  for (const run of runs) {
    if (actionsLogs && shouldSyncRunLogs(run, actionsLogs)) {
      await syncRunLogs(provider, storageDirAbsolute, run, actionsLogsMaxKb)
    }

    if (actionsArtifacts) {
      await syncRunArtifacts(provider, storageDirAbsolute, run.id)
    }
  }
}

function shouldSyncRunLogs(run: ProviderActionsWorkflowRun, mode: false | 'failed' | 'recent'): boolean {
  if (mode === false)
    return false

  if (mode === 'failed')
    return run.conclusion === 'failure'

  if (mode === 'recent') {
    const ageMs = Date.now() - new Date(run.createdAt).getTime()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    return ageMs < sevenDaysMs
  }

  return false
}

async function syncRunLogs(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  run: ProviderActionsWorkflowRun,
  maxKb: number,
): Promise<void> {
  const jobs = await provider.fetchActionsWorkflowJobs(run.id)

  for (const job of jobs) {
    if (job.conclusion === 'failure' || job.status === 'completed') {
      await syncJobLog(provider, storageDirAbsolute, run.id, job, maxKb)
    }
  }
}

async function syncJobLog(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  runId: number,
  job: ProviderActionsWorkflowJob,
  maxKb: number,
): Promise<void> {
  try {
    const rawLog = await provider.fetchActionsJobLogs(job.id)
    const logPath = getActionsJobLogPath(storageDirAbsolute, runId, job.id)

    await mkdir(dirname(logPath), { recursive: true })

    const maxBytes = maxKb * 1024
    const logBytes = Buffer.byteLength(rawLog, 'utf8')

    if (logBytes > maxBytes) {
      const tail = rawLog.slice(-maxBytes)
      await writeFile(logPath, `[Log truncated: showing last ${maxKb} KB of ${Math.round(logBytes / 1024)} KB]\n\n${tail}`, 'utf8')
    }
    else {
      await writeFile(logPath, rawLog, 'utf8')
    }

    if (job.conclusion === 'failure') {
      await writeFailDigest(storageDirAbsolute, runId, job, rawLog, maxKb)
    }
  }
  catch (error) {
    console.error(`Failed to sync log for job ${job.id}:`, error)
  }
}

async function writeFailDigest(
  storageDirAbsolute: string,
  runId: number,
  job: ProviderActionsWorkflowJob,
  rawLog: string,
  maxKb: number,
): Promise<void> {
  const failPath = getActionsJobFailDigestPath(storageDirAbsolute, runId, job.id)
  await mkdir(dirname(failPath), { recursive: true })

  const failedSteps = job.steps.filter(step => step.conclusion === 'failure')
  const digest = [
    `# Job Failed: ${job.name}`,
    '',
    `**Run ID:** ${runId}`,
    `**Job ID:** ${job.id}`,
    `**Status:** ${job.status}`,
    `**Conclusion:** ${job.conclusion}`,
    `**Started:** ${job.startedAt}`,
    `**Completed:** ${job.completedAt ?? 'N/A'}`,
    `**URL:** ${job.url}`,
    '',
    '## Failed Steps',
    '',
    ...failedSteps.map((step) => {
      return [
        `### ${step.name}`,
        '',
        `- **Number:** ${step.number}`,
        `- **Status:** ${step.status}`,
        `- **Conclusion:** ${step.conclusion}`,
        `- **Started:** ${step.startedAt ?? 'N/A'}`,
        `- **Completed:** ${step.completedAt ?? 'N/A'}`,
        '',
      ].join('\n')
    }),
    '## Log Excerpt',
    '',
    '```',
    extractLogTail(rawLog, 200),
    '```',
    '',
    `Full log: \`./log.txt\` (showing last ${maxKb} KB if truncated)`,
  ].join('\n')

  await writeFile(failPath, digest, 'utf8')
}

function extractLogTail(log: string, lines: number): string {
  const allLines = log.split('\n')
  const tail = allLines.slice(-lines)
  return tail.join('\n')
}

async function syncRunArtifacts(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  runId: number,
): Promise<void> {
  try {
    const artifacts = await provider.fetchActionsRunArtifacts(runId)
    const artifactsPath = getActionsArtifactsPath(storageDirAbsolute, runId)

    await mkdir(dirname(artifactsPath), { recursive: true })

    const artifactsData = {
      runId,
      totalCount: artifacts.length,
      artifacts: artifacts.map(artifact => ({
        id: artifact.id,
        name: artifact.name,
        sizeInBytes: artifact.sizeInBytes,
        expired: artifact.expired,
        createdAt: artifact.createdAt,
        expiresAt: artifact.expiresAt,
        url: artifact.url,
      })),
    }

    await writeFile(artifactsPath, JSON.stringify(artifactsData, null, 2), 'utf8')
  }
  catch (error) {
    console.error(`Failed to sync artifacts for run ${runId}:`, error)
  }
}

export interface SyncWebhooksOptions {
  provider: RepositoryProvider
  storageDirAbsolute: string
  config: GhfsResolvedConfig
}

export async function syncWebhooks(options: SyncWebhooksOptions): Promise<void> {
  const { provider, storageDirAbsolute, config } = options

  if (!config.sync.webhooks)
    return

  try {
    const hooks = await provider.fetchWebhooks()
    const configPath = getWebhooksConfigPath(storageDirAbsolute)

    await mkdir(dirname(configPath), { recursive: true })

    const sanitizedHooks = hooks.map(hook => ({
      id: hook.id,
      type: hook.type,
      name: hook.name,
      active: hook.active,
      events: hook.events,
      config: {
        url: hook.config.url ? redactUrlHost(hook.config.url) : undefined,
        contentType: hook.config.contentType,
        insecureSsl: hook.config.insecureSsl,
        secret: '[redacted]',
      },
      updatedAt: hook.updatedAt,
      createdAt: hook.createdAt,
    }))

    await writeFile(configPath, JSON.stringify({ webhooks: sanitizedHooks }, null, 2), 'utf8')

    for (const hook of hooks) {
      await syncWebhookDeliveries(provider, storageDirAbsolute, hook.id, config.sync.webhooksMaxDeliveries)
    }
  }
  catch (error) {
    console.error('Failed to sync webhooks:', error)
  }
}

function redactUrlHost(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname.replace(/./g, '*')}${parsed.pathname}`
  }
  catch {
    return '[redacted]'
  }
}

async function syncWebhookDeliveries(
  provider: RepositoryProvider,
  storageDirAbsolute: string,
  hookId: number,
  maxDeliveries: number,
): Promise<void> {
  try {
    const deliveries = await provider.fetchWebhookDeliveries(hookId, { perPage: maxDeliveries })
    const deliveriesPath = getWebhookDeliveriesPath(storageDirAbsolute, hookId)

    await mkdir(dirname(deliveriesPath), { recursive: true })

    const deliveriesData = {
      hookId,
      totalCount: deliveries.length,
      deliveries: deliveries.map(delivery => ({
        id: delivery.id,
        guid: delivery.guid,
        deliveredAt: delivery.deliveredAt,
        redelivery: delivery.redelivery,
        duration: delivery.duration,
        status: delivery.status,
        statusCode: delivery.statusCode,
        event: delivery.event,
        action: delivery.action,
        url: delivery.url,
      })),
    }

    await writeFile(deliveriesPath, JSON.stringify(deliveriesData, null, 2), 'utf8')
  }
  catch (error) {
    console.error(`Failed to sync deliveries for webhook ${hookId}:`, error)
  }
}
