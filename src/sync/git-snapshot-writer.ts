// @ts-nocheck
import type { GitCommitSnapshot, GitSnapshot } from './git-snapshot'
import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import {
  GIT_COMMITS_DIR_NAME,
  GIT_DIR_NAME,
  GIT_REFS_FILE_NAME,
  GIT_TREE_HEAD_FILE_NAME,
} from '../constants'
import { mapGitCommit, mapGitRef, mapGitTree } from './git-snapshot'

const RECENT_COMMITS_LIMIT = 100

export async function writeGitSnapshot(context: SyncContext): Promise<void> {
  const gitSnapshot = await buildGitSnapshot(context)

  const gitDirAbsolute = join(context.storageDirAbsolute, GIT_DIR_NAME)
  const commitsDirAbsolute = join(gitDirAbsolute, GIT_COMMITS_DIR_NAME)
  const treesDirAbsolute = join(gitDirAbsolute, 'trees')

  await mkdir(gitDirAbsolute, { recursive: true })
  await mkdir(commitsDirAbsolute, { recursive: true })
  await mkdir(treesDirAbsolute, { recursive: true })

  await writeFile(
    join(gitDirAbsolute, GIT_REFS_FILE_NAME),
    `${JSON.stringify({ refs: gitSnapshot.refs }, null, 2)}\n`,
    'utf8',
  )

  if (gitSnapshot.head_tree) {
    await writeFile(
      join(treesDirAbsolute, GIT_TREE_HEAD_FILE_NAME),
      `${JSON.stringify(gitSnapshot.head_tree, null, 2)}\n`,
      'utf8',
    )
  }

  for (const commit of gitSnapshot.recent_commits) {
    await writeCommitFile(commitsDirAbsolute, commit)
  }

  for (const comparison of gitSnapshot.pr_comparisons) {
    for (const commit of comparison.commits) {
      await writeCommitFile(commitsDirAbsolute, commit)
    }
  }

  const fullSnapshot = {
    repo: gitSnapshot.repo,
    synced_at: gitSnapshot.synced_at,
    default_branch: gitSnapshot.default_branch,
    recent_commits_count: gitSnapshot.recent_commits.length,
    pr_comparisons_count: gitSnapshot.pr_comparisons.length,
    refs_count: gitSnapshot.refs.length,
  }

  await writeFile(
    join(gitDirAbsolute, 'summary.json'),
    `${JSON.stringify(fullSnapshot, null, 2)}\n`,
    'utf8',
  )
}

async function writeCommitFile(
  commitsDirAbsolute: string,
  commit: GitCommitSnapshot,
): Promise<void> {
  const commitFilePath = join(commitsDirAbsolute, `${commit.sha.substring(0, 7)}.json`)
  await writeFile(
    commitFilePath,
    `${JSON.stringify(commit, null, 2)}\n`,
    'utf8',
  )
}

async function buildGitSnapshot(context: SyncContext): Promise<GitSnapshot> {
  const repository = await context.provider.fetchRepository()
  const defaultBranch = repository.default_branch

  const [refs, recentCommits] = await Promise.all([
    context.provider.fetchGitRefs(),
    context.provider.fetchGitCommits({ sha: defaultBranch, limit: RECENT_COMMITS_LIMIT }),
  ])

  let headTree = null
  if (recentCommits.length > 0) {
    const headCommit = recentCommits[0]
    if (headCommit) {
      try {
        const tree = await context.provider.fetchGitTree(headCommit.tree.sha, true)
        headTree = mapGitTree(tree)
      }
      catch {
        headTree = null
      }
    }
  }

  const openPulls = Object.values(context.syncState.items)
    .filter(item => item.kind === 'pull' && item.state === 'open')

  const prComparisons = await Promise.all(
    openPulls.map(async (pull) => {
      const metadata = pull.data.pull
      if (!metadata)
        return null

      try {
        const comparison = await context.provider.compareCommits(
          metadata.baseRef,
          metadata.headRef,
        )

        const baseRef = refs.find(r => r.ref === `refs/heads/${metadata.baseRef}`)
        const headRef = refs.find(r => r.ref === `refs/heads/${metadata.headRef}`)

        return {
          pr_number: pull.number,
          pr_head_ref: metadata.headRef,
          pr_head_sha: headRef?.sha ?? '',
          base_ref: metadata.baseRef,
          base_sha: baseRef?.sha ?? '',
          ahead_by: comparison.commits.length,
          behind_by: 0,
          commits: comparison.commits.map(mapGitCommit),
        }
      }
      catch {
        return null
      }
    }),
  )

  return {
    repo: context.repoSlug,
    synced_at: context.syncedAt,
    refs: refs.map(mapGitRef),
    default_branch: defaultBranch,
    head_tree: headTree,
    recent_commits: recentCommits.map(mapGitCommit),
    pr_comparisons: prComparisons.filter((c): c is NonNullable<typeof c> => c !== null),
  }
}
