import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

interface ReactionSummary {
  totalItems: number
  totalReactions: number
  byType: {
    plusOne: number
    minusOne: number
    laugh: number
    hooray: number
    confused: number
    heart: number
    rocket: number
    eyes: number
  }
  topReactedItems: Array<{
    number: number
    kind: 'issue' | 'pull'
    title: string
    totalReactions: number
    reactions: {
      plusOne: number
      minusOne: number
      laugh: number
      hooray: number
      confused: number
      heart: number
      rocket: number
      eyes: number
    }
  }>
}

export async function writeKitchenSinkData(context: SyncContext): Promise<void> {
  const kitchenSinkDir = join(context.storageDirAbsolute, 'kitchen-sink')
  await mkdir(kitchenSinkDir, { recursive: true })

  const enabledFeatures: string[] = []

  const writeIfEnabled = async (
    enabled: boolean,
    filename: string,
    fetchFn: () => Promise<any>,
    description?: string,
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
        if (description)
          enabledFeatures.push(`- \`${filename}\` - ${description}`)
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
      'Custom repository property values (Enterprise/Org feature)',
    ),
    writeIfEnabled(
      context.config.sync.autolinks ?? false,
      'autolinks.json',
      () => context.provider.fetchAutolinks?.() ?? Promise.resolve(null),
      'Autolink reference patterns (e.g., JIRA-123 → URL)',
    ),
    writeIfEnabled(
      context.config.sync.commitActivity ?? false,
      'commit-activity.json',
      () => context.provider.fetchCommitActivity?.() ?? Promise.resolve(null),
      'Weekly commit activity for the past year',
    ),
    writeIfEnabled(
      context.config.sync.participationStats ?? false,
      'participation-stats.json',
      () => context.provider.fetchParticipationStats?.() ?? Promise.resolve(null),
      'Commit participation: owner vs. all contributors',
    ),
    writeIfEnabled(
      context.config.sync.tags ?? false,
      'tags.json',
      () => context.provider.fetchRepositoryTags?.() ?? Promise.resolve(null),
      'Git tags list (lightweight, separate from releases)',
    ),
    writeIfEnabled(
      context.config.sync.gitRefs ?? false,
      'git-refs.json',
      () => context.provider.fetchGitRefs?.() ?? Promise.resolve(null),
      'All Git refs (branches, tags, etc.)',
    ),
    writeIfEnabled(
      context.config.sync.assigneeSuggestions ?? false,
      'assignee-suggestions.json',
      () => context.provider.fetchAssigneeSuggestions?.() ?? Promise.resolve(null),
      'Users who can be assigned to issues',
    ),
    writeIfEnabled(
      context.config.sync.vulnerabilityReporting ?? false,
      'vulnerability-reporting.json',
      () => context.provider.fetchVulnerabilityReporting?.() ?? Promise.resolve(null),
      'Private vulnerability reporting status',
    ),
  ])

  if (context.config.sync.traffic) {
    await Promise.all([
      writeIfEnabled(
        true,
        'traffic-referrers.json',
        () => context.provider.fetchTrafficReferrers?.() ?? Promise.resolve(null),
        'Top referrers (last 14 days)',
      ),
      writeIfEnabled(
        true,
        'traffic-paths.json',
        () => context.provider.fetchTrafficPaths?.() ?? Promise.resolve(null),
        'Top paths (last 14 days)',
      ),
      writeIfEnabled(
        true,
        'traffic-views.json',
        () => context.provider.fetchTrafficViews?.() ?? Promise.resolve(null),
        'Page views (last 14 days)',
      ),
      writeIfEnabled(
        true,
        'traffic-clones.json',
        () => context.provider.fetchTrafficClones?.() ?? Promise.resolve(null),
        'Git clones (last 14 days)',
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
              enabledFeatures.push('- `docs-tree.json` - Recursive tree of docs/ directory (capped at 500 entries)')
            }
          }
        }
      }
    }
    catch {
    }
  }

  if (context.config.sync.customProperties || context.config.sync.autolinks
    || context.config.sync.commitActivity || context.config.sync.participationStats
    || context.config.sync.tags || context.config.sync.gitRefs
    || context.config.sync.assigneeSuggestions || context.config.sync.vulnerabilityReporting
    || context.config.sync.traffic || context.config.sync.docsTree) {
    const reactionSummary = buildReactionSummary(context)
    if (reactionSummary.totalItems > 0) {
      await writeFile(
        join(kitchenSinkDir, 'reaction-summary.json'),
        `${JSON.stringify(reactionSummary, null, 2)}\n`,
        'utf8',
      )
      enabledFeatures.push('- `reaction-summary.json` - Aggregated reaction statistics across all items')
    }
  }

  if (enabledFeatures.length > 0) {
    const readme = [
      '# Kitchen Sink Data',
      '',
      'This directory contains obscure GitHub REST API data that is optionally synced.',
      '',
      '## Enabled Features',
      '',
      ...enabledFeatures,
      '',
      '## Configuration',
      '',
      'Enable these features in `ghfs.config.ts`:',
      '',
      '```typescript',
      'export default {',
      '  sync: {',
      '    customProperties: false,      // Custom repo properties',
      '    autolinks: false,             // Autolink references',
      '    commitActivity: false,        // Weekly commit stats',
      '    participationStats: false,    // Owner vs. all participation',
      '    tags: false,                  // Git tags list',
      '    gitRefs: false,               // Git refs (branches/tags/etc.)',
      '    docsTree: false,              // Recursive docs/ tree (capped)',
      '    assigneeSuggestions: false,   // Assignable users',
      '    traffic: false,               // Traffic analytics (all 4)',
      '    vulnerabilityReporting: false // Private vuln reporting status',
      '  }',
      '}',
      '```',
      '',
      '## Notes',
      '',
      '- All endpoints gracefully degrade on 404/403 errors',
      '- Stats endpoints (commit activity, participation) may return 202 (computing)',
      '- Traffic endpoints require push access to the repository',
      '- Docs tree is capped at 500 entries to avoid overwhelming output',
      '',
      `Last synced: ${context.syncedAt}`,
      '',
    ].join('\n')

    await writeFile(
      join(kitchenSinkDir, 'README.md'),
      readme,
      'utf8',
    )
  }
}

function buildReactionSummary(context: SyncContext): ReactionSummary {
  const items = Object.values(context.syncState.items)
  const summary: ReactionSummary = {
    totalItems: items.length,
    totalReactions: 0,
    byType: {
      plusOne: 0,
      minusOne: 0,
      laugh: 0,
      hooray: 0,
      confused: 0,
      heart: 0,
      rocket: 0,
      eyes: 0,
    },
    topReactedItems: [],
  }

  const itemsWithReactions = items
    .filter(item => item.data.item.reactions)
    .map((item) => {
      const reactions = item.data.item.reactions!
      return {
        number: item.number,
        kind: item.kind,
        title: item.data.item.title,
        totalReactions: reactions.totalCount,
        reactions: {
          plusOne: reactions.plusOne,
          minusOne: reactions.minusOne,
          laugh: reactions.laugh,
          hooray: reactions.hooray,
          confused: reactions.confused,
          heart: reactions.heart,
          rocket: reactions.rocket,
          eyes: reactions.eyes,
        },
      }
    })
    .filter(item => item.totalReactions > 0)

  for (const item of itemsWithReactions) {
    summary.totalReactions += item.totalReactions
    summary.byType.plusOne += item.reactions.plusOne
    summary.byType.minusOne += item.reactions.minusOne
    summary.byType.laugh += item.reactions.laugh
    summary.byType.hooray += item.reactions.hooray
    summary.byType.confused += item.reactions.confused
    summary.byType.heart += item.reactions.heart
    summary.byType.rocket += item.reactions.rocket
    summary.byType.eyes += item.reactions.eyes
  }

  summary.topReactedItems = itemsWithReactions
    .sort((a, b) => b.totalReactions - a.totalReactions)
    .slice(0, 20)

  return summary
}
