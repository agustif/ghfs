import type { PersonSummary } from '../types/people'
import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { PEOPLE_DIR_NAME } from '../constants'
import { slugifyTitle } from '../utils/string'

export async function syncPeople(context: SyncContext): Promise<void> {
  const peopleMap = new Map<string, PersonSummary>()

  for (const item of Object.values(context.syncState.items)) {
    const { data } = item
    const issue = data.item

    if (issue.author && issue.author !== 'ghost') {
      if (!peopleMap.has(issue.author)) {
        peopleMap.set(issue.author, {
          login: issue.author,
          name: null,
          avatarUrl: issue.authorAvatarUrl ?? '',
          authoredPRs: [],
          reviewsGiven: [],
          codeownerPaths: [],
        })
      }

      const person = peopleMap.get(issue.author)!
      if (item.kind === 'pull') {
        const prState = data.pull?.merged
          ? 'merged'
          : issue.state === 'closed'
            ? 'closed'
            : 'open'

        person.authoredPRs.push({
          number: item.number,
          title: issue.title,
          state: prState,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          url: issue.url ?? '',
        })
      }
    }

    if (data.timeline) {
      for (const event of data.timeline) {
        if (event.kind === 'reviewed' && event.actor && event.actor !== 'ghost') {
          if (!peopleMap.has(event.actor)) {
            peopleMap.set(event.actor, {
              login: event.actor,
              name: null,
              avatarUrl: event.actorAvatarUrl ?? '',
              authoredPRs: [],
              reviewsGiven: [],
              codeownerPaths: [],
            })
          }

          const reviewer = peopleMap.get(event.actor)!
          if (event.review?.state && event.review.state !== 'pending' && event.review.state !== 'dismissed') {
            reviewer.reviewsGiven.push({
              prNumber: item.number,
              prTitle: issue.title,
              state: event.review.state,
              submittedAt: event.review.submittedAt,
              url: issue.url ?? '',
            })
          }
        }
      }
    }
  }

  const codeowners = await context.provider.fetchCodeowners()
  if (codeowners) {
    for (const owner of codeowners.owners) {
      const login = owner.replace(/^@/, '').split('/').pop()!
      const person = peopleMap.get(login)
      if (person) {
        const pathsForOwner = codeowners.owners
          .filter(o => o.endsWith(`/${login}`) || o === `@${login}`)
          .map(() => codeowners.path)
        person.codeownerPaths.push(...pathsForOwner)
      }
    }
  }

  const peopleDir = join(context.storageDirAbsolute, PEOPLE_DIR_NAME)
  await mkdir(peopleDir, { recursive: true })

  for (const person of peopleMap.values()) {
    const fileName = `${slugifyTitle(person.login, 64)}.md`
    const filePath = join(peopleDir, fileName)
    const markdown = renderPersonMarkdown(person, context.repoSlug)
    await writeFile(filePath, markdown, 'utf8')
  }
}

function renderPersonMarkdown(person: PersonSummary, _repoSlug: string): string {
  const lines: string[] = []

  lines.push(`# ${person.login}`)
  lines.push('')

  if (person.name)
    lines.push(`**Name:** ${person.name}`)

  lines.push(`**GitHub:** [@${person.login}](https://github.com/${person.login})`)
  lines.push('')

  lines.push(`## Summary`)
  lines.push('')
  lines.push(`- **Authored PRs:** ${person.authoredPRs.length}`)
  lines.push(`- **Reviews Given:** ${person.reviewsGiven.length}`)
  lines.push(`- **CODEOWNER Paths:** ${person.codeownerPaths.length}`)
  lines.push('')

  if (person.authoredPRs.length > 0) {
    lines.push(`## Authored Pull Requests (${person.authoredPRs.length})`)
    lines.push('')
    lines.push('| Number | Title | State | Created | Updated |')
    lines.push('|--------|-------|-------|---------|---------|')

    const sortedPRs = [...person.authoredPRs].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    for (const pr of sortedPRs) {
      const stateEmoji = pr.state === 'merged' ? '🟣' : pr.state === 'open' ? '🟢' : '🔴'
      const created = new Date(pr.createdAt).toISOString().split('T')[0]
      const updated = new Date(pr.updatedAt).toISOString().split('T')[0]
      lines.push(`| [#${pr.number}](${pr.url}) | ${escapeMarkdown(pr.title)} | ${stateEmoji} ${pr.state} | ${created} | ${updated} |`)
    }
    lines.push('')
  }

  if (person.reviewsGiven.length > 0) {
    lines.push(`## Reviews Given (${person.reviewsGiven.length})`)
    lines.push('')
    lines.push('| PR Number | PR Title | Review State | Submitted |')
    lines.push('|-----------|----------|--------------|-----------|')

    const sortedReviews = [...person.reviewsGiven].sort((a, b) => {
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    })

    for (const review of sortedReviews) {
      const stateEmoji = review.state === 'approved' ? '✅' : review.state === 'changes_requested' ? '❌' : '💬'
      const submitted = new Date(review.submittedAt).toISOString().split('T')[0]
      lines.push(`| [#${review.prNumber}](${review.url}) | ${escapeMarkdown(review.prTitle)} | ${stateEmoji} ${review.state} | ${submitted} |`)
    }
    lines.push('')
  }

  if (person.codeownerPaths.length > 0) {
    lines.push(`## CODEOWNER Paths`)
    lines.push('')
    for (const path of [...new Set(person.codeownerPaths)].sort())
      lines.push(`- \`${path}\``)

    lines.push('')
  }

  return lines.join('\n')
}

function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, '\\|')
}
