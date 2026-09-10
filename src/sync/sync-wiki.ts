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

    const specialPages = ['_Sidebar', '_Footer', '_Header']
    const hasSpecialPages = pages.filter(p => specialPages.includes(p.name))

    if (hasSpecialPages.length > 0) {
      indexLines.push(`\n## Special Pages\n`)
      for (const page of hasSpecialPages) {
        const fileName = `${sanitizeWikiPageName(page.name)}.md`
        indexLines.push(`- [${page.title}](wiki/${fileName})`)
      }
    }

    const regularPages = pages.filter(p => !specialPages.includes(p.name))
    if (regularPages.length > 0) {
      indexLines.push(`\n## Content Pages\n`)
    }

    let written = 0
    for (const page of pages) {
      const fileName = `${sanitizeWikiPageName(page.name)}.md`
      const filePath = join(wikiDir, fileName)

      const content = formatWikiPage(page)
      await writeFile(filePath, content, 'utf8')
      written++

      if (!specialPages.includes(page.name)) {
        indexLines.push(`- [${page.title}](wiki/${fileName})`)
      }
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

  if (page.history && page.history.length > 0) {
    lines.push(`\n## 📝 Page History\n`)
    lines.push(`Total revisions: ${page.history.length}\n`)

    for (const rev of page.history.slice(0, 10)) {
      const author = rev.author ? `@${rev.author}` : 'Unknown'
      const date = rev.authoredDate ? new Date(rev.authoredDate).toISOString() : 'Unknown date'
      const message = rev.message || 'No commit message'
      lines.push(`- **${rev.sha.slice(0, 7)}** by ${author} on ${date}`)
      lines.push(`  *${message}*`)
    }

    if (page.history.length > 10) {
      lines.push(`\n*...and ${page.history.length - 10} more revisions*`)
    }
  }

  lines.push('')
  lines.push('---\n')
  lines.push(page.content)

  return lines.join('\n')
}
