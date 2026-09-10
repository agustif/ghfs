import type { SyncItemState } from '../types'
import type { ProviderTimelineEvent } from '../types/provider'

export interface GraphNode {
  id: string
  type: 'issue' | 'pull' | 'commit' | 'discussion' | 'person' | 'label' | 'milestone'
  metadata?: Record<string, unknown>
}

export interface GraphEdge {
  from: string
  to: string
  relation: 'references' | 'fixes' | 'fixed_by' | 'mentions' | 'assigns' | 'labels' | 'review_requested' | 'connected' | 'duplicate_of'
  metadata?: Record<string, unknown>
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  syncedAt: string
}

export function buildGraph(
  items: Record<string, SyncItemState>,
  syncedAt: string,
): GraphData {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  const seenEdges = new Set<string>()

  for (const item of Object.values(items)) {
    const nodeId = `ghfs:${item.kind}:${item.number}`
    nodes.set(nodeId, {
      id: nodeId,
      type: item.kind,
      metadata: {
        number: item.number,
        title: item.data.item.title,
        state: item.state,
      },
    })

    for (const label of item.data.item.labels ?? []) {
      const labelId = `ghfs:label:${label}`
      if (!nodes.has(labelId)) {
        nodes.set(labelId, { id: labelId, type: 'label', metadata: { name: label } })
      }
      addEdge(edges, seenEdges, nodeId, labelId, 'labels')
    }

    if (item.data.item.milestone) {
      const milestoneId = `ghfs:milestone:${item.data.item.milestone}`
      if (!nodes.has(milestoneId)) {
        nodes.set(milestoneId, { id: milestoneId, type: 'milestone', metadata: { title: item.data.item.milestone } })
      }
      addEdge(edges, seenEdges, nodeId, milestoneId, 'labels')
    }

    for (const assignee of item.data.item.assignees ?? []) {
      const personId = `ghfs:person:${assignee}`
      if (!nodes.has(personId)) {
        nodes.set(personId, { id: personId, type: 'person', metadata: { login: assignee } })
      }
      addEdge(edges, seenEdges, nodeId, personId, 'assigns')
    }

    if (item.kind === 'pull' && item.data.pullMetadata) {
      for (const reviewer of item.data.pullMetadata.requestedReviewers ?? []) {
        const personId = `ghfs:person:${reviewer}`
        if (!nodes.has(personId)) {
          nodes.set(personId, { id: personId, type: 'person', metadata: { login: reviewer } })
        }
        addEdge(edges, seenEdges, nodeId, personId, 'review_requested')
      }
    }

    const timeline = item.data.timeline ?? []
    for (const event of timeline) {
      extractGraphFromEvent(event, nodeId, nodes, edges, seenEdges)
    }

    extractGraphFromText(item.data.item.body ?? '', nodeId, nodes, edges, seenEdges)
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    syncedAt,
  }
}

function addEdge(
  edges: GraphEdge[],
  seen: Set<string>,
  from: string,
  to: string,
  relation: GraphEdge['relation'],
): void {
  const key = `${from}->${to}:${relation}`
  if (!seen.has(key)) {
    seen.add(key)
    edges.push({ from, to, relation })
  }
}

function extractGraphFromEvent(
  event: ProviderTimelineEvent,
  fromNodeId: string,
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  seen: Set<string>,
): void {
  if (event.kind === 'cross-referenced' || event.kind === 'referenced' || event.kind === 'connected') {
    if (event.source) {
      const toNodeId = `ghfs:${event.source.kind}:${event.source.number}`
      if (!nodes.has(toNodeId)) {
        nodes.set(toNodeId, {
          id: toNodeId,
          type: event.source.kind,
          metadata: { number: event.source.number },
        })
      }
      addEdge(edges, seen, fromNodeId, toNodeId, event.kind === 'connected' ? 'connected' : 'references')
    }
  }

  if (event.kind === 'closed' && event.sha) {
    const commitId = `ghfs:commit:${event.sha}`
    if (!nodes.has(commitId)) {
      nodes.set(commitId, { id: commitId, type: 'commit', metadata: { sha: event.sha } })
    }
    addEdge(edges, seen, fromNodeId, commitId, 'fixed_by')
  }

  if (event.kind === 'merged' && event.sha) {
    const commitId = `ghfs:commit:${event.sha}`
    if (!nodes.has(commitId)) {
      nodes.set(commitId, { id: commitId, type: 'commit', metadata: { sha: event.sha } })
    }
    addEdge(edges, seen, fromNodeId, commitId, 'fixed_by')
  }

  if (event.kind === 'marked_as_duplicate' || event.kind === 'unmarked_as_duplicate') {
    if (event.source) {
      const toNodeId = `ghfs:${event.source.kind}:${event.source.number}`
      if (!nodes.has(toNodeId)) {
        nodes.set(toNodeId, {
          id: toNodeId,
          type: event.source.kind,
          metadata: { number: event.source.number },
        })
      }
      if (event.kind === 'marked_as_duplicate')
        addEdge(edges, seen, fromNodeId, toNodeId, 'duplicate_of')
    }
  }
}

function extractGraphFromText(
  text: string,
  fromNodeId: string,
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  seen: Set<string>,
): void {
  const issuePattern = /#(\d+)/g
  const closesPattern = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi
  const mentionPattern = /@([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)/g

  let match: RegExpExecArray | null

  while ((match = closesPattern.exec(text)) !== null) {
    const toNumber = Number.parseInt(match[1], 10)
    const toNodeId = `ghfs:issue:${toNumber}`
    if (!nodes.has(toNodeId)) {
      nodes.set(toNodeId, { id: toNodeId, type: 'issue', metadata: { number: toNumber } })
    }
    addEdge(edges, seen, fromNodeId, toNodeId, 'fixes')
  }

  closesPattern.lastIndex = 0
  while ((match = issuePattern.exec(text)) !== null) {
    const toNumber = Number.parseInt(match[1], 10)
    const toNodeId = `ghfs:issue:${toNumber}`
    const alreadyFixed = edges.some(e => e.from === fromNodeId && e.to === toNodeId && e.relation === 'fixes')
    if (!alreadyFixed) {
      if (!nodes.has(toNodeId)) {
        nodes.set(toNodeId, { id: toNodeId, type: 'issue', metadata: { number: toNumber } })
      }
      addEdge(edges, seen, fromNodeId, toNodeId, 'references')
    }
  }

  mentionPattern.lastIndex = 0
  while ((match = mentionPattern.exec(text)) !== null) {
    const login = match[1]
    const personId = `ghfs:person:${login}`
    if (!nodes.has(personId)) {
      nodes.set(personId, { id: personId, type: 'person', metadata: { login } })
    }
    addEdge(edges, seen, fromNodeId, personId, 'mentions')
  }
}
