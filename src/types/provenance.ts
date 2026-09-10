export interface ProvenanceEntry {
  path: string
  fetched_at: string
  source: string
  content_hash: string
  etag?: string
  metadata?: Record<string, unknown>
}
