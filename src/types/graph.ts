export type GraphNodeType
  = | 'issue'
    | 'pull'
    | 'discussion'
    | 'commit'
    | 'check'
    | 'person'
    | 'label'
    | 'milestone'
    | 'release'
    | 'workflow'
    | 'file_path'

export interface GraphNode {
  id: string
  type: GraphNodeType
  label: string
  url?: string
  state?: string
  metadata?: Record<string, unknown>
}

export type GraphEdgeType
  = | 'references'
    | 'fixes'
    | 'review_requested'
    | 'owns'
    | 'checks'
    | 'merges'
    | 'labels'
    | 'discusses'
    | 'assigned_to'
    | 'milestone_tracks'

export interface GraphEdge {
  from: string
  to: string
  type: GraphEdgeType
  metadata?: Record<string, unknown>
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
