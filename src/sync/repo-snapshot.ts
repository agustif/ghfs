import { readFile } from 'node:fs/promises'
import { join } from 'pathe'
import { REPO_SNAPSHOT_FILE_NAME } from '../constants'

export interface RepoSnapshot {
  repo: string
  synced_at: string
  repository: {
    owner: string
    name: string
    full_name: string
    description: string | null
    private: boolean
    archived: boolean
    default_branch: string
    html_url: string
    fork: boolean
    open_issues_count: number
    has_issues: boolean
    has_projects: boolean
    has_wiki: boolean
    created_at: string
    updated_at: string
    pushed_at: string | null
    allow_merge_commit?: boolean
    allow_squash_merge?: boolean
    allow_rebase_merge?: boolean
    /** `null` when the GraphQL query failed (e.g. insufficient scope). */
    merge_queue_enabled?: boolean | null
  }
  labels: Array<{
    name: string
    color: string
    description: string | null
    default: boolean
  }>
  milestones: Array<{
    number: number
    title: string
    state: 'open' | 'closed'
    description: string | null
    due_on: string | null
    open_issues: number
    closed_issues: number
    created_at: string
    updated_at: string
    closed_at: string | null
  }>
  people?: {
    collaborators: Array<{
      login: string
      avatar_url: string
      role_name: string
      permissions: {
        admin: boolean
        maintain: boolean
        push: boolean
        triage: boolean
        pull: boolean
      }
    }> | null
    teams: Array<{
      slug: string
      name: string
      description: string | null
      permission: string
      privacy: string
    }> | null
    invitations: Array<{
      id: number
      login: string | null
      email: string | null
      role: string
      created_at: string
      inviter: {
        login: string
      }
    }> | null
    assignable_users: Array<{
      login: string
      avatar_url: string
    }> | null
    contributors: Array<{
      login: string | null
      avatar_url: string | null
      contributions: number
      type: string
    }> | null
  }
  rules?: {
    rulesets: Array<{
      id: number
      name: string
      target?: string
      source_type?: string
      source?: string
      enforcement: string
      conditions?: unknown
      rules?: unknown[]
      bypass_actors?: unknown[]
      node_id?: string
    }> | null
    branch_protection: {
      [branch: string]: unknown
    } | null
    codeowners_errors: Array<{
      line: number
      column: number
      source: string | null
      kind: string
      suggestion: string | null
      message: string
      path: string
    }> | null
  }
  stats?: {
    commit_activity: Array<{
      days: number[]
      total: number
      week: number
    }> | null
    code_frequency: Array<{
      week: number
      additions: number
      deletions: number
    }> | null
    participation: {
      all: number[]
      owner: number[]
    } | null
    punch_card: Array<{
      day: number
      hour: number
      commits: number
    }> | null
  }
}

export async function loadRepoSnapshot(storageDirAbsolute: string): Promise<RepoSnapshot | null> {
  try {
    const raw = await readFile(join(storageDirAbsolute, REPO_SNAPSHOT_FILE_NAME), 'utf8')
    return JSON.parse(raw) as RepoSnapshot
  }
  catch {
    return null
  }
}
