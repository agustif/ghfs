import type { ProviderCodeOwner } from '../types/graphql-provider'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncCodeOwners(
  directory: string,
  codeowners: ProviderCodeOwner[],
): Promise<void> {
  const codeownersDir = join(directory, 'meta')
  await mkdir(codeownersDir, { recursive: true })

  const codeownersPath = join(codeownersDir, 'codeowners.md')
  const content = renderCodeOwners(codeowners)
  await writeFile(codeownersPath, content, 'utf-8')

  const jsonPath = join(codeownersDir, 'codeowners.json')
  await writeFile(jsonPath, JSON.stringify(codeowners, null, 2), 'utf-8')
}

function renderCodeOwners(codeowners: ProviderCodeOwner[]): string {
  const lines: string[] = [
    '# Code Owners',
    '',
    `Total patterns: ${codeowners.length}`,
    '',
    '| Pattern | Owners |',
    '|---------|--------|',
  ]

  for (const owner of codeowners) {
    const ownersStr = owner.owners.join(', ')
    lines.push(`| \`${owner.pattern}\` | ${ownersStr} |`)
  }

  lines.push('')
  return lines.join('\n')
}
