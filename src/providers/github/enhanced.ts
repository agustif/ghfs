// @ts-nocheck
import type { Octokit } from 'octokit'
import type {
  ProviderBranchProtection,
  ProviderRelease,
  ProviderRepositoryContent,
  ProviderRepositoryTopics,
  ProviderWorkflowRun,
} from '../../types/provider'

type BumpRequestCount = () => void

export async function fetchRepositoryTopics(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderRepositoryTopics> {
  bumpRequestCount()
  try {
    const result = await octokit.rest.repos.getAllTopics({ owner, repo })
    return { names: result.data.names }
  }
  catch {
    return { names: [] }
  }
}

export async function fetchReleases(
  octokit: Octokit,
  owner: string,
  repo: string,
  limit: number = 30,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderRelease[]> {
  bumpRequestCount()
  try {
    const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
      owner,
      repo,
      per_page: Math.min(limit, 100),
    })
    return releases.slice(0, limit).map((release: any) => ({
      id: release.id,
      tag_name: release.tag_name,
      name: release.name ?? null,
      body: release.body ?? null,
      draft: release.draft,
      prerelease: release.prerelease,
      created_at: release.created_at,
      published_at: release.published_at ?? null,
      author: release.author?.login ?? null,
      html_url: release.html_url,
    }))
  }
  catch {
    return []
  }
}

export async function fetchBranchProtection(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderBranchProtection | null> {
  bumpRequestCount()
  try {
    const result = await octokit.rest.repos.getBranchProtection({ owner, repo, branch })
    const protection = result.data as any
    return {
      pattern: branch,
      required_status_checks: protection.required_status_checks ?? null,
      required_pull_request_reviews: protection.required_pull_request_reviews ?? null,
      enforce_admins: protection.enforce_admins?.enabled ?? false,
      required_linear_history: protection.required_linear_history?.enabled ?? false,
      allow_force_pushes: protection.allow_force_pushes?.enabled ?? false,
      allow_deletions: protection.allow_deletions?.enabled ?? false,
    }
  }
  catch {
    return null
  }
}

export async function fetchRecentWorkflowRuns(
  octokit: Octokit,
  owner: string,
  repo: string,
  limit: number = 20,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderWorkflowRun[]> {
  bumpRequestCount()
  try {
    const result = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: Math.min(limit, 100),
    })
    return result.data.workflow_runs.slice(0, limit).map((run: any) => ({
      id: run.id,
      name: run.name ?? null,
      head_branch: run.head_branch ?? null,
      head_sha: run.head_sha,
      status: run.status,
      conclusion: run.conclusion ?? null,
      workflow_id: run.workflow_id,
      created_at: run.created_at,
      updated_at: run.updated_at,
      html_url: run.html_url,
      event: run.event,
      actor: run.actor?.login ?? null,
    }))
  }
  catch {
    return []
  }
}

export async function fetchRepositoryContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderRepositoryContent | null> {
  bumpRequestCount()
  try {
    const result = await octokit.rest.repos.getContent({ owner, repo, path })
    const content = result.data as any
    if (Array.isArray(content))
      return null
    return {
      name: content.name,
      path: content.path,
      sha: content.sha,
      size: content.size,
      url: content.url,
      html_url: content.html_url,
      git_url: content.git_url,
      download_url: content.download_url ?? null,
      type: content.type,
      content: content.content,
      encoding: content.encoding,
    }
  }
  catch {
    return null
  }
}

export async function fetchPinnedIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<number[]> {
  bumpRequestCount()
  try {
    const data = await octokit.graphql<{
      repository: {
        pinnedIssues: {
          nodes: Array<{ issue: { number: number } } | null>
        }
      } | null
    }>(
      `query PinnedIssues($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          pinnedIssues(first: 6) {
            nodes { issue { number } }
          }
        }
      }`,
      { owner, repo },
    )
    return (data.repository?.pinnedIssues.nodes ?? [])
      .filter((node): node is { issue: { number: number } } => node !== null)
      .map(node => node.issue.number)
  }
  catch {
    return []
  }
}
