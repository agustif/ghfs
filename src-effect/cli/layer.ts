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
} from '../services'

/** AppLayer @ tip cbc71c8 (#195 ApplyEngine on tip).
 * Adds orphan sync helpers only — no service body rewrites.
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
  NodeContext.layer,
)
