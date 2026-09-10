import type { ContextPack, PackSize } from '../types/context-pack'

// TODO: Implement context pack generator - https://github.com/agustif/ghfs/issues/21
// Generates .ghfs/packs/{small,medium,large}/{pr|issue}-N.md from synced data

export async function generateContextPack(
  _storageDir: string,
  _itemType: 'issue' | 'pull',
  _number: number,
  _size: PackSize,
): Promise<ContextPack> {
  // Stub: return minimal pack
  return {
    metadata: {
      pack_size: _size,
      item_type: _itemType,
      number: _number,
      generated_at: new Date().toISOString(),
    },
    sections: [],
  }
}

export async function writeContextPack(
  _storageDir: string,
  _pack: ContextPack,
): Promise<void> {
  // TODO: Write pack to .ghfs/packs/{size}/{type}-{number}.md
}

export async function generateAllPacks(_storageDir: string): Promise<void> {
  // TODO: Generate packs for all synced items
}

export async function extendContextPack(
  _storageDir: string,
  _itemType: 'issue' | 'pull',
  _number: number,
  _size: PackSize,
  _section: { title: string, content: string, chunk_id?: string },
): Promise<void> {
  // TODO: Hook for other sync adapters to extend packs
}
