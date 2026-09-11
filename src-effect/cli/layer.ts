import { NodeContext } from '@effect/platform-node'
import { Layer } from 'effect'
import { ApplyEngine, ExecutionEngine, GhfsConfig, GitHubClient, MirrorFs, SyncEngine } from '../services'

/** Single application Layer composition root for the Effect CLI. */
export const AppLayer = Layer.mergeAll(
  GhfsConfig.layer,
  GitHubClient.layer,
  MirrorFs.layer,
  SyncEngine.layer,
  ExecutionEngine.layer,
  ApplyEngine.layer,
  NodeContext.layer,
)
