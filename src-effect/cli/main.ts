#!/usr/bin/env node
import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { app } from "./commands"
import { GhfsConfig, GitHubClient, MirrorFs, SyncEngine, ExecutionEngine } from "../services"

const AppLayer = Layer.mergeAll(
  GhfsConfig.layer,
  GitHubClient.layer,
  MirrorFs.layer,
  SyncEngine.layer,
  ExecutionEngine.layer
).pipe(Layer.provide(NodeContext.layer))

const main = Command.run(app, {
  name: "ghfs",
  version: "0.3.0-effect"
}).pipe(Effect.provide(AppLayer))

NodeRuntime.runMain(main)
