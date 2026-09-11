// @ts-nocheck
import type { ProviderPackage, ProviderPackageVersion } from '../types/provider'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { PACKAGES_DIR_NAME, PACKAGES_INDEX_FILE_NAME } from '../constants'
import { getTimestamp } from '../utils/markdown'
import { getPackageMarkdownPath } from './paths'

export async function syncPackages(
  storageDirAbsolute: string,
  repoSlug: string,
  syncedAt: string,
  fetchPackages: () => Promise<ProviderPackage[]>,
  fetchPackageVersions: (packageType: string, packageName: string) => Promise<ProviderPackageVersion[]>,
): Promise<void> {
  const packages = await fetchPackages()
  const packagesDir = join(storageDirAbsolute, PACKAGES_DIR_NAME)

  await mkdir(packagesDir, { recursive: true })

  for (const pkg of packages) {
    const versions = await fetchPackageVersions(pkg.packageType, pkg.name)
    const markdownPath = getPackageMarkdownPath(storageDirAbsolute, pkg.packageType, pkg.name)
    const markdownContent = renderPackageMarkdown(pkg, versions, repoSlug)
    await writeFile(markdownPath, markdownContent, 'utf8')
  }

  const indexMarkdown = renderPackagesIndex(repoSlug, syncedAt, packages)
  await writeFile(
    join(storageDirAbsolute, PACKAGES_INDEX_FILE_NAME),
    indexMarkdown,
    'utf8',
  )
}

function renderPackageMarkdown(
  pkg: ProviderPackage,
  versions: ProviderPackageVersion[],
  _repoSlug: string,
): string {
  const lines: string[] = []

  lines.push('---')
  lines.push(`name: ${pkg.name}`)
  lines.push(`package_type: ${pkg.packageType}`)
  lines.push(`visibility: ${pkg.visibility}`)
  lines.push(`owner: ${pkg.owner}`)
  lines.push(`created_at: ${pkg.createdAt}`)
  lines.push(`updated_at: ${pkg.updatedAt}`)
  if (pkg.htmlUrl)
    lines.push(`url: ${pkg.htmlUrl}`)
  if (pkg.repository)
    lines.push(`repository: ${pkg.repository.fullName}`)
  lines.push('---')
  lines.push('')

  lines.push(`# ${pkg.name}`)
  lines.push('')

  lines.push(`**Type:** \`${pkg.packageType}\``)
  lines.push(`**Visibility:** ${pkg.visibility}`)
  lines.push(`**Owner:** ${pkg.owner}`)
  lines.push(`**Created:** ${pkg.createdAt}`)
  lines.push(`**Updated:** ${pkg.updatedAt}`)
  if (pkg.htmlUrl)
    lines.push(`**URL:** ${pkg.htmlUrl}`)
  if (pkg.repository)
    lines.push(`**Repository:** ${pkg.repository.fullName}`)
  lines.push('')

  if (versions.length > 0) {
    lines.push('## Versions')
    lines.push('')
    lines.push('| Name | Tags | Created | Updated |')
    lines.push('|------|------|---------|---------|')
    for (const version of versions) {
      const tags = version.metadata?.container?.tags?.join(', ') || ''
      const tagsDisplay = tags ? `\`${tags}\`` : ''
      lines.push(`| \`${version.name}\` | ${tagsDisplay} | ${version.createdAt} | ${version.updatedAt} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function renderPackagesIndex(repoSlug: string, syncedAt: string, packages: ProviderPackage[]): string {
  const sortedPackages = [...packages].sort((a, b) => {
    const aTime = getTimestamp(a.updatedAt)
    const bTime = getTimestamp(b.updatedAt)
    return bTime - aTime
  })

  const lines: string[] = []
  lines.push('# Packages')
  lines.push('')
  lines.push(`- repo: ${repoSlug}`)
  lines.push(`- synced_at: ${syncedAt}`)
  lines.push(`- total: ${packages.length}`)
  lines.push('')

  const packageTypes = [...new Set(packages.map(p => p.packageType))].sort()
  lines.push(`**Package Types:** ${packageTypes.join(', ')}`)
  lines.push('')

  if (sortedPackages.length > 0) {
    lines.push('| Name | Type | Visibility | Owner | Updated |')
    lines.push('|------|------|------------|-------|---------|')
    for (const pkg of sortedPackages) {
      const url = pkg.htmlUrl ? `[${pkg.name}](${pkg.htmlUrl})` : pkg.name
      lines.push(`| ${url} | \`${pkg.packageType}\` | ${pkg.visibility} | ${pkg.owner} | ${pkg.updatedAt} |`)
    }
  }

  lines.push('')
  return lines.join('\n')
}
