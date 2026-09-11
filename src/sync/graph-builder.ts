// @ts-nocheck
import type { SyncState } from '../types/sync-state'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'pathe'

export interface GraphNode {
  type: 'node'
  id: string
  nodeType: 'issue' | 'pull' | 'person' | 'label' | 'milestone' | 'commit'
  properties: Record<string, unknown>
}

export interface GraphEdge {
  type: 'edge'
  from: string
  to: string
  edgeType: 'references' | 'fixes' | 'fixed_by' | 'mentions' | 'assigns' | 'labels' | 'review_requested' | 'connected' | 'duplicate_of'
}

type GraphEntry = GraphNode | GraphEdge

const ISSUE_REF_REGEX = /#(\d+)/g
const FIXES_REGEX = /(?:fix(?:es|ed)?|close(?:s|d)?|resolve(?:s|d)?)\s+#(\d+)/gi

export async function buildGraph(storageDirAbsolute: string): Promise<void> {
  const syncStatePath = resolve(storageDirAbsolute, 'sync-state.json')
  const syncState: SyncState = JSON.parse(readFileSync(syncStatePath, 'utf-8'))

  const entries: GraphEntry[] = []
  const seenNodes = new Set<string>()
  const seenPeople = new Set<string>()
  const seenLabels = new Set<string>()
  const seenMilestones = new Set<string>()

  function addNode(node: GraphNode) {
    if (!seenNodes.has(node.id)) {
      entries.push(node)
      seenNodes.add(node.id)
    }
  }

  function addEdge(from: string, to: string, edgeType: GraphEdge['edgeType']) {
    entries.push({ type: 'edge', from, to, edgeType })
  }

  for (const [numberStr, itemState] of Object.entries(syncState.items)) {
    const number = Number.parseInt(numberStr, 10)
    const { item, comments, pull, timeline } = itemState.data
    const nodeId = `ghfs:${itemState.kind}:${number}`

    addNode({
      type: 'node',
      id: nodeId,
      nodeType: itemState.kind,
      properties: {
        number,
        title: item.title,
        state: item.state,
        author: item.user.login,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        labels: item.labels.map((l: any) => typeof l === 'string' ? l : l.name),
        milestone: item.milestone?.title,
      },
    })

    const authorId = `ghfs:person:${item.user.login}`
    if (!seenPeople.has(authorId)) {
      addNode({
        type: 'node',
        id: authorId,
        nodeType: 'person',
        properties: {
          login: item.user.login,
          avatarUrl: item.user.avatar_url,
        },
      })
      seenPeople.add(authorId)
    }

    for (const label of item.labels) {
      const labelName = typeof label === 'string' ? label : label.name
      const labelId = `ghfs:label:${labelName}`
      if (!seenLabels.has(labelId)) {
        addNode({
          type: 'node',
          id: labelId,
          nodeType: 'label',
          properties: {
            name: labelName,
            color: typeof label === 'object' ? label.color : undefined,
          },
        })
        seenLabels.add(labelId)
      }
      addEdge(nodeId, labelId, 'labels')
    }

    if (item.milestone) {
      const milestoneId = `ghfs:milestone:${item.milestone.title}`
      if (!seenMilestones.has(milestoneId)) {
        addNode({
          type: 'node',
          id: milestoneId,
          nodeType: 'milestone',
          properties: {
            title: item.milestone.title,
            state: item.milestone.state,
            dueOn: item.milestone.due_on,
          },
        })
        seenMilestones.add(milestoneId)
      }
    }

    if (item.assignees) {
      for (const assignee of item.assignees) {
        const assigneeId = `ghfs:person:${assignee.login}`
        if (!seenPeople.has(assigneeId)) {
          addNode({
            type: 'node',
            id: assigneeId,
            nodeType: 'person',
            properties: {
              login: assignee.login,
              avatarUrl: assignee.avatar_url,
            },
          })
          seenPeople.add(assigneeId)
        }
        addEdge(nodeId, assigneeId, 'assigns')
      }
    }

    const bodyText = item.body || ''
    const fixesMatches = Array.from(bodyText.matchAll(FIXES_REGEX))
    for (const match of fixesMatches) {
      const refNumber = Number.parseInt(match[1], 10)
      const refId = `ghfs:issue:${refNumber}`
      addEdge(nodeId, refId, 'fixes')
      addEdge(refId, nodeId, 'fixed_by')
    }

    const refMatches = Array.from(bodyText.matchAll(ISSUE_REF_REGEX))
    for (const match of refMatches) {
      const refNumber = Number.parseInt(match[1], 10)
      if (refNumber === number)
        continue
      const refId = `ghfs:issue:${refNumber}`
      addEdge(nodeId, refId, 'references')
    }

    for (const comment of comments || []) {
      const commenterId = `ghfs:person:${comment.user.login}`
      if (!seenPeople.has(commenterId)) {
        addNode({
          type: 'node',
          id: commenterId,
          nodeType: 'person',
          properties: {
            login: comment.user.login,
            avatarUrl: comment.user.avatar_url,
          },
        })
        seenPeople.add(commenterId)
      }

      const commentBody = comment.body || ''
      const commentRefMatches = Array.from(commentBody.matchAll(ISSUE_REF_REGEX))
      for (const match of commentRefMatches) {
        const refNumber = Number.parseInt(match[1], 10)
        if (refNumber === number)
          continue
        const refId = `ghfs:issue:${refNumber}`
        addEdge(nodeId, refId, 'references')
      }

      const atMentions = commentBody.match(/@([a-z0-9-]+)/gi)
      if (atMentions) {
        for (const mention of atMentions) {
          const login = mention.slice(1)
          const mentionedId = `ghfs:person:${login}`
          if (!seenPeople.has(mentionedId)) {
            addNode({
              type: 'node',
              id: mentionedId,
              nodeType: 'person',
              properties: { login },
            })
            seenPeople.add(mentionedId)
          }
          addEdge(nodeId, mentionedId, 'mentions')
        }
      }
    }

    if (pull) {
      if (pull.requested_reviewers) {
        for (const reviewer of pull.requested_reviewers) {
          const reviewerId = `ghfs:person:${reviewer.login}`
          if (!seenPeople.has(reviewerId)) {
            addNode({
              type: 'node',
              id: reviewerId,
              nodeType: 'person',
              properties: {
                login: reviewer.login,
                avatarUrl: reviewer.avatar_url,
              },
            })
            seenPeople.add(reviewerId)
          }
          addEdge(nodeId, reviewerId, 'review_requested')
        }
      }

      if (pull.head?.sha) {
        const commitId = `ghfs:commit:${pull.head.sha}`
        addNode({
          type: 'node',
          id: commitId,
          nodeType: 'commit',
          properties: {
            sha: pull.head.sha,
            ref: pull.head.ref,
          },
        })
        addEdge(nodeId, commitId, 'connected')
      }
    }

    if (timeline) {
      for (const event of timeline) {
        if (event.event === 'cross-referenced' && event.source?.issue) {
          const sourceNumber = event.source.issue.number
          const sourceId = event.source.issue.pull_request
            ? `ghfs:pull:${sourceNumber}`
            : `ghfs:issue:${sourceNumber}`
          addEdge(nodeId, sourceId, 'connected')
        }
      }
    }
  }

  const graphPath = resolve(storageDirAbsolute, 'graph.jsonl')
  const lines = entries.map(entry => JSON.stringify(entry)).join('\n')
  writeFileSync(graphPath, `${lines}\n`, 'utf-8')
}
