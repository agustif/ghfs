import type { SyncContext } from './sync-repository-types'
import { writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncMetadata(context: SyncContext): Promise<{
  written: number
}> {
  if (!context.config.sync.metadata)
    return { written: 0 }

  let written = 0

  try {
    const repo = await context.provider.fetchRepository()
    const labels = await context.provider.fetchRepositoryLabels()
    const milestones = await context.provider.fetchRepositoryMilestones()

    const metadata: any = {
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      archived: repo.archived,
      defaultBranch: repo.default_branch,
      htmlUrl: repo.html_url,
      fork: repo.fork,
      hasIssues: repo.has_issues,
      hasProjects: repo.has_projects,
      hasWiki: repo.has_wiki,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      owner: repo.owner.login,
      stargazersCount: (repo as any).stargazers_count,
      watchersCount: (repo as any).watchers_count,
      forksCount: (repo as any).forks_count,
      openIssuesCount: repo.open_issues_count,
      language: (repo as any).language,
      topics: (repo as any).topics ?? [],
      visibility: (repo as any).visibility,
      allowMergeCommit: repo.allow_merge_commit,
      allowSquashMerge: repo.allow_squash_merge,
      allowRebaseMerge: repo.allow_rebase_merge,
      mergeQueueEnabled: repo.merge_queue_enabled,
      labels: labels.map(l => ({
        name: l.name,
        color: l.color,
        description: l.description,
        default: l.default,
      })),
      milestones: milestones.map(m => ({
        number: m.number,
        title: m.title,
        state: m.state,
        description: m.description,
        dueOn: m.due_on,
        openIssues: m.open_issues,
        closedIssues: m.closed_issues,
      })),
    }

    const codeowners = await context.provider.fetchCodeOwners()
    if (codeowners) {
      metadata.codeowners = {
        path: codeowners.path,
        linesCount: codeowners.content.split('\n').length,
      }

      const codeownersPath = join(context.storageDirAbsolute, 'CODEOWNERS')
      await writeFile(codeownersPath, codeowners.content, 'utf8')
      written++
    }

    const securityAdvisories = await context.provider.fetchSecurityAdvisories()
    if (securityAdvisories.length > 0) {
      metadata.securityAdvisories = securityAdvisories.map(adv => ({
        id: adv.id,
        severity: adv.severity,
        summary: adv.summary,
        publishedAt: adv.publishedAt,
        vulnerabilities: adv.vulnerabilities,
      }))
    }

    const metadataPath = join(context.storageDirAbsolute, 'metadata.json')
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8')
    written++

    return { written }
  }
  catch {
    return { written: 0 }
  }
}
