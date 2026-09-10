import type { PackSize, SyncItemState } from '../types'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'pathe'
import { generatePack } from './generate'
import { getPackPath } from './paths'
import { renderPackMarkdown } from './render'

export interface WritePackOptions {
  storageDirAbsolute: string
  size: PackSize
  itemState: SyncItemState
}

export async function writePack(options: WritePackOptions): Promise<string> {
  const { storageDirAbsolute, size, itemState } = options

  const pack = generatePack({ size, itemState })
  const markdown = renderPackMarkdown(pack)
  const packPath = getPackPath(storageDirAbsolute, size, itemState.kind, itemState.number)

  await mkdir(dirname(packPath), { recursive: true })
  await writeFile(packPath, markdown, 'utf-8')

  return packPath
}

export async function writeAllPackSizes(storageDirAbsolute: string, itemState: SyncItemState): Promise<string[]> {
  const sizes: PackSize[] = ['small', 'medium', 'large']
  const paths: string[] = []

  for (const size of sizes) {
    const path = await writePack({ storageDirAbsolute, size, itemState })
    paths.push(path)
  }

  return paths
}
