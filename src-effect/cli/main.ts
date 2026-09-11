#!/usr/bin/env node
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { Command } from 'effect/unstable/cli'
import { ExecutionEngine, GhfsConfig, GitHubClient, MirrorFs, SyncEngine } from '../services'
import { app } from './commands'

const AppLayer = Layer.mergeAll(
  GhfsConfig.layer,
  GitHubClient.layer,
  MirrorFs.layer,
  SyncEngine.layer,
  ExecutionEngine.layer,
  NodeContext.layer,
)

// Command.run pulls argv from Stdio (via NodeContext) — no process.argv.
app.pipe(
  Command.run({ version: '0.3.0-effect' }),
  Effect.provide(AppLayer),
  NodeRuntime.runMain,
)
