export type PackSize = 'small' | 'medium' | 'large'
export type ItemType = 'issue' | 'pull'

export interface ContextPackMetadata {
  pack_size: PackSize
  item_type: ItemType
  number: number
  generated_at: string
}

export interface ContextPackSection {
  title: string
  content: string
  chunk_id?: string
}

export interface ContextPack {
  metadata: ContextPackMetadata
  sections: ContextPackSection[]
}
