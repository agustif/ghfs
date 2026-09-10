import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function writeKitchenSinkData(context: SyncContext): Promise<void> {
  const kitchenSinkDir = join(context.storageDirAbsolute, 'kitchen-sink')
  await mkdir(kitchenSinkDir, { recursive: true })

  const writeIfEnabled = async (
    enabled: boolean,
    filename: string,
    fetchFn: () => Promise<any>,
  ) => {
    if (!enabled)
      return
    try {
      const data = await fetchFn()
      if (data !== null) {
        await writeFile(
          join(kitchenSinkDir, filename),
          `${JSON.stringify(data, null, 2)}\n`,
          'utf8',
        )
      }
    }
    catch {

    }
  }

  await Promise.all([
    writeIfEnabled(
      context.config.sync.customProperties ?? false,
      'custom-properties.json',
      () => context.provider.fetchCustomProperties?.() ?? Promise.resolve(null),
    ),
    writeIfEnabled(
      context.config.sync.autolinks ?? false,
      'autolinks.json',
      () => context.provider.fetchAutolinks?.() ?? Promise.resolve(null),
    ),
    writeIfEnabled(
      context.config.sync.commitActivity ?? false,
      'commit-activity.json',
      () => context.provider.fetchCommitActivity?.() ?? Promise.resolve(null),
    ),
    writeIfEnabled(
      context.config.sync.participationStats ?? false,
      'participation-stats.json',
      () => context.provider.fetchParticipationStats?.() ?? Promise.resolve(null),
    ),
    writeIfEnabled(
      context.config.sync.tags ?? false,
      'tags.json',
      () => context.provider.fetchRepositoryTags?.() ?? Promise.resolve(null),
    ),
    writeIfEnabled(
      context.config.sync.gitRefs ?? false,
      'git-refs.json',
      () => context.provider.fetchGitRefs?.() ?? Promise.resolve(null),
    ),
    writeIfEnabled(
      context.config.sync.assigneeSuggestions ?? false,
      'assignee-suggestions.json',
      () => context.provider.fetchAssigneeSuggestions?.() ?? Promise.resolve(null),
    ),
    writeIfEnabled(
      context.config.sync.vulnerabilityReporting ?? false,
      'vulnerability-reporting.json',
      () => context.provider.fetchVulnerabilityReporting?.() ?? Promise.resolve(null),
    ),
  ])

  if (context.config.sync.traffic) {
    await Promise.all([
      writeIfEnabled(
        true,
        'traffic-referrers.json',
        () => context.provider.fetchTrafficReferrers?.() ?? Promise.resolve(null),
      ),
      writeIfEnabled(
        true,
        'traffic-paths.json',
        () => context.provider.fetchTrafficPaths?.() ?? Promise.resolve(null),
      ),
      writeIfEnabled(
        true,
        'traffic-views.json',
        () => context.provider.fetchTrafficViews?.() ?? Promise.resolve(null),
      ),
      writeIfEnabled(
        true,
        'traffic-clones.json',
        () => context.provider.fetchTrafficClones?.() ?? Promise.resolve(null),
      ),
    ])
  }

  if (context.config.sync.docsTree) {
    try {
      const repo = await context.provider.fetchRepository()
      const defaultBranch = repo.default_branch
      const refs = await context.provider.fetchGitRefs?.(`heads/${defaultBranch}`)
      if (refs && refs.length > 0) {
        const sha = refs[0]?.object?.sha
        if (sha) {
          const tree = await context.provider.fetchGitTree?.(sha, true)
          if (tree && tree.tree) {
            const docsPaths = tree.tree.filter((entry: any) =>
              entry.path?.startsWith('docs/'),
            )
            if (docsPaths.length > 0) {
              await writeFile(
                join(kitchenSinkDir, 'docs-tree.json'),
                `${JSON.stringify(docsPaths.slice(0, 500), null, 2)}\n`,
                'utf8',
              )
            }
          }
        }
      }
    }
    catch {
    }
  }
}
