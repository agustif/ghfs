import type { ProviderItem, SyncItemState } from '../types'
import type { ProviderCheckRun, ProviderCombinedStatus } from '../types/provider'
import type { ItemSyncStats, PatchPlan, PreparedIssueCandidate, SyncContext } from './sync-repository-types'
import { readdir } from 'node:fs/promises'
import { basename, dirname, join } from 'pathe'
import { CLOSED_DIR_NAME, ISSUE_DIR_NAME, PULL_DIR_NAME } from '../constants'
import { diagnostics } from '../logger'
import { formatIssueNumber } from '../utils/format'
import { movePath, pathExists, removeJsonIfExists, removeJsonlIfExists, removePatchIfExists, removePath, writeFileEnsured, writeJsonFile, writeJsonlFile } from '../utils/fs'
import { normalizeReactions } from '../utils/reactions'
import { writePullAugmentations } from './augment-pull-request'
import { renderIssueMarkdown } from './markdown'
import { fetchPullRequestAugmentations } from './sync-graphql-features'
import {
  getExistingMarkdownPaths,
  moveMarkdownByState,
  resolveIssuePaths,
  resolveMoveSourcePath,
  updateTrackedItem,
} from './sync-repository-storage'
import { relativeToStorage, resolvePatchPlan, shouldSyncPrDetails, shouldWriteCheckStatus, shouldWriteCommits, shouldWriteReviewComments, shouldWriteTimeline } from './sync-repository-utils'
import { getItemCheckStatusPath, getItemCommitsPath, getItemReviewCommentsPath, getItemTimelinePath } from './paths'

export async function prepareIssueCandidateSync(context: SyncContext, issue: ProviderItem): Promise<PreparedIssueCandidate> {
  const number = issue.number
  const kind = issue.kind
  const state = issue.state
  const tracked = context.syncState.items[String(number)]
  const paths = await resolveIssuePaths(context.storageDirAbsolute, kind, number, issue.title, state, tracked?.filePath)

  const patchPlan = resolvePatchPlan(context.config.sync.patches, kind, state)

  if (state === 'closed' && context.config.sync.closed === false) {
    delete context.syncState.items[String(number)]
    return {
      number,
      kind,
      state,
      action: 'remove',
      paths,
      patchPlan,
    }
  }

  if (state === 'closed' && context.config.sync.closed === true && !paths.hasLocalFile) {
    delete context.syncState.items[String(number)]
    return {
      number,
      kind,
      state,
      action: 'remove',
      paths,
      patchPlan,
    }
  }

  const needsDetails = shouldSyncPrDetails(context.config.sync, kind, state)
  const hasCanonicalData = Boolean(
    tracked?.data
    && (kind !== 'pull' || tracked.data.pull)
    && (!needsDetails || (tracked.data.timeline && (kind !== 'pull' || tracked.data.commits))),
  )
  const shouldRefetch = !tracked || tracked.lastUpdatedAt !== issue.updatedAt || !hasCanonicalData
  const data = shouldRefetch
    ? await fetchCanonicalData(context, issue)
    : tracked.data

  updateTrackedItem(
    context,
    number,
    kind,
    state,
    issue.updatedAt,
    paths.targetPath,
    patchPlan.shouldWritePatch ? paths.patchPath : undefined,
    data,
  )

  return {
    number,
    kind,
    state,
    action: resolveSyncAction(shouldRefetch, paths, state),
    paths,
    patchPlan,
  }
}

export async function materializePreparedIssue(context: SyncContext, candidate: PreparedIssueCandidate): Promise<ItemSyncStats> {
  const { number, kind, state, action, patchPlan, paths } = candidate

  if (action === 'remove') {
    for (const markdownPath of getExistingMarkdownPaths(paths))
      await removePath(markdownPath)

    let patchesDeleted = 0
    if (kind === 'pull')
      patchesDeleted += await removePatchIfExists(context.storageDirAbsolute, number)

    patchesDeleted += await removeDeepDataFiles(context, candidate)

    return {
      kind,
      action,
      skipped: 0,
      written: 0,
      moved: 0,
      patchesWritten: 0,
      patchesDeleted,
    }
  }

  if (action === 'skip') {
    let patchesDeleted = 0
    if (patchPlan.shouldDeletePatch)
      patchesDeleted += await removePatchIfExists(context.storageDirAbsolute, number)

    const tracked = context.syncState.items[String(number)]
    if (tracked) {
      const deepDataStats = await syncDeepDataFiles(context, candidate, tracked)
      patchesDeleted += deepDataStats.filesDeleted
    }

    return {
      kind,
      action,
      skipped: 1,
      written: 0,
      moved: 0,
      patchesWritten: 0,
      patchesDeleted,
    }
  }

  const tracked = context.syncState.items[String(number)]
  if (!tracked) {
    throw diagnostics.GHFS0401({
      issue: formatIssueNumber(number, { repo: context.repoSlug, kind }),
    })
  }

  const markdown = buildTrackedMarkdown(context, tracked)

  const moved = await moveMarkdownByState(paths, state)
  await writeFileEnsured(paths.targetPath, markdown)

  if (kind === 'pull' && state === 'open') {
    await syncPullIntelligence(context, number, paths.targetPath)
  }

  const patchStats = await syncPatchByPlan(context, number, paths.patchPath, patchPlan)
  const deepDataStats = await syncDeepDataFiles(context, candidate, tracked)

  if (kind === 'pull')
    await syncPullIntelligence(context, number, paths.targetPath)

  if (kind === 'pull') {
    await syncPullIntelligence(context, number, paths.targetPath)

    if (action === 'refetch') {
      try {
        const augmentations = await fetchPullRequestAugmentations(context.provider, number)
        const pullDir = dirname(paths.targetPath)
        await writePullAugmentations(pullDir, number, augmentations)
      }
      catch (error) {
        console.warn(`Failed to fetch/write augmentations for PR #${number}:`, error)
      }
    }
  }

  if (kind === 'pull')
    await syncPullIntelligence(context, number, paths.targetPath)

  return {
    kind,
    action,
    skipped: 0,
    written: 1,
    moved,
    patchesWritten: patchStats.patchesWritten,
    patchesDeleted: patchStats.patchesDeleted + deepDataStats.filesDeleted,
  }
}

export async function rematerializeTrackedMarkdown(context: SyncContext): Promise<{
  processed: number
  written: number
  moved: number
}> {
  let processed = 0
  let written = 0
  let moved = 0

  for (const tracked of Object.values(context.syncState.items)) {
    const paths = await resolveIssuePaths(
      context.storageDirAbsolute,
      tracked.kind,
      tracked.number,
      tracked.data.item.title,
      tracked.state,
      tracked.filePath,
    )

    moved += await moveMarkdownByState(paths, tracked.state)
    await writeFileEnsured(paths.targetPath, buildTrackedMarkdown(context, tracked))

    tracked.filePath = relativeToStorage(context.storageDirAbsolute, paths.targetPath)
    tracked.lastSyncedAt = context.syncedAt

    processed += 1
    written += 1
  }

  return {
    processed,
    written,
    moved,
  }
}

export async function reconcileMarkdownFilesByScan(context: SyncContext): Promise<{
  written: number
  moved: number
}> {
  let written = 0
  let moved = 0
  const expectedPaths = new Set<string>()

  for (const tracked of Object.values(context.syncState.items)) {
    const paths = await resolveIssuePaths(
      context.storageDirAbsolute,
      tracked.kind,
      tracked.number,
      tracked.data.item.title,
      tracked.state,
      tracked.filePath,
    )

    expectedPaths.add(paths.targetPath)

    const movedByState = !paths.hasTargetFile
      ? await moveMarkdownByState(paths, tracked.state)
      : 0

    let changed = movedByState > 0
    if (!await pathExists(paths.targetPath)) {
      await writeFileEnsured(paths.targetPath, buildTrackedMarkdown(context, tracked))
      written += 1
      changed = true
    }

    tracked.filePath = relativeToStorage(context.storageDirAbsolute, paths.targetPath)
    if (changed)
      tracked.lastSyncedAt = context.syncedAt

    moved += movedByState
  }

  moved += await moveExtraMarkdownFilesToClosed(context.storageDirAbsolute, expectedPaths)
  return {
    written,
    moved,
  }
}

function resolveSyncAction(shouldRefetch: boolean, paths: PreparedIssueCandidate['paths'], state: 'open' | 'closed'): PreparedIssueCandidate['action'] {
  if (shouldRefetch)
    return 'refetch'
  if (paths.hasTargetFile)
    return 'skip'
  if (resolveMoveSourcePath(paths, state))
    return 'move'
  return 'create'
}

async function fetchCanonicalData(context: SyncContext, issue: ProviderItem) {
  const includeDetails = shouldSyncPrDetails(context.config.sync, issue.kind, issue.state)
  const [comments, pull, commits, timeline, reviewComments] = await Promise.all([
    context.provider.fetchComments(issue.number),
    issue.kind === 'pull'
      ? context.provider.fetchPullMetadata(issue.number)
      : Promise.resolve(undefined),
    issue.kind === 'pull' && includeDetails
      ? context.provider.fetchPullCommits(issue.number)
      : Promise.resolve(undefined),
    includeDetails
      ? context.provider.fetchTimeline(issue.number)
      : Promise.resolve(undefined),
    issue.kind === 'pull' && includeDetails
      ? context.provider.fetchReviewComments(issue.number)
      : Promise.resolve(undefined),
  ])

  let checkRuns: ProviderCheckRun[] | undefined
  let combinedStatus: ProviderCombinedStatus | undefined
  if (issue.kind === 'pull' && pull?.headSha && includeDetails) {
    try {
      [checkRuns, combinedStatus] = await Promise.all([
        context.provider.fetchCheckRuns(pull.headSha).catch(() => []),
        context.provider.fetchCombinedStatus(pull.headSha).catch(() => undefined),
      ])
    }
    catch {
      checkRuns = undefined
      combinedStatus = undefined
    }
  }

  return {
    item: issue,
    comments,
    pull,
    commits,
    timeline,
    reviewComments,
    checkRuns,
    combinedStatus,
  }
}

async function syncPatchByPlan(
  context: SyncContext,
  number: number,
  patchPath: string,
  patchPlan: PatchPlan,
): Promise<Pick<ItemSyncStats, 'patchesWritten' | 'patchesDeleted'>> {
  let patchesWritten = 0
  let patchesDeleted = 0

  if (patchPlan.shouldWritePatch) {
    const patch = await context.provider.fetchPullPatch(number)
    await removePatchIfExists(context.storageDirAbsolute, number)
    await writeFileEnsured(patchPath, patch)
    patchesWritten += 1
  }

  if (patchPlan.shouldDeletePatch)
    patchesDeleted += await removePatchIfExists(context.storageDirAbsolute, number)

  return {
    patchesWritten,
    patchesDeleted,
  }
}

async function removeDeepDataFiles(
  context: SyncContext,
  candidate: PreparedIssueCandidate,
): Promise<number> {
  const { number, kind, state, paths } = candidate

  const firstMarkdownPath = getExistingMarkdownPaths(paths)[0]
  if (!firstMarkdownPath)
    return 0

  const title = candidate.paths.targetPath.split('/').pop()?.replace(/^\d+-/, '').replace(/\.md$/, '') ?? 'untitled'

  let removed = 0
  removed += await removeJsonlIfExists(getItemTimelinePath(context.storageDirAbsolute, kind, number, state, title))

  if (kind === 'pull') {
    removed += await removeJsonIfExists(getItemCommitsPath(context.storageDirAbsolute, number, state, title))
    removed += await removeJsonlIfExists(getItemReviewCommentsPath(context.storageDirAbsolute, number, state, title))
    removed += await removeJsonIfExists(getItemCheckStatusPath(context.storageDirAbsolute, number, state, title))
  }

  return removed
}

async function syncDeepDataFiles(
  context: SyncContext,
  candidate: PreparedIssueCandidate,
  tracked: SyncItemState,
): Promise<{ filesDeleted: number }> {
  let filesDeleted = 0
  const { number, kind, state } = candidate
  const { data } = tracked

  const timelinePath = getItemTimelinePath(context.storageDirAbsolute, kind, number, state, data.item.title)
  if (shouldWriteTimeline(context.config.sync, state) && data.timeline && data.timeline.length > 0) {
    await writeJsonlFile(timelinePath, data.timeline, context.config.sync.timelineLimit)
  }
  else {
    filesDeleted += await removeJsonlIfExists(timelinePath)
  }

  if (kind === 'pull') {
    const commitsPath = getItemCommitsPath(context.storageDirAbsolute, number, state, data.item.title)
    if (shouldWriteCommits(context.config.sync, state) && data.commits && data.commits.length > 0) {
      const commitsToWrite = context.config.sync.commitsLimit && context.config.sync.commitsLimit > 0
        ? data.commits.slice(-context.config.sync.commitsLimit)
        : data.commits
      await writeJsonFile(commitsPath, commitsToWrite)
    }
    else {
      filesDeleted += await removeJsonIfExists(commitsPath)
    }

    const reviewCommentsPath = getItemReviewCommentsPath(context.storageDirAbsolute, number, state, data.item.title)
    if (shouldWriteReviewComments(context.config.sync, state) && data.reviewComments && data.reviewComments.length > 0) {
      await writeJsonlFile(reviewCommentsPath, data.reviewComments, false)
    }
    else {
      filesDeleted += await removeJsonlIfExists(reviewCommentsPath)
    }

    const checkStatusPath = getItemCheckStatusPath(context.storageDirAbsolute, number, state, data.item.title)
    if (shouldWriteCheckStatus(context.config.sync, state) && (data.checkRuns || data.combinedStatus)) {
      await writeJsonFile(checkStatusPath, {
        checkRuns: data.checkRuns ?? [],
        combinedStatus: data.combinedStatus ?? null,
      })
    }
    else {
      filesDeleted += await removeJsonIfExists(checkStatusPath)
    }
  }

  try {
    if (config.checks) {
      const checks = await context.provider.fetchPullChecks(number)
      const checksPath = join(prDir, 'checks.json')
      await writeFileEnsured(checksPath, JSON.stringify(checks, null, 2))
    }
  }
  catch (error) {
    diagnostics.warn(`Failed to sync checks for PR #${number}: ${error}`)
  }

  try {
    if (config.files) {
      const files = await context.provider.fetchPullFiles(number)
      const filesPath = join(prDir, 'files.json')
      await writeFileEnsured(filesPath, JSON.stringify(files, null, 2))
    }
  }
  catch (error) {
    diagnostics.warn(`Failed to sync files for PR #${number}: ${error}`)
  }

  try {
    if (config.gate) {
      const gate = await context.provider.fetchPullGate(number)
      const gatePath = join(prDir, 'gate.json')
      await writeFileEnsured(gatePath, JSON.stringify(gate, null, 2))
    }
  }
  catch (error) {
    diagnostics.warn(`Failed to sync gate for PR #${number}: ${error}`)
  }

  try {
    if (config.compare) {
      const compare = await context.provider.fetchPullCompare(number)
      const comparePath = join(prDir, 'compare.json')
      await writeFileEnsured(comparePath, JSON.stringify(compare, null, 2))
    }
  }
  catch (error) {
    diagnostics.warn(`Failed to sync compare for PR #${number}: ${error}`)
  }

  try {
    if (config.stack) {
      const stack = await context.provider.fetchPullStack(number)
      const stackPath = join(prDir, 'stack.json')
      await writeFileEnsured(stackPath, JSON.stringify(stack, null, 2))
    }
  }
  catch (error) {
    diagnostics.warn(`Failed to sync stack for PR #${number}: ${error}`)
  }

  if (config.statusCheckRollup) {
    try {
      const rollup = await context.provider.fetchPullStatusCheckRollup(number)
      const rollupPath = join(prDir, 'check-rollup.json')
      await writeFileEnsured(rollupPath, JSON.stringify(rollup, null, 2))
    }
    catch (error) {
      diagnostics.warn(`Failed to sync status check rollup for PR #${number}: ${error}`)
    }
  }
}

function buildTrackedMarkdown(context: SyncContext, tracked: SyncItemState): string {
  return renderIssueMarkdown({
    repo: context.repoSlug,
    number: tracked.data.item.number,
    kind: tracked.data.item.kind,
    url: tracked.data.item.url,
    state: tracked.data.item.state,
    title: tracked.data.item.title,
    body: tracked.data.item.body ?? '',
    author: tracked.data.item.author ?? 'unknown',
    labels: tracked.data.item.labels,
    assignees: tracked.data.item.assignees,
    milestone: tracked.data.item.milestone,
    createdAt: tracked.data.item.createdAt,
    updatedAt: tracked.data.item.updatedAt,
    closedAt: tracked.data.item.closedAt,
    lastSyncedAt: context.syncedAt,
    reactions: normalizeReactions(tracked.data.item.reactions),
    comments: tracked.data.comments.map(comment => ({
      id: comment.id,
      author: comment.author ?? 'unknown',
      body: comment.body ?? '',
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      reactions: normalizeReactions(comment.reactions),
    })),
    pr: tracked.data.pull,
  })
}

async function moveExtraMarkdownFilesToClosed(storageDirAbsolute: string, expectedPaths: Set<string>): Promise<number> {
  let moved = 0
  moved += await moveOpenMarkdownFilesToClosed(join(storageDirAbsolute, ISSUE_DIR_NAME), expectedPaths)
  moved += await moveOpenMarkdownFilesToClosed(join(storageDirAbsolute, PULL_DIR_NAME), expectedPaths)
  return moved
}

async function moveOpenMarkdownFilesToClosed(kindDirAbsolute: string, expectedPaths: Set<string>): Promise<number> {
  let moved = 0
  const openFiles = await listOpenMarkdownFiles(kindDirAbsolute)
  const closedDirAbsolute = join(kindDirAbsolute, CLOSED_DIR_NAME)

  for (const markdownPath of openFiles) {
    if (expectedPaths.has(markdownPath))
      continue

    const targetPath = await resolveUniqueClosedTarget(closedDirAbsolute, basename(markdownPath))
    await movePath(markdownPath, targetPath)
    moved += 1
  }

  return moved
}

async function listOpenMarkdownFiles(kindDirAbsolute: string): Promise<string[]> {
  try {
    const entries = await readdir(kindDirAbsolute, { withFileTypes: true, encoding: 'utf8' })
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => join(kindDirAbsolute, entry.name))
  }
  catch {
    return []
  }
}

async function resolveUniqueClosedTarget(closedDirAbsolute: string, fileName: string): Promise<string> {
  const baseName = fileName.replace(/\.md$/i, '')
  let candidate = join(closedDirAbsolute, fileName)
  let index = 1

  while (await pathExists(candidate)) {
    candidate = join(closedDirAbsolute, `${baseName}-extra-${index}.md`)
    index += 1
  }

  return candidate
}
