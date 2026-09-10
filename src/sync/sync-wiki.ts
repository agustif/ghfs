import type { ProviderWikiPage } from '../types/provider'
import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncWiki(context: SyncContext): Promise<{
  written: number
  skipped: number
}> {
  if (!context.config.sync.wiki)
    return { written: 0, skipped: 0 }

  // TODO: Register with graph.jsonl when foundation lands
  // Tier: COLD (sync rarely - wiki changes infrequently)

  try {
    const pages = await context.provider.fetchWikiPages()
    if (pages.length === 0)
      return { written: 0, skipped: 0 }

    const wikiDir = join(context.storageDirAbsolute, 'wiki')
    await mkdir(wikiDir, { recursive: true })

    const indexLines: string[] = []
    indexLines.push('# Wiki Pages\n')
    indexLines.push(`Last synced: ${new Date().toISOString()}\n`)
    indexLines.push(`Total pages: ${pages.length}\n`)
    indexLines.push('')

    let written = 0
    for (const page of pages) {
      const fileName = `${sanitizeWikiPageName(page.name)}.md`
      const filePath = join(wikiDir, fileName)

      const content = formatWikiPage(page)
      await writeFile(filePath, content, 'utf8')
      written++

      indexLines.push(`- [${page.title}](wiki/${fileName})`)
    }

    const indexPath = join(context.storageDirAbsolute, 'wiki.md')
    await writeFile(indexPath, indexLines.join('\n'), 'utf8')

    return { written, skipped: 0 }
  }
  catch {
    return { written: 0, skipped: 0 }
  }
}

function sanitizeWikiPageName(name: string): string {
  return name
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .toLowerCase()
}

function formatWikiPage(page: ProviderWikiPage): string {
  const lines: string[] = []

  lines.push(`# ${page.title}\n`)

  if (page.author) {
    lines.push(`**Author**: @${page.author}`)
  }

  if (page.updatedAt) {
    const date = new Date(page.updatedAt)
    lines.push(`**Last Updated**: ${date.toISOString()}`)
  }

  lines.push('')
  lines.push('---\n')
  lines.push(page.content)

  return lines.join('\n')
}
