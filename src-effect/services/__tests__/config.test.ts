import { Effect, Layer } from "effect"
import { describe, it } from "@effect/vitest"
import { GhfsConfig } from "../config"

describe("GhfsConfig", () => {
  it.effect("should load config from environment", () =>
    Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(config.directory).toBe(".ghfs")
      expect(config.syncIssues).toBe(true)
      expect(config.syncPulls).toBe(true)
    }).pipe(
      Effect.provide(
        Layer.succeed(
          GhfsConfig,
          GhfsConfig.of({
            directory: ".ghfs",
            token: { _tag: "Redacted", value: "test-token" } as any,
            repo: "test/repo",
            syncIssues: true,
            syncPulls: true,
            syncClosed: "existing",
            syncPatches: "open"
          })
        )
      )
    )
  )

  it.effect("should default sync toggles to true", () =>
    Effect.gen(function* () {
      const config = yield* GhfsConfig

      expect(config.syncIssues).toBe(true)
      expect(config.syncPulls).toBe(true)
    }).pipe(
      Effect.provide(
        Layer.succeed(
          GhfsConfig,
          GhfsConfig.of({
            directory: ".ghfs",
            token: { _tag: "Redacted", value: "test-token" } as any,
            repo: "test/repo",
            syncIssues: true,
            syncPulls: true,
            syncClosed: "existing",
            syncPatches: "open"
          })
        )
      )
    )
  )
})
