import type { Octokit } from 'octokit'
import type {
  ProviderCodeOwner,
  ProviderDiscussionCategory,
  ProviderDiscussionPoll,
  ProviderFundingLinks,
  ProviderMergeQueueEntry,
  ProviderProjectItemConnection,
  ProviderProjectV2,
  ProviderProjectV2Field,
  ProviderProjectV2Item,
  ProviderReviewThread,
  ProviderSponsorship,
  ProviderStatusCheckRollup,
  ProviderTeam,
} from '../../types/graphql-provider'
import { Buffer } from 'node:buffer'
import {
  DISCUSSION_CATEGORIES_QUERY,
  DISCUSSION_POLLS_QUERY,
  ITEM_PROJECT_CONNECTIONS_QUERY,
  MERGE_QUEUE_QUERY,
  ORG_TEAMS_QUERY,
  PROJECT_V2_FIELDS_QUERY,
  PROJECT_V2_ITEMS_QUERY,
  PROJECTS_V2_QUERY,
  REVIEW_THREADS_QUERY,
  SPONSORSHIPS_ORG_QUERY,
  SPONSORSHIPS_QUERY,
  STATUS_CHECK_ROLLUP_QUERY,
} from './graphql-queries'

type BumpRequestCount = () => void

export async function fetchMergeQueueEntries(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderMergeQueueEntry[]> {
  try {
    bumpRequestCount()
    const data = await octokit.graphql<{
      repository: {
        mergeQueue: {
          entries: {
            nodes: Array<{
              id: string
              position: number
              state: string
              estimatedTimeToMerge: string | null
              enqueuedAt: string
              headCommit: {
                oid: string
                message: string
              }
              pullRequest: {
                number: number
                title: string
                url: string
              }
            }>
          }
        } | null
      } | null
    }>(MERGE_QUEUE_QUERY, { owner, name: repo })

    const entries = data.repository?.mergeQueue?.entries?.nodes ?? []
    return entries.map(entry => ({
      id: entry.id,
      number: entry.pullRequest.number,
      pullRequest: entry.pullRequest,
      position: entry.position,
      state: entry.state as ProviderMergeQueueEntry['state'],
      estimatedTimeToMerge: entry.estimatedTimeToMerge,
      enqueuedAt: entry.enqueuedAt,
      headCommit: {
        sha: entry.headCommit.oid,
        message: entry.headCommit.message,
      },
    }))
  }
  catch {
    return []
  }
}

export async function fetchProjectsV2(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderProjectV2[]> {
  try {
    bumpRequestCount()
    const data = await octokit.graphql<{
      repository: {
        projectsV2: {
          nodes: Array<{
            id: string
            number: number
            title: string
            shortDescription: string | null
            readme: string | null
            public: boolean
            closed: boolean
            url: string
            createdAt: string
            updatedAt: string
            closedAt: string | null
            owner: {
              login: string
            }
          }>
        }
      } | null
    }>(PROJECTS_V2_QUERY, { owner, name: repo })

    return data.repository?.projectsV2?.nodes ?? []
  }
  catch {
    return []
  }
}

export async function fetchProjectV2Fields(
  octokit: Octokit,
  projectId: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderProjectV2Field[]> {
  try {
    bumpRequestCount()
    const data = await octokit.graphql<{
      node: {
        fields: {
          nodes: Array<{
            id: string
            name: string
            dataType: string
            options?: Array<{
              id: string
              name: string
              color?: string | null
            }>
          }>
        }
      } | null
    }>(PROJECT_V2_FIELDS_QUERY, { projectId })

    const fields = data.node?.fields?.nodes ?? []
    return fields.map(field => ({
      id: field.id,
      name: field.name,
      dataType: field.dataType as ProviderProjectV2Field['dataType'],
      options: field.options,
    }))
  }
  catch {
    return []
  }
}

export async function fetchProjectV2Items(
  octokit: Octokit,
  projectId: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderProjectV2Item[]> {
  const items: ProviderProjectV2Item[] = []
  let cursor: string | null = null
  let hasNextPage = true

  try {
    while (hasNextPage) {
      bumpRequestCount()
      const data: {
        node: {
          items: {
            pageInfo: {
              hasNextPage: boolean
              endCursor: string | null
            }
            nodes: Array<{
              id: string
              fieldValues: {
                nodes: Array<{
                  text?: string
                  number?: number
                  date?: string
                  name?: string
                  title?: string
                  field: {
                    id: string
                    name: string
                  }
                }>
              }
              content: {
                number?: number
                title?: string
                url?: string
              } | null
            }>
          }
        } | null
      } = await octokit.graphql(PROJECT_V2_ITEMS_QUERY, { projectId, cursor })

      const itemsPage = data.node?.items
      if (!itemsPage)
        break

      hasNextPage = itemsPage.pageInfo.hasNextPage
      cursor = itemsPage.pageInfo.endCursor

      for (const item of itemsPage.nodes) {
        const fieldValues = item.fieldValues.nodes.map((fv: {
          text?: string
          number?: number
          date?: string
          name?: string
          title?: string
          field: { id: string, name: string }
        }) => {
          const value = fv.text ?? fv.number ?? fv.date ?? fv.name ?? fv.title ?? null
          return {
            field: fv.field,
            value,
          }
        })

        const itemContent = item.content
        const content = itemContent
          ? {
              number: itemContent.number!,
              kind: ('pull_request' in itemContent ? 'pull' : 'issue') as 'issue' | 'pull',
              title: itemContent.title!,
              url: itemContent.url!,
            }
          : null

        items.push({
          id: item.id,
          fieldValues,
          content,
        })
      }
    }

    return items
  }
  catch {
    return items
  }
}

export async function fetchDiscussionCategories(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderDiscussionCategory[]> {
  try {
    bumpRequestCount()
    const data = await octokit.graphql<{
      repository: {
        discussionCategories: {
          nodes: Array<{
            id: string
            name: string
            emoji: string | null
            description: string | null
            isAnswerable: boolean
            createdAt: string
            slug: string
          }>
        }
      } | null
    }>(DISCUSSION_CATEGORIES_QUERY, { owner, name: repo })

    return data.repository?.discussionCategories?.nodes ?? []
  }
  catch {
    return []
  }
}

export async function fetchDiscussionPolls(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderDiscussionPoll[]> {
  const polls: ProviderDiscussionPoll[] = []
  let cursor: string | null = null
  let hasNextPage = true

  try {
    while (hasNextPage) {
      bumpRequestCount()
      const data: {
        repository: {
          discussions: {
            pageInfo: {
              hasNextPage: boolean
              endCursor: string | null
            }
            nodes: Array<{
              id: string
              poll: {
                question: string
                totalVoteCount: number
                options: Array<{
                  id: string
                  option: string
                  totalVoteCount: number
                }>
              } | null
            }>
          }
        } | null
      } = await octokit.graphql(DISCUSSION_POLLS_QUERY, { owner, name: repo, cursor })

      const discussionsData = data.repository?.discussions
      if (!discussionsData)
        break

      hasNextPage = discussionsData.pageInfo.hasNextPage
      cursor = discussionsData.pageInfo.endCursor

      for (const discussion of discussionsData.nodes) {
        if (discussion.poll) {
          polls.push({
            discussionId: discussion.id,
            question: discussion.poll.question,
            options: discussion.poll.options,
            totalVoteCount: discussion.poll.totalVoteCount,
          })
        }
      }
    }

    return polls
  }
  catch {
    return polls
  }
}

export async function fetchSponsorships(
  octokit: Octokit,
  owner: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderSponsorship[]> {
  try {
    bumpRequestCount()
    const data: {
      user: {
        sponsorshipsAsMaintainer: {
          nodes: Array<{
            tier: {
              id: string
              name: string
              monthlyPriceInDollars: number
              description: string
            } | null
            sponsorEntity: {
              login: string
              avatarUrl: string
              url: string
            }
            createdAt: string
            isActive: boolean
            isOneTimePayment: boolean
          }>
        }
      } | null
    } = await octokit.graphql(SPONSORSHIPS_QUERY, { owner })

    if (data.user?.sponsorshipsAsMaintainer) {
      return data.user.sponsorshipsAsMaintainer.nodes.map(node => ({
        tier: node.tier,
        sponsor: node.sponsorEntity,
        createdAt: node.createdAt,
        isActive: node.isActive,
        isOneTime: node.isOneTimePayment,
      }))
    }
  }
  catch {
  }

  try {
    bumpRequestCount()
    const orgData = await octokit.graphql<{
      organization: {
        sponsorshipsAsMaintainer: {
          nodes: Array<{
            tier: {
              id: string
              name: string
              monthlyPriceInDollars: number
              description: string
            } | null
            sponsorEntity: {
              login: string
              avatarUrl: string
              url: string
            }
            createdAt: string
            isActive: boolean
            isOneTimePayment: boolean
          }>
        }
      } | null
    }>(SPONSORSHIPS_ORG_QUERY, { owner })

    if (orgData.organization?.sponsorshipsAsMaintainer) {
      return orgData.organization.sponsorshipsAsMaintainer.nodes.map(node => ({
        tier: node.tier,
        sponsor: node.sponsorEntity,
        createdAt: node.createdAt,
        isActive: node.isActive,
        isOneTime: node.isOneTimePayment,
      }))
    }
  }
  catch {
  }

  return []
}

export async function fetchFundingLinks(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderFundingLinks> {
  const fundingLinks: ProviderFundingLinks = {
    github: [],
    patreon: null,
    openCollective: null,
    koFi: null,
    tidelift: null,
    communityBridge: null,
    liberapay: null,
    issuehunt: null,
    lfxCrowdfunding: null,
    custom: [],
  }

  try {
    bumpRequestCount()
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '.github/FUNDING.yml',
    })

    if ('content' in response.data && response.data.content) {
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
      const lines = content.split('\n')

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('#') || trimmed === '')
          continue

        const colonIndex = trimmed.indexOf(':')
        if (colonIndex === -1)
          continue

        const key = trimmed.slice(0, colonIndex).trim().toLowerCase()
        const valueStr = trimmed.slice(colonIndex + 1).trim()

        if (key === 'github') {
          const values = valueStr
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map(v => v.trim().replace(/['"]/g, ''))
            .filter(Boolean)
          fundingLinks.github = values
        }
        else if (key === 'custom') {
          const values = valueStr
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map(v => v.trim().replace(/['"]/g, ''))
            .filter(Boolean)
          fundingLinks.custom = values
        }
        else {
          const value = valueStr.replace(/['"]/g, '')
          if (key === 'patreon')
            fundingLinks.patreon = value
          else if (key === 'open_collective')
            fundingLinks.openCollective = value
          else if (key === 'ko_fi')
            fundingLinks.koFi = value
          else if (key === 'tidelift')
            fundingLinks.tidelift = value
          else if (key === 'community_bridge')
            fundingLinks.communityBridge = value
          else if (key === 'liberapay')
            fundingLinks.liberapay = value
          else if (key === 'issuehunt')
            fundingLinks.issuehunt = value
          else if (key === 'lfx_crowdfunding')
            fundingLinks.lfxCrowdfunding = value
        }
      }
    }
  }
  catch {
  }

  return fundingLinks
}

export async function fetchItemProjectConnections(
  octokit: Octokit,
  owner: string,
  repo: string,
  number: number,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderProjectItemConnection> {
  try {
    bumpRequestCount()
    const data = await octokit.graphql<{
      repository: {
        issueOrPullRequest: {
          projectItems: {
            nodes: Array<{
              id: string
              project: {
                id: string
                number: number
                title: string
              }
              fieldValues: {
                nodes: Array<{
                  text?: string
                  number?: number
                  date?: string
                  name?: string
                  field: {
                    name: string
                  }
                }>
              }
            }>
          }
        } | null
      } | null
    }>(ITEM_PROJECT_CONNECTIONS_QUERY, { owner, name: repo, number })

    const projectItems = data.repository?.issueOrPullRequest?.projectItems?.nodes ?? []

    return {
      projectV2Items: projectItems.map(item => ({
        projectId: item.project.id,
        projectNumber: item.project.number,
        projectTitle: item.project.title,
        itemId: item.id,
        fieldValues: item.fieldValues.nodes.map(fv => ({
          fieldName: fv.field.name,
          value: fv.text ?? fv.number ?? fv.date ?? fv.name ?? null,
        })),
      })),
    }
  }
  catch {
    return { projectV2Items: [] }
  }
}

export async function fetchPullStatusCheckRollup(
  octokit: Octokit,
  owner: string,
  repo: string,
  number: number,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderStatusCheckRollup[]> {
  try {
    bumpRequestCount()
    const data = await octokit.graphql<{
      repository: {
        pullRequest: {
          commits: {
            nodes: Array<{
              commit: {
                oid: string
                statusCheckRollup: {
                  state: string
                  contexts: {
                    nodes: Array<{
                      name?: string
                      context?: string
                      conclusion?: string | null
                      state?: string
                      status?: string
                      description?: string | null
                      detailsUrl?: string | null
                      targetUrl?: string | null
                      startedAt?: string
                      createdAt?: string
                    }>
                  }
                } | null
              }
            }>
          }
        } | null
      } | null
    }>(STATUS_CHECK_ROLLUP_QUERY, { owner, name: repo, number })

    const commits = data.repository?.pullRequest?.commits?.nodes ?? []
    const rollups: ProviderStatusCheckRollup[] = []

    for (const commitNode of commits) {
      const rollup = commitNode.commit.statusCheckRollup
      if (!rollup)
        continue

      rollups.push({
        commit: {
          sha: commitNode.commit.oid,
        },
        state: rollup.state as ProviderStatusCheckRollup['state'],
        contexts: rollup.contexts.nodes.map((ctx) => {
          const context = ctx.context ?? ctx.name ?? 'unknown'
          const state = (ctx.state ?? ctx.conclusion ?? ctx.status ?? 'PENDING') as ProviderStatusCheckRollup['contexts'][0]['state']
          return {
            context,
            state,
            description: ctx.description ?? null,
            targetUrl: ctx.targetUrl ?? ctx.detailsUrl ?? null,
            createdAt: ctx.createdAt ?? ctx.startedAt ?? new Date().toISOString(),
          }
        }),
      })
    }

    return rollups
  }
  catch {
    return []
  }
}

export async function fetchPullReviewThreads(
  octokit: Octokit,
  owner: string,
  repo: string,
  number: number,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderReviewThread[]> {
  try {
    bumpRequestCount()
    const data = await octokit.graphql<{
      repository: {
        pullRequest: {
          reviewThreads: {
            nodes: Array<{
              id: string
              isResolved: boolean
              isOutdated: boolean
              isCollapsed: boolean
              line: number | null
              originalLine: number | null
              startLine: number | null
              originalStartLine: number | null
              path: string
              diffSide: string
              comments: {
                nodes: Array<{
                  id: string
                  body: string
                  author: {
                    login: string
                  } | null
                  createdAt: string
                  replyTo: {
                    id: string
                  } | null
                }>
              }
            }>
          }
        } | null
      } | null
    }>(REVIEW_THREADS_QUERY, { owner, name: repo, number })

    const threads = data.repository?.pullRequest?.reviewThreads?.nodes ?? []

    return threads.map(thread => ({
      id: thread.id,
      isResolved: thread.isResolved,
      isOutdated: thread.isOutdated,
      isCollapsed: thread.isCollapsed,
      line: thread.line,
      originalLine: thread.originalLine,
      startLine: thread.startLine,
      originalStartLine: thread.originalStartLine,
      path: thread.path,
      diffSide: thread.diffSide as 'LEFT' | 'RIGHT',
      comments: thread.comments.nodes.map(comment => ({
        id: comment.id,
        body: comment.body,
        author: comment.author?.login ?? null,
        createdAt: comment.createdAt,
        replyTo: comment.replyTo?.id ?? null,
      })),
      suggestedChange: extractSuggestedChange(thread.comments.nodes[0]?.body),
    }))
  }
  catch {
    return []
  }
}

function extractSuggestedChange(body: string | undefined): ProviderReviewThread['suggestedChange'] {
  if (!body)
    return null

  const suggestionMatch = body.match(/```suggestion\r?\n([\s\S]*?)\r?\n```/)
  if (!suggestionMatch)
    return null

  const lines = body.split('\n')
  const beforeSuggestion: string[] = []
  let inSuggestion = false

  for (const line of lines) {
    if (line.includes('```suggestion')) {
      inSuggestion = true
      continue
    }
    if (inSuggestion && line.includes('```'))
      break
    if (!inSuggestion && line.trim())
      beforeSuggestion.push(line)
  }

  return {
    originalCode: beforeSuggestion.join('\n'),
    suggestedCode: suggestionMatch[1],
    startLine: 0,
    endLine: 0,
  }
}

export async function fetchCodeOwners(
  octokit: Octokit,
  owner: string,
  repo: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderCodeOwner[]> {
  const paths = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']
  const codeowners: ProviderCodeOwner[] = []

  for (const path of paths) {
    try {
      bumpRequestCount()
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      })

      if ('content' in response.data && response.data.content) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
        const lines = content.split('\n')

        lines.forEach((line, index) => {
          const trimmed = line.trim()
          if (trimmed === '' || trimmed.startsWith('#'))
            return

          const parts = trimmed.split(/\s+/)
          if (parts.length < 2)
            return

          const pattern = parts[0]
          const owners = parts.slice(1).filter(o => o.startsWith('@'))

          codeowners.push({
            pattern,
            owners,
            lineNumber: index + 1,
          })
        })

        return codeowners
      }
    }
    catch {
    }
  }

  return codeowners
}

export async function fetchOrganizationTeams(
  octokit: Octokit,
  owner: string,
  bumpRequestCount: BumpRequestCount,
): Promise<ProviderTeam[]> {
  try {
    bumpRequestCount()
    const data = await octokit.graphql<{
      organization: {
        teams: {
          nodes: Array<{
            id: string
            slug: string
            name: string
            description: string | null
            privacy: string
            url: string
            avatarUrl: string | null
            members: {
              totalCount: number
            }
            repositories: {
              totalCount: number
            }
            createdAt: string
            updatedAt: string
          }>
        }
      } | null
    }>(ORG_TEAMS_QUERY, { owner })

    const teams = data.organization?.teams?.nodes ?? []
    return teams.map(team => ({
      id: team.id,
      slug: team.slug,
      name: team.name,
      description: team.description,
      privacy: team.privacy as ProviderTeam['privacy'],
      url: team.url,
      avatarUrl: team.avatarUrl,
      membersCount: team.members.totalCount,
      repositoriesCount: team.repositories.totalCount,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }))
  }
  catch {
    return []
  }
}
