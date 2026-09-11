// @ts-nocheck
import type { RepositoryProvider } from '../types/provider'
import type { PullRequestAugmentations } from './augment-pull-request'
import { syncCodeOwners } from './sync-codeowners'
import { syncDiscussions } from './sync-discussions'
import { syncMergeQueue } from './sync-merge-queue'
import { syncProjectsV2 } from './sync-projects-v2'
import { syncSponsorships } from './sync-sponsorships'
import { syncTeams } from './sync-teams'

export interface SyncGraphQLFeaturesOptions {
  directory: string
  provider: RepositoryProvider
}

export async function syncGraphQLFeatures(
  options: SyncGraphQLFeaturesOptions,
): Promise<void> {
  const { directory, provider } = options

  await Promise.all([
    syncMergeQueueFeature(directory, provider),
    syncProjectsFeature(directory, provider),
    syncDiscussionsFeature(directory, provider),
    syncSponsorshipsFeature(directory, provider),
    syncCodeOwnersFeature(directory, provider),
    syncTeamsFeature(directory, provider),
  ])
}

async function syncMergeQueueFeature(
  directory: string,
  provider: RepositoryProvider,
): Promise<void> {
  try {
    const entries = await provider.fetchMergeQueueEntries()
    if (entries.length > 0)
      await syncMergeQueue(directory, entries)
  }
  catch (error) {
    console.warn('Failed to sync merge queue:', error)
  }
}

async function syncProjectsFeature(
  directory: string,
  provider: RepositoryProvider,
): Promise<void> {
  try {
    await syncProjectsV2(directory, provider)
  }
  catch (error) {
    console.warn('Failed to sync projects:', error)
  }
}

async function syncDiscussionsFeature(
  directory: string,
  provider: RepositoryProvider,
): Promise<void> {
  try {
    const [categories, polls] = await Promise.all([
      provider.fetchDiscussionCategories(),
      provider.fetchDiscussionPolls(),
    ])
    if (categories.length > 0 || polls.length > 0)
      await syncDiscussions(directory, categories, polls)
  }
  catch (error) {
    console.warn('Failed to sync discussions:', error)
  }
}

async function syncSponsorshipsFeature(
  directory: string,
  provider: RepositoryProvider,
): Promise<void> {
  try {
    const [sponsorships, fundingLinks] = await Promise.all([
      provider.fetchSponsorships(),
      provider.fetchFundingLinks(),
    ])
    await syncSponsorships(directory, sponsorships, fundingLinks)
  }
  catch (error) {
    console.warn('Failed to sync sponsorships:', error)
  }
}

async function syncCodeOwnersFeature(
  directory: string,
  provider: RepositoryProvider,
): Promise<void> {
  try {
    const codeowners = await provider.fetchCodeOwners()
    if (codeowners.length > 0)
      await syncCodeOwners(directory, codeowners)
  }
  catch (error) {
    console.warn('Failed to sync codeowners:', error)
  }
}

async function syncTeamsFeature(
  directory: string,
  provider: RepositoryProvider,
): Promise<void> {
  try {
    const teams = await provider.fetchOrganizationTeams()
    if (teams.length > 0)
      await syncTeams(directory, teams)
  }
  catch (error) {
    console.warn('Failed to sync teams:', error)
  }
}

export async function fetchPullRequestAugmentations(
  provider: RepositoryProvider,
  number: number,
): Promise<PullRequestAugmentations> {
  const [projectConnections, statusCheckRollups, reviewThreads] = await Promise.allSettled([
    provider.fetchItemProjectConnections(number),
    provider.fetchPullStatusCheckRollup(number),
    provider.fetchPullReviewThreads(number),
  ])

  return {
    projectConnections: projectConnections.status === 'fulfilled' ? projectConnections.value : null,
    statusCheckRollups: statusCheckRollups.status === 'fulfilled' ? statusCheckRollups.value : [],
    reviewThreads: reviewThreads.status === 'fulfilled' ? reviewThreads.value : [],
  }
}
