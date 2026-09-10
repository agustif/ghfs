import type { ProviderGitCommit, ProviderGitRef, ProviderGitTree } from '../types/provider'

export interface GitSnapshot {
  repo: string
  synced_at: string
  refs: GitRefSnapshot[]
  default_branch: string
  head_tree: GitTreeSnapshot | null
  recent_commits: GitCommitSnapshot[]
  pr_comparisons: GitPRComparison[]
}

export interface GitRefSnapshot {
  ref: string
  sha: string
  url: string
}

export interface GitCommitSnapshot {
  sha: string
  message: string
  author: {
    name: string
    email: string
    date: string
  }
  committer: {
    name: string
    email: string
    date: string
  }
  tree_sha: string
  parent_shas: string[]
  url: string
  html_url?: string
}

export interface GitTreeSnapshot {
  sha: string
  url: string
  paths: GitTreePathSnapshot[]
  truncated: boolean
}

export interface GitTreePathSnapshot {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
  url: string
}

export interface GitPRComparison {
  pr_number: number
  pr_head_ref: string
  pr_head_sha: string
  base_ref: string
  base_sha: string
  ahead_by: number
  behind_by: number
  commits: GitCommitSnapshot[]
}

export function mapGitRef(ref: ProviderGitRef): GitRefSnapshot {
  return {
    ref: ref.ref,
    sha: ref.sha,
    url: ref.url,
  }
}

export function mapGitCommit(commit: ProviderGitCommit): GitCommitSnapshot {
  return {
    sha: commit.sha,
    message: commit.message,
    author: commit.author,
    committer: commit.committer,
    tree_sha: commit.tree.sha,
    parent_shas: commit.parents.map(p => p.sha),
    url: commit.url,
    ...(commit.html_url ? { html_url: commit.html_url } : {}),
  }
}

export function mapGitTree(tree: ProviderGitTree): GitTreeSnapshot {
  return {
    sha: tree.sha,
    url: tree.url,
    paths: tree.tree.map(item => ({
      path: item.path,
      mode: item.mode,
      type: item.type,
      sha: item.sha,
      ...(item.size !== undefined ? { size: item.size } : {}),
      url: item.url,
    })),
    truncated: tree.truncated,
  }
}
