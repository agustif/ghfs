import { NodeContext } from '@effect/platform-node'
import { Layer } from 'effect'
import {
  ApplyEngine,
  ExecutionEngine,
  GhfsConfig,
  GitHubClient,
  GitHubResolver,
  MirrorFs,
  SyncCache,
  SyncConcurrency,
  SyncEngine,
  SyncEngineStreaming,
  SyncLabels,
  SyncMilestones,
  SyncComments,
} from '../services'

/** AppLayer @ tip 200cc0f (#198 Schema-first execute.md).
 * Adds SyncLabels / SyncMilestones / SyncComments — no service body rewrites.
 */
export const AppLayer = Layer.mergeAll(
  GhfsConfig.layer,
  GitHubClient.layer,
  MirrorFs.layer,
  SyncEngine.layer,
  ExecutionEngine.layer,
  ApplyEngine.layer,
  GitHubResolver.layer,
  SyncCache.layer,
  SyncConcurrency.layer,
  SyncEngineStreaming.layer,
  SyncLabels.layer,
  SyncMilestones.layer,
  SyncComments.layer,
  NodeContext.layer,
)
