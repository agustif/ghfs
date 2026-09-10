import type { ProvenanceEntry } from '../types/provenance'

// TODO: Implement provenance tracking - https://github.com/agustif/ghfs/issues/23
// Write .ghfs/provenance.jsonl recording fetch metadata per file

export async function recordProvenance(
  _storageDir: string,
  _entry: ProvenanceEntry,
): Promise<void> {
  // TODO: Append to .ghfs/provenance.jsonl
}

export async function loadProvenance(_storageDir: string): Promise<ProvenanceEntry[]> {
  // TODO: Load and parse .ghfs/provenance.jsonl
  return []
}

export async function getFileProvenance(
  _storageDir: string,
  _path: string,
): Promise<ProvenanceEntry | null> {
  // TODO: Find provenance entry for specific file
  return null
}

export function computeContentHash(_content: string): string {
  // TODO: Compute sha256 hash
  return `sha256:stub`
}
