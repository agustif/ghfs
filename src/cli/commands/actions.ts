import type { CAC } from 'cac'
import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { outro, spinner } from '@clack/prompts'
import { join } from 'pathe'
import { resolveAuthToken } from '../../config/auth'
import { fetchActionsArchaeology } from '../../providers/github/actions'
import { createGitHubClient } from '../../providers/github/client'
import { splitRepo } from '../../utils/repo'
import { withErrorHandling } from '../errors'

export function registerActionsCommand(cli: CAC): void {
  cli
    .command('actions [repo]', 'Archaeology of GitHub Actions workflows, runs, jobs, logs, artifacts, and caches')
    .option('--token <token>', 'GitHub personal access token (overrides config)')
    .option('--output <path>', 'Output file path (default: actions-archaeology.json)', { default: 'actions-archaeology.json' })
    .option('--no-workflows', 'Skip fetching workflows')
    .option('--no-runs', 'Skip fetching workflow runs')
    .option('--no-jobs', 'Skip fetching jobs')
    .option('--no-steps', 'Skip fetching step details')
    .option('--logs', 'Include job logs (can be large)')
    .option('--no-artifacts', 'Skip fetching artifacts metadata')
    .option('--no-caches', 'Skip fetching caches')
    .option('--oidc', 'Include OIDC claims metadata (if available)')
    .option('--log-limit <bytes>', 'Maximum log size in bytes per job', { default: 10485760 })
    .option('--run-limit <count>', 'Maximum number of workflow runs to fetch', { default: 50 })
    .option('--branch <branch>', 'Filter runs by branch')
    .option('--status <status>', 'Filter runs by status (completed, in_progress, queued, etc.)')
    .option('--workflow <id>', 'Filter runs by workflow ID or filename')
    .option('--event <event>', 'Filter runs by event type (push, pull_request, etc.)')
    .option('--pretty', 'Pretty-print JSON output')
    .action(withErrorHandling(async (repoInput: string | undefined, options: any) => {
      const s = spinner()

      try {
        const cwd = process.cwd()
        let owner: string
        let repo: string

        if (repoInput) {
          const parsed = splitRepo(repoInput)
          owner = parsed.owner
          repo = parsed.repo
        }
        else {
          const ghfsPath = join(cwd, '.ghfs')
          if (!existsSync(ghfsPath))
            throw new Error('No repository specified and no .ghfs directory found in current directory. Usage: ghfs actions <owner/repo>')

          const configPath = join(ghfsPath, 'config.json')
          if (!existsSync(configPath))
            throw new Error('Cannot determine repository from .ghfs directory')

          const config = JSON.parse(readFileSync(configPath, 'utf-8'))
          const parsed = splitRepo(config.repository || '')
          owner = parsed.owner
          repo = parsed.repo
        }

        const token = await resolveAuthToken({
          token: options.token,
          interactive: false,
        })

        s.start(`Excavating GitHub Actions for ${owner}/${repo}`)

        const octokit = createGitHubClient(token)

        const archaeologyOptions = {
          includeWorkflows: options.workflows !== false,
          includeRuns: options.runs !== false,
          includeJobs: options.jobs !== false,
          includeSteps: options.steps !== false,
          includeLogs: options.logs === true,
          includeArtifacts: options.artifacts !== false,
          includeCaches: options.caches !== false,
          includeOIDC: options.oidc === true,
          logSizeLimit: Number.parseInt(options.logLimit, 10),
          runLimit: Number.parseInt(options.runLimit, 10),
          branch: options.branch,
          status: options.status,
          workflowId: options.workflow,
          event: options.event,
        }

        const result = await fetchActionsArchaeology(
          octokit,
          owner,
          repo,
          archaeologyOptions,
        )

        const outputPath = join(cwd, options.output)
        const jsonContent = options.pretty
          ? JSON.stringify(result, null, 2)
          : JSON.stringify(result)

        await writeFile(outputPath, jsonContent, 'utf-8')

        s.stop(`Actions archaeology complete!`)

        outro(`
📊 Summary:
  • Workflows: ${result.summary.total_workflows}
  • Runs: ${result.summary.total_runs}
  • Jobs: ${result.summary.total_jobs}
  • Artifacts: ${result.summary.total_artifacts}
  • Caches: ${result.summary.total_caches}

📁 Report saved to: ${outputPath}
`)
      }
      catch (error) {
        s.stop('Failed')
        throw error
      }
    }))
}
