export interface ProvenanceEntry {
  path: string
  fetched_at: string
  source: string
  content_hash: string
}

export function createProvenanceEntry(
  relativePath: string,
  source: string,
  content: string,
): ProvenanceEntry {
  const hash = createContentHash(content)
  return {
    path: relativePath,
    fetched_at: new Date().toISOString(),
    source,
    content_hash: hash,
  }
}

export function appendProvenance(storageDirAbsolute: string, entry: ProvenanceEntry): void {
  const { resolve } = require('pathe')
  const { appendFileSync } = require('node:fs')
  const provenancePath = resolve(storageDirAbsolute, 'provenance.jsonl')
  appendFileSync(provenancePath, JSON.stringify(entry) + '\n', 'utf-8')
}

function createContentHash(content: string): string {
  const { createHash } = require('node:crypto')
  return `sha256:${createHash('sha256').update(content).digest('hex')}`
}
