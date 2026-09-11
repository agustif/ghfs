import type { GhfsResolvedConfig } from '../types'
import type { RepositoryProvider } from '../types/provider'

export type SyncStage = 'metadata' | 'pagination' | 'fetch' | 'materialize' | 'prune' | 'wiki' | 'discussions' | 'merge-queue' | 'releases' | 'workflows' | 'actions' | 'graphql' | 'save'

export interface SyncProgressSnapshot {
  scanned: number
  selected: number
  processed: number
  skipped: number
  written: number
  moved: number
  patchesWritten: number
  patchesDeleted: number
}

export interface SyncReporter {
  onStart?: (event: {
    repo: string
    startedAt: string
    since?: string
    numbersCount?: number
    snapshot: SyncProgressSnapshot
  }) => void
  onStageStart?: (event: {
    stage: SyncStage
    message: string
    snapshot: SyncProgressSnapshot
  }) => void
  onStageUpdate?: (event: {
    stage: SyncStage
    message?: string
    snapshot: SyncProgressSnapshot
  }) => void
  onStageEnd?: (event: {
    stage: SyncStage
    message: string
    durationMs: number
    snapshot: SyncProgressSnapshot
  }) => void
  onComplete?: (event: {
    summary: SyncSummary
    stages: Record<SyncStage, number>
  }) => void
  onError?: (event: {
    stage?: SyncStage
    error: unknown
    snapshot: SyncProgressSnapshot
  }) => void
}

export interface SyncOptions {
  config: GhfsResolvedConfig
  repo: string
  token: string
  provider?: RepositoryProvider
  full?: boolean
  since?: string
  numbers?: number[]
  reporter?: SyncReporter
}

export interface SyncSummary {
  repo: string
  since?: string
  syncedAt: string
  totalIssues: number
  totalPulls: number
  updatedIssues: number
  updatedPulls: number
  trackedItems: number
  requestCount: number
  selected: number
  processed: number
  skipped: number
  scanned: number
  written: number
  moved: number
  patchesWritten: number
  patchesDeleted: number
  durationMs: number
  actionsWorkflows?: number
  actionsRuns?: number
  actionsArtifacts?: number
  actionsWebhooks?: number
}
