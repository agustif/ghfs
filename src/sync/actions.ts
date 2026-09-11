// @ts-nocheck
import type {
  ProviderWorkflow,
  ProviderWorkflowJob,
  ProviderWorkflowRun,
} from '../types/provider'
import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { ACTIONS_DIR_NAME, ACTIONS_INDEX_FILE_NAME } from '../constants'

export interface ActionsSyncResult {
  workflows: ProviderWorkflow[]
  totalRuns: number
  totalJobs: number
  totalArtifacts: number
}

export async function syncActions(
  context: SyncContext,
  runsPerWorkflow: number = 30,
): Promise<ActionsSyncResult> {
  const actionsDir = join(context.storageDirAbsolute, ACTIONS_DIR_NAME)
  await mkdir(actionsDir, { recursive: true })

  const workflows = await context.provider.fetchWorkflows()
  let totalRuns = 0
  let totalJobs = 0
  let totalArtifacts = 0

  for (const workflow of workflows) {
    const workflowDir = join(actionsDir, sanitizeFileName(workflow.name))
    await mkdir(workflowDir, { recursive: true })

    await writeFile(
      join(workflowDir, 'workflow.json'),
      JSON.stringify(workflow, null, 2),
      'utf8',
    )

    const runs = await context.provider.fetchWorkflowRuns(workflow.id, {
      perPage: runsPerWorkflow,
    })
    totalRuns += runs.length

    await writeFile(
      join(workflowDir, 'runs.json'),
      JSON.stringify(runs, null, 2),
      'utf8',
    )

    await writeWorkflowRunsMarkdown(workflowDir, workflow, runs)

    const runsDir = join(workflowDir, 'runs')
    await mkdir(runsDir, { recursive: true })

    for (const run of runs.slice(0, Math.min(5, runs.length))) {
      const runDir = join(runsDir, `${run.runNumber}`)
      await mkdir(runDir, { recursive: true })

      await writeFile(
        join(runDir, 'run.json'),
        JSON.stringify(run, null, 2),
        'utf8',
      )

      try {
        const attempts = await context.provider.fetchWorkflowRunAttempts(run.id)
        const jobs = await context.provider.fetchWorkflowRunJobs(run.id, attempts)
        totalJobs += jobs.length

        await writeFile(
          join(runDir, 'jobs.json'),
          JSON.stringify(jobs, null, 2),
          'utf8',
        )

        await writeWorkflowJobsMarkdown(runDir, run, jobs)

        const artifacts = await context.provider.fetchWorkflowRunArtifacts(run.id)
        totalArtifacts += artifacts.length

        if (artifacts.length > 0) {
          await writeFile(
            join(runDir, 'artifacts.json'),
            JSON.stringify(artifacts, null, 2),
            'utf8',
          )
        }

        await writeJobLogs(runDir, context, jobs)
      }
      catch (error) {
        await writeFile(
          join(runDir, 'error.txt'),
          `Failed to fetch run details: ${error}`,
          'utf8',
        )
      }
    }
  }

  try {
    const secrets = await context.provider.fetchRepositorySecrets()
    if (secrets.length > 0) {
      await writeFile(
        join(actionsDir, 'secrets.json'),
        JSON.stringify({ names: secrets, count: secrets.length }, null, 2),
        'utf8',
      )
    }
  }
  catch {
  }

  try {
    const runners = await context.provider.fetchSelfHostedRunners()
    if (runners.length > 0) {
      await writeFile(
        join(actionsDir, 'runners.json'),
        JSON.stringify(runners, null, 2),
        'utf8',
      )
    }
  }
  catch {
  }

  try {
    const requiredWorkflows = await context.provider.fetchRequiredWorkflows()
    if (requiredWorkflows.length > 0) {
      await writeFile(
        join(actionsDir, 'required-workflows.json'),
        JSON.stringify(requiredWorkflows, null, 2),
        'utf8',
      )
    }
  }
  catch {
  }

  await writeActionsIndexMarkdown(context, workflows, totalRuns, totalJobs, totalArtifacts)

  return {
    workflows,
    totalRuns,
    totalJobs,
    totalArtifacts,
  }
}

async function writeWorkflowRunsMarkdown(
  workflowDir: string,
  workflow: ProviderWorkflow,
  runs: ProviderWorkflowRun[],
): Promise<void> {
  const lines = [
    `# ${workflow.name}`,
    '',
    `**Path:** \`${workflow.path}\``,
    `**State:** ${workflow.state}`,
    `**Updated:** ${workflow.updatedAt}`,
    '',
    `[View on GitHub](${workflow.htmlUrl})`,
    '',
    `## Recent Runs (${runs.length})`,
    '',
  ]

  if (runs.length > 0) {
    lines.push('| Run # | Status | Conclusion | Branch | Event | Actor | Started |')
    lines.push('|-------|--------|------------|--------|-------|-------|---------|')

    for (const run of runs) {
      const status = run.conclusion || run.status || 'unknown'
      const branch = run.headBranch || 'n/a'
      const actor = run.actor || 'n/a'
      const started = run.runStartedAt ? new Date(run.runStartedAt).toISOString().split('T')[0] : 'n/a'

      lines.push(
        `| [#${run.runNumber}](${run.htmlUrl}) | ${run.status} | ${status} | ${branch} | ${run.event} | @${actor} | ${started} |`,
      )
    }
  }
  else {
    lines.push('No runs found.')
  }

  await writeFile(
    join(workflowDir, 'README.md'),
    lines.join('\n'),
    'utf8',
  )
}

async function writeWorkflowJobsMarkdown(
  runDir: string,
  run: ProviderWorkflowRun,
  jobs: ProviderWorkflowJob[],
): Promise<void> {
  const lines = [
    `# Run #${run.runNumber}: ${run.displayTitle}`,
    '',
    `**Status:** ${run.status}`,
    `**Conclusion:** ${run.conclusion || 'n/a'}`,
    `**Branch:** ${run.headBranch || 'n/a'}`,
    `**Event:** ${run.event}`,
    `**SHA:** \`${run.headSha}\``,
    `**Started:** ${run.runStartedAt || 'n/a'}`,
    '',
    `[View on GitHub](${run.htmlUrl})`,
    '',
    `## Jobs (${jobs.length})`,
    '',
  ]

  if (jobs.length > 0) {
    for (const job of jobs) {
      lines.push(`### ${job.name}`)
      lines.push('')
      lines.push(`- **Status:** ${job.status}`)
      lines.push(`- **Conclusion:** ${job.conclusion || 'n/a'}`)
      lines.push(`- **Started:** ${job.startedAt}`)
      lines.push(`- **Completed:** ${job.completedAt || 'running'}`)

      if (job.labels.length > 0)
        lines.push(`- **Labels:** ${job.labels.join(', ')}`)

      if (job.runnerName)
        lines.push(`- **Runner:** ${job.runnerName}`)

      lines.push('')

      if (job.steps.length > 0) {
        lines.push('**Steps:**')
        lines.push('')
        lines.push('| # | Step | Status | Conclusion |')
        lines.push('|---|------|--------|------------|')

        for (const step of job.steps) {
          const conclusion = step.conclusion || 'n/a'
          lines.push(`| ${step.number} | ${step.name} | ${step.status} | ${conclusion} |`)
        }

        lines.push('')
      }

      lines.push(`[View job](${job.htmlUrl || job.url})`)
      lines.push('')
    }
  }
  else {
    lines.push('No jobs found.')
  }

  await writeFile(
    join(runDir, 'README.md'),
    lines.join('\n'),
    'utf8',
  )
}

async function writeJobLogs(
  runDir: string,
  context: SyncContext,
  jobs: ProviderWorkflowJob[],
): Promise<void> {
  const logsDir = join(runDir, 'logs')
  await mkdir(logsDir, { recursive: true })

  for (const job of jobs) {
    try {
      const logs = await context.provider.fetchJobLogs(job.id)
      const fileName = sanitizeFileName(job.name)
      await writeFile(
        join(logsDir, `${fileName}.log`),
        logs,
        'utf8',
      )
    }
    catch (error) {
      const fileName = sanitizeFileName(job.name)
      await writeFile(
        join(logsDir, `${fileName}.error.txt`),
        `Failed to fetch logs: ${error}`,
        'utf8',
      )
    }
  }
}

async function writeActionsIndexMarkdown(
  context: SyncContext,
  workflows: ProviderWorkflow[],
  totalRuns: number,
  totalJobs: number,
  totalArtifacts: number,
): Promise<void> {
  const lines = [
    '# GitHub Actions',
    '',
    `- repo: ${context.repoSlug}`,
    `- synced_at: ${context.syncedAt}`,
    `- workflows: ${workflows.length}`,
    `- total_runs_fetched: ${totalRuns}`,
    `- total_jobs_fetched: ${totalJobs}`,
    `- total_artifacts_fetched: ${totalArtifacts}`,
    '',
    '## Workflows',
    '',
  ]

  if (workflows.length > 0) {
    lines.push('| Name | Path | State | Updated |')
    lines.push('|------|------|-------|---------|')

    for (const workflow of workflows) {
      const name = workflow.name
      const path = workflow.path
      const state = workflow.state
      const updated = new Date(workflow.updatedAt).toISOString().split('T')[0]

      lines.push(`| [${name}](${sanitizeFileName(name)}/README.md) | \`${path}\` | ${state} | ${updated} |`)
    }
  }
  else {
    lines.push('No workflows found.')
  }

  lines.push('')

  await writeFile(
    join(context.storageDirAbsolute, ACTIONS_INDEX_FILE_NAME),
    lines.join('\n'),
    'utf8',
  )
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}
