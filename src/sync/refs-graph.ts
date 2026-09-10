import type { SyncItemState } from '../types'
import type { CrossReference, CrossRefsGraph } from '../types/security'
import type { ProviderTimelineEvent } from '../types/provider'

export function buildCrossRefsGraph(
  items: Record<string, SyncItemState>,
  syncedAt: string,
): CrossRefsGraph {
  const refs: CrossReference[] = []
  const seen = new Set<string>()

  for (const item of Object.values(items)) {
    const fromType = item.kind
    const fromId = item.number

    const timeline = item.data.timeline ?? []
    for (const event of timeline) {
      const extracted = extractRefsFromEvent(event, fromType, fromId)
      for (const ref of extracted) {
        const key = `${ref.from.type}:${ref.from.id}->${ref.to.type}:${ref.to.id}:${ref.relation}`
        if (!seen.has(key)) {
          seen.add(key)
          refs.push(ref)
        }
      }
    }

    const bodyRefs = extractRefsFromText(item.data.item.body ?? '', fromType, fromId)
    for (const ref of bodyRefs) {
      const key = `${ref.from.type}:${ref.from.id}->${ref.to.type}:${ref.to.id}:${ref.relation}`
      if (!seen.has(key)) {
        seen.add(key)
        refs.push(ref)
      }
    }
  }

  return { refs, syncedAt }
}

function extractRefsFromEvent(
  event: ProviderTimelineEvent,
  fromType: 'issue' | 'pull',
  fromId: number,
): CrossReference[] {
  const refs: CrossReference[] = []

  if (event.kind === 'cross-referenced' || event.kind === 'referenced' || event.kind === 'connected') {
    if (event.source) {
      refs.push({
        from: { type: fromType, id: fromId },
        to: { type: event.source.kind, id: event.source.number },
        relation: 'references',
      })
    }
  }

  if (event.kind === 'closed' && event.sha) {
    refs.push({
      from: { type: fromType, id: fromId },
      to: { type: 'commit', id: event.sha },
      relation: 'fixed_by',
    })
  }

  if (event.kind === 'merged' && event.sha) {
    refs.push({
      from: { type: fromType, id: fromId },
      to: { type: 'commit', id: event.sha },
      relation: 'fixed_by',
    })
  }

  return refs
}

function extractRefsFromText(
  text: string,
  fromType: 'issue' | 'pull',
  fromId: number,
): CrossReference[] {
  const refs: CrossReference[] = []
  const issuePattern = /#(\d+)/g
  const closesPattern = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi

  let match: RegExpExecArray | null

  while ((match = closesPattern.exec(text)) !== null) {
    const toId = Number.parseInt(match[1], 10)
    refs.push({
      from: { type: fromType, id: fromId },
      to: { type: 'issue', id: toId },
      relation: 'closes',
    })
  }

  closesPattern.lastIndex = 0
  while ((match = issuePattern.exec(text)) !== null) {
    const toId = Number.parseInt(match[1], 10)
    const alreadyAdded = refs.some(r => r.to.id === toId)
    if (!alreadyAdded) {
      refs.push({
        from: { type: fromType, id: fromId },
        to: { type: 'issue', id: toId },
        relation: 'references',
      })
    }
  }

  return refs
}
