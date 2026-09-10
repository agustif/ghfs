import type { SyncContext } from './sync-repository-types'

export interface GraphNode {
  id: string
  type: 'person' | 'team' | 'label' | 'milestone' | 'release'
  name: string
  metadata?: Record<string, any>
}

export interface GraphEdge {
  from: string
  to: string
  type: string
}

export interface MetaGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export async function buildMetaGraph(context: SyncContext): Promise<MetaGraph> {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  const [labels, milestones, releases] = await Promise.all([
    context.provider.fetchRepositoryLabels(),
    context.provider.fetchRepositoryMilestones(),
    context.provider.fetchReleases?.(30) ?? Promise.resolve([]),
  ])

  for (const label of labels) {
    nodes.push({
      id: `label:${label.name}`,
      type: 'label',
      name: label.name,
      metadata: {
        color: label.color,
        description: label.description,
        default: label.default,
      },
    })
  }

  for (const milestone of milestones) {
    nodes.push({
      id: `milestone:${milestone.number}`,
      type: 'milestone',
      name: milestone.title,
      metadata: {
        state: milestone.state,
        due_on: milestone.due_on,
        open_issues: milestone.open_issues,
        closed_issues: milestone.closed_issues,
      },
    })
  }

  for (const release of releases) {
    nodes.push({
      id: `release:${release.tag_name}`,
      type: 'release',
      name: release.name ?? release.tag_name,
      metadata: {
        tag_name: release.tag_name,
        draft: release.draft,
        prerelease: release.prerelease,
        published_at: release.published_at,
        author: release.author,
      },
    })
  }

  const peopleSet = new Set<string>()
  for (const item of Object.values(context.syncState.items)) {
    if (item.data.item.author)
      peopleSet.add(item.data.item.author)
    for (const assignee of item.data.item.assignees)
      peopleSet.add(assignee)
  }

  for (const person of peopleSet) {
    nodes.push({
      id: `person:${person}`,
      type: 'person',
      name: person,
    })
  }

  return { nodes, edges }
}
