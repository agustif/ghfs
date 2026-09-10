import type { SyncItemState } from '../types'
import type { ProviderRepository } from '../types/provider'
import type { RepoSnapshot } from './repo-snapshot'
import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import {
  ASSIGNABLE_USERS_FILE_NAME,
  CODE_FREQUENCY_FILE_NAME,
  CODEOWNERS_ERRORS_FILE_NAME,
  COLLABORATORS_FILE_NAME,
  COMMIT_ACTIVITY_FILE_NAME,
  CONTRIBUTORS_FILE_NAME,
  INVITATIONS_FILE_NAME,
  ISSUES_INDEX_FILE_NAME,
  PARTICIPATION_FILE_NAME,
  PEOPLE_DIR_NAME,
  PULLS_INDEX_FILE_NAME,
  PUNCH_CARD_FILE_NAME,
  REPO_SNAPSHOT_FILE_NAME,
  TEAMS_FILE_NAME,
} from '../constants'
import { getTimestamp, renderRowsTable } from '../utils/markdown'

interface IndexRow {
  number: number
  state: 'open' | 'closed'
  title: string
  labels: string[]
  updatedAt: string
  filePath: string
}

export async function writeRepositorySnapshot(context: SyncContext): Promise<void> {
  await writeRepoSnapshot(context)
  await writeRepositoryIndexes(context)
  await writePeopleFiles(context)
}

export async function writeRepoSnapshot(context: SyncContext): Promise<void> {
  const repoSnapshot = await buildRepoSnapshot(context)
  await mkdir(context.storageDirAbsolute, { recursive: true })
  await writeFile(
    join(context.storageDirAbsolute, REPO_SNAPSHOT_FILE_NAME),
    `${JSON.stringify(repoSnapshot, null, 2)}\n`,
    'utf8',
  )
}

export async function writePeopleFiles(context: SyncContext): Promise<void> {
  const repoSnapshot = await buildRepoSnapshot(context)
  const peopleDirAbsolute = join(context.storageDirAbsolute, PEOPLE_DIR_NAME)

  const writeIfPresent = async (fileName: string, data: unknown) => {
    if (data !== null && data !== undefined) {
      await mkdir(peopleDirAbsolute, { recursive: true })
      await writeFile(
        join(peopleDirAbsolute, fileName),
        `${JSON.stringify(data, null, 2)}\n`,
        'utf8',
      )
    }
  }

  await Promise.all([
    writeIfPresent(COLLABORATORS_FILE_NAME, repoSnapshot.people?.collaborators),
    writeIfPresent(TEAMS_FILE_NAME, repoSnapshot.people?.teams),
    writeIfPresent(INVITATIONS_FILE_NAME, repoSnapshot.people?.invitations),
    writeIfPresent(ASSIGNABLE_USERS_FILE_NAME, repoSnapshot.people?.assignable_users),
    writeIfPresent(CONTRIBUTORS_FILE_NAME, repoSnapshot.people?.contributors),
    writeIfPresent(CODEOWNERS_ERRORS_FILE_NAME, repoSnapshot.rules?.codeowners_errors),
    writeIfPresent(COMMIT_ACTIVITY_FILE_NAME, repoSnapshot.stats?.commit_activity),
    writeIfPresent(CODE_FREQUENCY_FILE_NAME, repoSnapshot.stats?.code_frequency),
    writeIfPresent(PARTICIPATION_FILE_NAME, repoSnapshot.stats?.participation),
    writeIfPresent(PUNCH_CARD_FILE_NAME, repoSnapshot.stats?.punch_card),
  ])
}

export async function writeRepositoryIndexes(context: SyncContext): Promise<void> {
  const [issuesMarkdown, pullsMarkdown] = await Promise.all([
    renderIndexMarkdown(context, 'issue'),
    renderIndexMarkdown(context, 'pull'),
  ])

  await mkdir(context.storageDirAbsolute, { recursive: true })

  await Promise.all([
    writeFile(
      join(context.storageDirAbsolute, ISSUES_INDEX_FILE_NAME),
      issuesMarkdown,
      'utf8',
    ),
    writeFile(
      join(context.storageDirAbsolute, PULLS_INDEX_FILE_NAME),
      pullsMarkdown,
      'utf8',
    ),
  ])
}

async function renderIndexMarkdown(context: SyncContext, kind: 'issue' | 'pull'): Promise<string> {
  const rows = Object.values(context.syncState.items)
    .filter(item => item.kind === kind)
    .map(item => readIndexRow(item))
  const openRows = sortRows(rows.filter(row => row.state === 'open'))
  const closedRows = sortRows(rows.filter(row => row.state === 'closed'))

  const title = kind === 'issue' ? 'Issues' : 'Pull Requests'

  return [
    `# ${title}`,
    '',
    `- repo: ${context.repoSlug}`,
    `- synced_at: ${context.syncedAt}`,
    `- total: ${rows.length}`,
    `- open: ${openRows.length}`,
    `- closed: ${closedRows.length}`,
    '',
    `## Open (${openRows.length})`,
    '',
    ...renderRowsTable(openRows),
    '',
    `## Closed (${closedRows.length})`,
    '',
    ...renderRowsTable(closedRows),
    '',
  ].join('\n')
}

function readIndexRow(item: SyncItemState): IndexRow {
  return {
    number: item.number,
    state: item.state,
    title: item.data.item.title,
    labels: item.data.item.labels,
    updatedAt: item.data.item.updatedAt,
    filePath: item.filePath,
  }
}

function sortRows(rows: IndexRow[]): IndexRow[] {
  return [...rows].sort((left, right) => {
    const updatedDiff = getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt)
    if (updatedDiff !== 0)
      return updatedDiff
    return right.number - left.number
  })
}

async function buildRepoSnapshot(context: SyncContext): Promise<RepoSnapshot> {
  const [
    repoResult,
    labelsResult,
    milestonesResult,
    collaboratorsResult,
    teamsResult,
    invitationsResult,
    assignableUsersResult,
    contributorsResult,
    rulesetsResult,
    branchProtectionResult,
    codeownersErrorsResult,
    commitActivityResult,
    codeFrequencyResult,
    participationResult,
    punchCardResult,
  ] = await Promise.all([
    context.provider.fetchRepository(),
    context.provider.fetchRepositoryLabels(),
    context.provider.fetchRepositoryMilestones(),
    context.provider.fetchCollaborators(),
    context.provider.fetchTeams(),
    context.provider.fetchInvitations(),
    context.provider.fetchAssignableUsers(),
    context.provider.fetchContributors(),
    context.provider.fetchRulesets(),
    (async () => {
      const repo = await context.provider.fetchRepository()
      return context.provider.fetchBranchProtection(repo.default_branch)
    })(),
    context.provider.fetchCodeownersErrors(),
    context.provider.fetchCommitActivity(),
    context.provider.fetchCodeFrequency(),
    context.provider.fetchParticipation(),
    context.provider.fetchPunchCard(),
  ])

  const repository = repoResult as ProviderRepository
  const labels = labelsResult
    .map(label => ({
      name: label.name,
      color: label.color,
      description: label.description ?? null,
      default: Boolean(label.default),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
  const milestones = milestonesResult
    .map(milestone => ({
      number: milestone.number,
      title: milestone.title,
      state: milestone.state,
      description: milestone.description ?? null,
      due_on: milestone.due_on,
      open_issues: milestone.open_issues,
      closed_issues: milestone.closed_issues,
      created_at: milestone.created_at,
      updated_at: milestone.updated_at,
      closed_at: milestone.closed_at,
    }))
    .sort((left, right) => left.number - right.number)

  const snapshot: RepoSnapshot = {
    repo: context.repoSlug,
    synced_at: context.syncedAt,
    repository: {
      owner: repository.owner.login,
      name: repository.name,
      full_name: repository.full_name,
      description: repository.description ?? null,
      private: repository.private,
      archived: repository.archived,
      default_branch: repository.default_branch,
      html_url: repository.html_url,
      fork: repository.fork,
      open_issues_count: repository.open_issues_count,
      has_issues: repository.has_issues,
      has_projects: repository.has_projects,
      has_wiki: repository.has_wiki,
      created_at: repository.created_at,
      updated_at: repository.updated_at,
      pushed_at: repository.pushed_at,
      ...(repository.allow_merge_commit !== undefined ? { allow_merge_commit: repository.allow_merge_commit } : {}),
      ...(repository.allow_squash_merge !== undefined ? { allow_squash_merge: repository.allow_squash_merge } : {}),
      ...(repository.allow_rebase_merge !== undefined ? { allow_rebase_merge: repository.allow_rebase_merge } : {}),
      ...(repository.merge_queue_enabled !== undefined ? { merge_queue_enabled: repository.merge_queue_enabled } : {}),
    },
    labels,
    milestones,
  }

  if (collaboratorsResult !== null || teamsResult !== null || invitationsResult !== null || assignableUsersResult !== null || contributorsResult !== null) {
    snapshot.people = {
      collaborators: collaboratorsResult,
      teams: teamsResult,
      invitations: invitationsResult,
      assignable_users: assignableUsersResult,
      contributors: contributorsResult,
    }
  }

  if (rulesetsResult !== null || branchProtectionResult !== null || codeownersErrorsResult !== null) {
    snapshot.rules = {
      rulesets: rulesetsResult,
      branch_protection: branchProtectionResult ? { [repository.default_branch]: branchProtectionResult } : null,
      codeowners_errors: codeownersErrorsResult,
    }
  }

  if (commitActivityResult !== null || codeFrequencyResult !== null || participationResult !== null || punchCardResult !== null) {
    snapshot.stats = {
      commit_activity: commitActivityResult,
      code_frequency: codeFrequencyResult,
      participation: participationResult,
      punch_card: punchCardResult,
    }
  }

  return snapshot
}
