import type { Graph, GraphEdge, GraphNode } from '../types/graph'

// TODO: Implement graph builder - https://github.com/agustif/ghfs/issues/25
// Builder runs on existing synced markdown/json and generates .ghfs/graph.jsonl

export async function buildGraph(_storageDir: string): Promise<Graph> {
  // Stub: return empty graph
  return { nodes: [], edges: [] }
}

export async function addGraphNode(_storageDir: string, _node: GraphNode): Promise<void> {
  // TODO: Append node to graph.jsonl
}

export async function addGraphEdge(_storageDir: string, _edge: GraphEdge): Promise<void> {
  // TODO: Append edge to graph.jsonl
}

export async function loadGraph(_storageDir: string): Promise<Graph> {
  // TODO: Load and parse .ghfs/graph.jsonl
  return { nodes: [], edges: [] }
}

export async function writeGraph(_storageDir: string, _graph: Graph): Promise<void> {
  // TODO: Write graph to .ghfs/graph.jsonl (JSONL format)
}
