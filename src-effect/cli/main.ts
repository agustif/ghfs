#!/usr/bin/env node
import process from 'node:process'
import { Command } from '@effect/cli'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { ExecutionEngine, GhfsConfig, GitHubClient, MirrorFs, SyncEngine } from '../services'
import { app } from './commands'

const AppLayer = Layer.mergeAll(
  GhfsConfig.layer,
  GitHubClient.layer,
  MirrorFs.layer,
  SyncEngine.layer,
  ExecutionEngine.layer,
).pipe(Layer.provide(NodeContext.layer))

const main = Command.run(app, {
  name: 'ghfs',
  version: '0.3.0-effect',
})(process.argv).pipe(
  Effect.provide(AppLayer),
) as Effect.Effect<void, unknown, never>

NodeRuntime.runMain(main)
