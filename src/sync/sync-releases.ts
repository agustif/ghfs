// @ts-nocheck
import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncReleases(context: SyncContext): Promise<{
  written: number
}> {
  if (!context.config.sync.releases)
    return { written: 0 }

  try {
    const releases = await context.provider.fetchReleases(10)
    if (releases.length === 0)
      return { written: 0 }

    const releasesDir = join(context.storageDirAbsolute, 'releases')
    await mkdir(releasesDir, { recursive: true })

    const indexLines: string[] = []
    indexLines.push('# Releases\n')
    indexLines.push(`Last synced: ${new Date().toISOString()}\n`)
    indexLines.push(`Total releases: ${releases.length}\n`)

    let written = 0
    for (const release of releases) {
      const fileName = `${release.tagName.replace(/[^a-z0-9.-]/gi, '_')}.md`
      const filePath = join(releasesDir, fileName)

      const lines: string[] = []
      lines.push(`# ${release.name ?? release.tagName}\n`)
      lines.push(`**Tag**: \`${release.tagName}\``)

      if (release.author)
        lines.push(`**Author**: @${release.author}`)

      lines.push(`**Published**: ${release.publishedAt ? new Date(release.publishedAt).toISOString() : 'Not published'}`)
      lines.push(`**Created**: ${new Date(release.createdAt).toISOString()}`)

      if (release.isDraft)
        lines.push(`**Status**: 🚧 Draft`)
      if (release.isPrerelease)
        lines.push(`**Status**: ⚠️ Pre-release`)

      lines.push(`**URL**: ${release.url}\n`)
      lines.push('---\n')

      if (release.body) {
        lines.push(release.body)
      }

      await writeFile(filePath, lines.join('\n'), 'utf8')
      written++

      const status = release.isDraft ? '🚧' : (release.isPrerelease ? '⚠️' : '✅')
      indexLines.push(`- ${status} [${release.name ?? release.tagName}](releases/${fileName}) - ${release.tagName}`)
    }

    const indexPath = join(context.storageDirAbsolute, 'releases.md')
    await writeFile(indexPath, indexLines.join('\n'), 'utf8')
    written++

    return { written }
  }
  catch {
    return { written: 0 }
  }
}
