import type { ProvenanceEntry } from '../types/provenance'

// TODO: Implement provenance tracking - https://github.com/agustif/ghfs/issues/23
// Write .ghfs/provenance.jsonl recording fetch metadata per file

export async function recordProvenance(
  storageDir: string,
  entry: ProvenanceEntry,
): Promise<void> {
  // TODO: Append to .ghfs/provenance.jsonl
}

export async function loadProvenance(storageDir: string): Promise<ProvenanceEntry[]> {
  // TODO: Load and parse .ghfs/provenance.jsonl
  return []
}

export async function getFileProvenance(
  storageDir: string,
  path: string,
): Promise<ProvenanceEntry | null> {
  // TODO: Find provenance entry for specific file
  return null
}

export function computeContentHash(content: string): string {
  // TODO: Compute sha256 hash
  return `sha256:stub`
}
