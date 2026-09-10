import type { ProviderRelease } from '../types/provider'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { RELEASES_DIR_NAME, RELEASES_INDEX_FILE_NAME } from '../constants'
import { getTimestamp } from '../utils/markdown'
import { getReleaseMarkdownPath } from './paths'

export async function syncReleases(
  storageDirAbsolute: string,
  repoSlug: string,
  syncedAt: string,
  fetchReleases: () => Promise<ProviderRelease[]>,
): Promise<void> {
  const releases = await fetchReleases()
  const releasesDir = join(storageDirAbsolute, RELEASES_DIR_NAME)

  await mkdir(releasesDir, { recursive: true })

  for (const release of releases) {
    const markdownPath = getReleaseMarkdownPath(storageDirAbsolute, release.tagName)
    const markdownContent = renderReleaseMarkdown(release, repoSlug)
    await writeFile(markdownPath, markdownContent, 'utf8')
  }

  const indexMarkdown = renderReleasesIndex(repoSlug, syncedAt, releases)
  await writeFile(
    join(storageDirAbsolute, RELEASES_INDEX_FILE_NAME),
    indexMarkdown,
    'utf8',
  )
}

function renderReleaseMarkdown(release: ProviderRelease, _repoSlug: string): string {
  const lines: string[] = []

  lines.push('---')
  lines.push(`tag: ${release.tagName}`)
  if (release.name)
    lines.push(`name: ${release.name}`)
  lines.push(`draft: ${release.draft}`)
  lines.push(`prerelease: ${release.prerelease}`)
  lines.push(`created_at: ${release.createdAt}`)
  if (release.publishedAt)
    lines.push(`published_at: ${release.publishedAt}`)
  if (release.author)
    lines.push(`author: ${release.author}`)
  lines.push(`url: ${release.htmlUrl}`)
  lines.push('---')
  lines.push('')

  lines.push(`# ${release.name || release.tagName}`)
  lines.push('')

  lines.push(`**Tag:** \`${release.tagName}\``)
  lines.push(`**Draft:** ${release.draft ? 'Yes' : 'No'}`)
  lines.push(`**Prerelease:** ${release.prerelease ? 'Yes' : 'No'}`)
  if (release.author)
    lines.push(`**Author:** @${release.author}`)
  lines.push(`**Created:** ${release.createdAt}`)
  if (release.publishedAt)
    lines.push(`**Published:** ${release.publishedAt}`)
  lines.push(`**URL:** ${release.htmlUrl}`)
  lines.push('')

  if (release.reactions && release.reactions.totalCount > 0) {
    lines.push('## Reactions')
    lines.push('')
    const reactionParts: string[] = []
    if (release.reactions.plusOne > 0)
      reactionParts.push(`👍 ${release.reactions.plusOne}`)
    if (release.reactions.minusOne > 0)
      reactionParts.push(`👎 ${release.reactions.minusOne}`)
    if (release.reactions.laugh > 0)
      reactionParts.push(`😄 ${release.reactions.laugh}`)
    if (release.reactions.hooray > 0)
      reactionParts.push(`🎉 ${release.reactions.hooray}`)
    if (release.reactions.confused > 0)
      reactionParts.push(`😕 ${release.reactions.confused}`)
    if (release.reactions.heart > 0)
      reactionParts.push(`❤️ ${release.reactions.heart}`)
    if (release.reactions.rocket > 0)
      reactionParts.push(`🚀 ${release.reactions.rocket}`)
    if (release.reactions.eyes > 0)
      reactionParts.push(`👀 ${release.reactions.eyes}`)
    lines.push(reactionParts.join(' · '))
    lines.push('')
  }

  if (release.assets.length > 0) {
    lines.push('## Assets')
    lines.push('')
    lines.push('| Name | Size | Downloads | Content Type |')
    lines.push('|------|------|-----------|--------------|')
    for (const asset of release.assets) {
      const sizeKB = (asset.size / 1024).toFixed(2)
      lines.push(`| [${asset.name}](${asset.browserDownloadUrl}) | ${sizeKB} KB | ${asset.downloadCount} | \`${asset.contentType}\` |`)
    }
    lines.push('')
  }

  if (release.body) {
    lines.push('## Release Notes')
    lines.push('')
    lines.push(release.body)
    lines.push('')
  }

  return lines.join('\n')
}

function renderReleasesIndex(repoSlug: string, syncedAt: string, releases: ProviderRelease[]): string {
  const sortedReleases = [...releases].sort((a, b) => {
    const aTime = getTimestamp(a.publishedAt || a.createdAt)
    const bTime = getTimestamp(b.publishedAt || b.createdAt)
    return bTime - aTime
  })

  const lines: string[] = []
  lines.push('# Releases')
  lines.push('')
  lines.push(`- repo: ${repoSlug}`)
  lines.push(`- synced_at: ${syncedAt}`)
  lines.push(`- total: ${releases.length}`)
  lines.push('')

  if (sortedReleases.length > 0) {
    lines.push('| Tag | Name | Draft | Prerelease | Published | Assets |')
    lines.push('|-----|------|-------|------------|-----------|--------|')
    for (const release of sortedReleases) {
      const name = release.name || release.tagName
      const draft = release.draft ? '✓' : ''
      const prerelease = release.prerelease ? '✓' : ''
      const published = release.publishedAt || release.createdAt
      const assetsCount = release.assets.length
      lines.push(`| \`${release.tagName}\` | ${name} | ${draft} | ${prerelease} | ${published} | ${assetsCount} |`)
    }
  }

  lines.push('')
  return lines.join('\n')
}
