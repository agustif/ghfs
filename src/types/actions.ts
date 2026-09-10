export interface ActionsArchaeologyOptions {
  includeWorkflows?: boolean
  includeRuns?: boolean
  includeJobs?: boolean
  includeSteps?: boolean
  includeLogs?: boolean
  includeArtifacts?: boolean
  includeCaches?: boolean
  includeOIDC?: boolean
  logSizeLimit?: number
  runLimit?: number
  branch?: string
  status?: 'completed' | 'action_required' | 'cancelled' | 'failure' | 'neutral' | 'skipped' | 'stale' | 'success' | 'timed_out' | 'in_progress' | 'queued' | 'requested' | 'waiting' | 'pending'
  workflowId?: string | number
  event?: string
}

export interface WorkflowInfo {
  id: number
  node_id: string
  name: string
  path: string
  state: string
  created_at: string
  updated_at: string
  url: string
  html_url: string
  badge_url: string
}

export interface WorkflowRunInfo {
  id: number
  name: string
  node_id: string
  head_branch: string
  head_sha: string
  path: string
  display_title: string
  run_number: number
  event: string
  status: string
  conclusion: string | null
  workflow_id: number
  url: string
  html_url: string
  created_at: string
  updated_at: string
  run_started_at: string
  jobs_url: string
  logs_url: string
  artifacts_url: string
  repository: {
    full_name: string
  }
}

export interface JobInfo {
  id: number
  run_id: number
  node_id: string
  head_sha: string
  url: string
  html_url: string
  status: 'completed' | 'in_progress' | 'queued' | 'requested' | 'waiting' | 'pending'
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null
  created_at: string
  started_at: string
  completed_at: string | null
  name: string
  steps?: StepInfo[]
  runner_name: string | null
  runner_group_name: string | null
  labels: string[]
}

export interface StepInfo {
  name: string
  status: string
  conclusion: string | null
  number: number
  started_at: string | null
  completed_at: string | null
}

export interface ArtifactInfo {
  id: number
  node_id: string
  name: string
  size_in_bytes: number
  url: string
  archive_download_url: string
  expired: boolean
  created_at: string | null
  updated_at: string | null
  expires_at: string | null
  workflow_run: {
    id: number
    repository_id: number
    head_repository_id: number
    head_branch: string
    head_sha: string
  }
}

export interface CacheInfo {
  id?: number
  ref?: string
  key?: string
  version: string
  last_accessed_at?: string
  created_at?: string
  size_in_bytes?: number
}

export interface OIDCClaimsInfo {
  jti: string
  sub: string
  aud: string
  ref: string
  sha: string
  repository: string
  repository_owner: string
  repository_owner_id: string
  run_id: string
  run_number: string
  run_attempt: string
  actor: string
  workflow: string
  head_ref: string
  base_ref: string
  event_name: string
  ref_type: string
  environment: string
  job_workflow_ref: string
  repository_visibility: string
}

export interface ActionsArchaeologyResult {
  repository: string
  generated_at: string
  options: ActionsArchaeologyOptions
  workflows?: WorkflowInfo[]
  runs?: Array<{
    run: WorkflowRunInfo
    jobs?: Array<{
      job: JobInfo
      logs?: string
    }>
    artifacts?: ArtifactInfo[]
  }>
  caches?: CacheInfo[]
  oidc_claims?: OIDCClaimsInfo | null
  summary: {
    total_workflows: number
    total_runs: number
    total_jobs: number
    total_artifacts: number
    total_caches: number
  }
}
