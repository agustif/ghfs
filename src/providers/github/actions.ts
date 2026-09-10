import type { Octokit } from 'octokit'
import type {
  ActionsArchaeologyOptions,
  ActionsArchaeologyResult,
  ArtifactInfo,
  CacheInfo,
  JobInfo,
  OIDCClaimsInfo,
  WorkflowInfo,
  WorkflowRunInfo,
} from '../../types/actions'

const DEFAULT_LOG_SIZE_LIMIT = 1024 * 1024 * 10
const DEFAULT_RUN_LIMIT = 50

export async function fetchActionsArchaeology(
  octokit: Octokit,
  owner: string,
  repo: string,
  options: ActionsArchaeologyOptions = {},
): Promise<ActionsArchaeologyResult> {
  const {
    includeWorkflows = true,
    includeRuns = true,
    includeJobs = true,
    includeSteps = true,
    includeLogs = false,
    includeArtifacts = true,
    includeCaches = true,
    includeOIDC = false,
    logSizeLimit = DEFAULT_LOG_SIZE_LIMIT,
    runLimit = DEFAULT_RUN_LIMIT,
    branch,
    status,
    workflowId,
    event,
  } = options

  const result: ActionsArchaeologyResult = {
    repository: `${owner}/${repo}`,
    generated_at: new Date().toISOString(),
    options,
    summary: {
      total_workflows: 0,
      total_runs: 0,
      total_jobs: 0,
      total_artifacts: 0,
      total_caches: 0,
    },
  }

  if (includeWorkflows) {
    result.workflows = await fetchWorkflows(octokit, owner, repo)
    result.summary.total_workflows = result.workflows.length
  }

  if (includeRuns) {
    const runs = await fetchWorkflowRuns(octokit, owner, repo, {
      branch,
      status,
      workflowId,
      event,
      per_page: runLimit,
    })

    result.runs = []
    result.summary.total_runs = runs.length

    for (const run of runs) {
      const runData: {
        run: WorkflowRunInfo
        jobs?: Array<{ job: JobInfo, logs?: string }>
        artifacts?: ArtifactInfo[]
      } = {
        run,
      }

      if (includeJobs) {
        const jobs = await fetchJobs(octokit, owner, repo, run.id, includeSteps)
        runData.jobs = []
        result.summary.total_jobs += jobs.length

        for (const job of jobs) {
          const jobData: { job: JobInfo, logs?: string } = { job }

          if (includeLogs) {
            const logs = await fetchJobLogs(octokit, owner, repo, job.id, logSizeLimit)
            if (logs)
              jobData.logs = logs
          }

          runData.jobs.push(jobData)
        }
      }

      if (includeArtifacts) {
        const artifacts = await fetchArtifacts(octokit, owner, repo, run.id)
        runData.artifacts = artifacts
        result.summary.total_artifacts += artifacts.length
      }

      result.runs.push(runData)
    }
  }

  if (includeCaches) {
    result.caches = await fetchCaches(octokit, owner, repo, branch)
    result.summary.total_caches = result.caches.length
  }

  if (includeOIDC)
    result.oidc_claims = await fetchOIDCClaims(octokit, owner, repo)

  return result
}

async function fetchWorkflows(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<WorkflowInfo[]> {
  try {
    const response = await octokit.rest.actions.listRepoWorkflows({
      owner,
      repo,
      per_page: 100,
    })

    return response.data.workflows.map(w => ({
      id: w.id,
      node_id: w.node_id,
      name: w.name,
      path: w.path,
      state: w.state,
      created_at: w.created_at,
      updated_at: w.updated_at,
      url: w.url,
      html_url: w.html_url,
      badge_url: w.badge_url,
    }))
  }
  catch {
    return []
  }
}

async function fetchWorkflowRuns(
  octokit: Octokit,
  owner: string,
  repo: string,
  filters: {
    branch?: string
    status?: string
    workflowId?: string | number
    event?: string
    per_page?: number
  },
): Promise<WorkflowRunInfo[]> {
  try {
    const params: any = {
      owner,
      repo,
      per_page: filters.per_page || 50,
    }

    if (filters.branch)
      params.branch = filters.branch
    if (filters.status)
      params.status = filters.status
    if (filters.event)
      params.event = filters.event

    let response

    if (filters.workflowId) {
      response = await octokit.rest.actions.listWorkflowRuns({
        ...params,
        workflow_id: filters.workflowId,
      })
    }
    else {
      response = await octokit.rest.actions.listWorkflowRunsForRepo(params)
    }

    return response.data.workflow_runs.map(run => ({
      id: run.id,
      name: run.name || '',
      node_id: run.node_id,
      head_branch: run.head_branch || '',
      head_sha: run.head_sha,
      path: run.path,
      display_title: run.display_title,
      run_number: run.run_number,
      event: run.event,
      status: run.status || '',
      conclusion: run.conclusion,
      workflow_id: run.workflow_id,
      url: run.url,
      html_url: run.html_url,
      created_at: run.created_at,
      updated_at: run.updated_at,
      run_started_at: run.run_started_at || run.created_at,
      jobs_url: run.jobs_url,
      logs_url: run.logs_url,
      artifacts_url: run.artifacts_url,
      repository: {
        full_name: run.repository.full_name,
      },
    }))
  }
  catch {
    return []
  }
}

async function fetchJobs(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number,
  includeSteps: boolean,
): Promise<JobInfo[]> {
  try {
    const response = await octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
      per_page: 100,
    })

    return response.data.jobs.map(job => ({
      id: job.id,
      run_id: job.run_id,
      node_id: job.node_id,
      head_sha: job.head_sha,
      url: job.url,
      html_url: job.html_url || '',
      status: job.status,
      conclusion: job.conclusion,
      created_at: job.created_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
      name: job.name,
      steps: includeSteps
        ? job.steps?.map(step => ({
            name: step.name,
            status: step.status,
            conclusion: step.conclusion,
            number: step.number,
            started_at: step.started_at || null,
            completed_at: step.completed_at || null,
          }))
        : undefined,
      runner_name: job.runner_name,
      runner_group_name: job.runner_group_name,
      labels: job.labels || [],
    }))
  }
  catch {
    return []
  }
}

async function fetchJobLogs(
  octokit: Octokit,
  owner: string,
  repo: string,
  jobId: number,
  sizeLimit: number,
): Promise<string | null> {
  try {
    const response: any = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
      owner,
      repo,
      job_id: jobId,
    })

    if (typeof response.data === 'string') {
      const logs = response.data
      if (logs.length > sizeLimit)
        return `${logs.substring(0, sizeLimit)}\n\n... [LOG TRUNCATED - exceeded ${sizeLimit} bytes limit] ...`

      return logs
    }

    return null
  }
  catch {
    return null
  }
}

async function fetchArtifacts(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number,
): Promise<ArtifactInfo[]> {
  try {
    const response = await octokit.rest.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: runId,
      per_page: 100,
    })

    return response.data.artifacts.map(artifact => ({
      id: artifact.id,
      node_id: artifact.node_id,
      name: artifact.name,
      size_in_bytes: artifact.size_in_bytes,
      url: artifact.url,
      archive_download_url: artifact.archive_download_url,
      expired: artifact.expired,
      created_at: artifact.created_at,
      updated_at: artifact.updated_at,
      expires_at: artifact.expires_at,
      workflow_run: artifact.workflow_run
        ? {
            id: artifact.workflow_run.id,
            repository_id: artifact.workflow_run.repository_id,
            head_repository_id: artifact.workflow_run.head_repository_id,
            head_branch: artifact.workflow_run.head_branch,
            head_sha: artifact.workflow_run.head_sha,
          }
        : undefined as any,
    }))
  }
  catch {
    return []
  }
}

async function fetchCaches(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref?: string,
): Promise<CacheInfo[]> {
  try {
    const params: any = {
      owner,
      repo,
      per_page: 100,
    }

    if (ref)
      params.ref = ref

    const response = await octokit.rest.actions.getActionsCacheList(params)

    return response.data.actions_caches?.map(cache => ({
      id: cache.id,
      ref: cache.ref,
      key: cache.key,
      version: cache.version || '',
      last_accessed_at: cache.last_accessed_at,
      created_at: cache.created_at,
      size_in_bytes: cache.size_in_bytes,
    })) || []
  }
  catch {
    return []
  }
}

async function fetchOIDCClaims(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<OIDCClaimsInfo | null> {
  try {
    await octokit.rest.actions.getRepoPublicKey({
      owner,
      repo,
    })

    return null
  }
  catch {
    return null
  }
}
