import type { ProviderFundingLinks, ProviderSponsorship } from '../types/graphql-provider'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function syncSponsorships(
  directory: string,
  sponsorships: ProviderSponsorship[],
  fundingLinks: ProviderFundingLinks,
): Promise<void> {
  const sponsorshipsDir = join(directory, 'sponsorships')
  await mkdir(sponsorshipsDir, { recursive: true })

  const sponsorshipsPath = join(sponsorshipsDir, 'sponsors.md')
  const sponsorshipsContent = renderSponsorships(sponsorships)
  await writeFile(sponsorshipsPath, sponsorshipsContent, 'utf-8')

  const fundingPath = join(sponsorshipsDir, 'funding.json')
  await writeFile(fundingPath, JSON.stringify(fundingLinks, null, 2), 'utf-8')

  const fundingMdPath = join(sponsorshipsDir, 'funding.md')
  const fundingContent = renderFundingLinks(fundingLinks)
  await writeFile(fundingMdPath, fundingContent, 'utf-8')
}

function renderSponsorships(sponsorships: ProviderSponsorship[]): string {
  const lines: string[] = [
    '# Sponsorships',
    '',
    `Total sponsors: ${sponsorships.length}`,
    '',
  ]

  const active = sponsorships.filter(s => s.isActive)
  const inactive = sponsorships.filter(s => !s.isActive)

  if (active.length > 0) {
    lines.push(
      `## Active Sponsors (${active.length})`,
      '',
    )

    for (const sponsorship of active) {
      lines.push(`### [@${sponsorship.sponsor.login}](${sponsorship.sponsor.url})`)

      if (sponsorship.tier) {
        lines.push(
          '',
          `**Tier:** ${sponsorship.tier.name}`,
          `**Amount:** $${sponsorship.tier.monthlyPriceInDollars}/month`,
        )
        if (sponsorship.tier.description)
          lines.push(`**Description:** ${sponsorship.tier.description}`)
      }

      lines.push(
        `**Type:** ${sponsorship.isOneTime ? 'One-time' : 'Recurring'}`,
        `**Since:** ${new Date(sponsorship.createdAt).toISOString().split('T')[0]}`,
        '',
      )
    }
  }

  if (inactive.length > 0) {
    lines.push(
      `## Past Sponsors (${inactive.length})`,
      '',
    )

    for (const sponsorship of inactive) {
      lines.push(
        `- [@${sponsorship.sponsor.login}](${sponsorship.sponsor.url})`,
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}

function renderFundingLinks(links: ProviderFundingLinks): string {
  const lines: string[] = [
    '# Funding Links',
    '',
  ]

  if (links.github.length > 0) {
    lines.push('## GitHub Sponsors', '')
    for (const username of links.github)
      lines.push(`- https://github.com/sponsors/${username}`)
    lines.push('')
  }

  if (links.patreon) {
    lines.push(
      '## Patreon',
      '',
      `https://patreon.com/${links.patreon}`,
      '',
    )
  }

  if (links.openCollective) {
    lines.push(
      '## Open Collective',
      '',
      `https://opencollective.com/${links.openCollective}`,
      '',
    )
  }

  if (links.koFi) {
    lines.push(
      '## Ko-fi',
      '',
      `https://ko-fi.com/${links.koFi}`,
      '',
    )
  }

  if (links.tidelift) {
    lines.push(
      '## Tidelift',
      '',
      links.tidelift,
      '',
    )
  }

  if (links.communityBridge) {
    lines.push(
      '## Community Bridge',
      '',
      links.communityBridge,
      '',
    )
  }

  if (links.liberapay) {
    lines.push(
      '## Liberapay',
      '',
      `https://liberapay.com/${links.liberapay}`,
      '',
    )
  }

  if (links.issuehunt) {
    lines.push(
      '## IssueHunt',
      '',
      `https://issuehunt.io/r/${links.issuehunt}`,
      '',
    )
  }

  if (links.lfxCrowdfunding) {
    lines.push(
      '## LFX Crowdfunding',
      '',
      links.lfxCrowdfunding,
      '',
    )
  }

  if (links.custom.length > 0) {
    lines.push('## Custom Links', '')
    for (const url of links.custom)
      lines.push(`- ${url}`)
    lines.push('')
  }

  return lines.join('\n')
}
