/**
 * Single-resource sync for lean gate observe/evaluate →
 * gate/evaluation.json (+ policy/policy.json).
 *
 * Copy to: src-effect/services/sync-gate.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * NO GitHubClient fetch this slice — FileSystem policy load + pure evaluateGate
 * (document none in sync-gate.md). Remote policy-builder / branch protection /
 * rulesets materialization is follow-up only.
 *
 * MirrorFs has no writeGate / writePolicy yet → writes via FileSystem under
 * config.directory. Schema models first; MirrorFs markdown OOS.
 *
 * Local observe/evaluate (match cue src/sync/gate-evaluator.ts):
 *   options.policy OR read policy/policy.json | policy.json
 *   options.context OR empty GateContext
 *   evaluateGate → write gate/evaluation.json
 *   rewrite policy/policy.json when policy was provided or loaded
 * No Stream.paginate. Optional Stream.succeed for a uniform stream() surface
 * (mirrors sync-status / sync-agent-hints).
 *
 * Do NOT rewrite SyncSatellites / engines / closed heals / agent-hints /
 * status / search bodies.
 * Pattern mirrors landed sync-status Context.Service + Layer + FileSystem
 * snapshot (tip 549ce97 / #232 agent-hints; status local-only).
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import {
  decodePolicy,
  emptyPolicy,
  evaluateGate,
  FileSystemError,
  GateEvaluation,
  Policy,
  SyncError,
  type GateContext
} from "../domain"
import { GhfsConfig } from "./config"
import { MirrorFs } from "./mirror-fs"

const GATE_DIR_NAME = "gate"
const GATE_EVALUATION_FILE_NAME = "evaluation.json"
const POLICY_DIR_NAME = "policy"
const POLICY_FILE_NAME = "policy.json"

export interface SyncGateOptions {
  /** Prefer this Policy over FileSystem load. */
  readonly policy?: Policy
  /** Evaluation context; defaults to {}. */
  readonly context?: GateContext
  /**
   * When true and no policy provided/found, use emptyPolicy() instead of
   * failing. Default false (product: missing policy is SyncError).
   */
  readonly allowEmptyPolicy?: boolean
}

export interface SyncGateSummary {
  readonly synced: number
  readonly evaluationPath: string
  readonly policyPath: string
  readonly passed: boolean
  readonly risk_level: GateEvaluation["risk_level"]
}

function mapFs<A, R>(
  effect: Effect.Effect<A, FileSystemError, R>
): Effect.Effect<A, SyncError, R> {
  return Effect.mapError(
    effect,
    (error) =>
      new SyncError({
        message: error.message,
        cause: error
      })
  )
}

function toFsError(filePath: string) {
  return (error: BadArgument | SystemError): FileSystemError =>
    new FileSystemError({
      message: error.message,
      path:
        "pathOrDescriptor" in error && typeof error.pathOrDescriptor === "string"
          ? error.pathOrDescriptor
          : filePath,
      cause: error
    })
}

export class SyncGate extends Context.Service<
  SyncGate,
  {
    readonly sync: (
      options?: SyncGateOptions
    ) => Effect.Effect<SyncGateSummary, SyncError>
    readonly stream: (
      options?: SyncGateOptions
    ) => Stream.Stream<GateEvaluation, SyncError>
    /** Pure evaluate wrapper (no I/O) for callers that already have Policy. */
    readonly evaluate: (
      policy: Policy,
      context?: GateContext
    ) => Effect.Effect<GateEvaluation, never>
  }
>()("ghfs/services/SyncGate") {
  static readonly layer = Layer.effect(
    SyncGate,
    Effect.gen(function* () {
      // Local observe/evaluate only — no GitHubClient (no remote policy fetch).
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const policyCandidatePaths = (): Array<string> => [
        path.join(config.directory, POLICY_DIR_NAME, POLICY_FILE_NAME),
        path.join(config.directory, POLICY_FILE_NAME)
      ]

      const tryReadPolicyAt = (
        filePath: string
      ): Effect.Effect<Policy | null, SyncError> =>
        Effect.gen(function* () {
          const exists = yield* mapFs(
            fs.exists(filePath).pipe(Effect.mapError(toFsError(filePath)))
          )
          if (!exists) return null

          const raw = yield* mapFs(
            fs
              .readFileString(filePath)
              .pipe(Effect.mapError(toFsError(filePath)))
          )
          try {
            return decodePolicy(JSON.parse(raw))
          } catch (cause) {
            return yield* Effect.fail(
              new SyncError({
                message: `Failed to decode policy at ${filePath}`,
                cause
              })
            )
          }
        })

      const loadPolicy = (
        options?: SyncGateOptions
      ): Effect.Effect<Policy, SyncError> =>
        Effect.gen(function* () {
          if (options?.policy) return options.policy

          for (const candidate of policyCandidatePaths()) {
            const loaded = yield* tryReadPolicyAt(candidate)
            if (loaded) return loaded
          }

          if (options?.allowEmptyPolicy) return emptyPolicy()

          return yield* Effect.fail(
            new SyncError({
              message:
                `No Policy provided and none found at ${policyCandidatePaths().join(" or ")}`
            })
          )
        })

      const evaluate = (
        policy: Policy,
        context?: GateContext
      ): Effect.Effect<GateEvaluation, never> =>
        Effect.succeed(evaluateGate(policy, context ?? {}))

      const runEvaluate = (
        options?: SyncGateOptions
      ): Effect.Effect<{ policy: Policy; evaluation: GateEvaluation }, SyncError> =>
        Effect.gen(function* () {
          const policy = yield* loadPolicy(options)
          const evaluation = yield* evaluate(policy, options?.context)
          return { policy, evaluation }
        })

      const stream = (
        options?: SyncGateOptions
      ): Stream.Stream<GateEvaluation, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const { evaluation } = yield* runEvaluate(options)
            return Stream.succeed(evaluation)
          })
        )

      const sync = Effect.fn("SyncGate.sync")(function* (
        options?: SyncGateOptions
      ): Effect.fn.Return<SyncGateSummary, SyncError> {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing gate via lean local policy load + evaluateGate (JSON snapshot; remote policy OOS)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const gateDir = path.join(config.directory, GATE_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(gateDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(gateDir)))
          )

          const policyDir = path.join(config.directory, POLICY_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(policyDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(policyDir)))
          )

          const { policy, evaluation } = yield* runEvaluate(options)

          const evaluationPath = path.join(gateDir, GATE_EVALUATION_FILE_NAME)
          const policyPath = path.join(policyDir, POLICY_FILE_NAME)

          const evaluationEncoded = Schema.encodeSync(GateEvaluation)(evaluation)
          const evaluationBody = `${JSON.stringify(evaluationEncoded, null, 2)}\n`
          yield* mapFs(
            fs
              .writeFileString(evaluationPath, evaluationBody)
              .pipe(Effect.mapError(toFsError(evaluationPath)))
          )

          // NOTE: MirrorFs has no writeGate / writePolicy — FileSystem under
          // config.directory. Snapshot policy beside evaluation for observe.
          const policyEncoded = Schema.encodeSync(Policy)(policy)
          const policyBody = `${JSON.stringify(policyEncoded, null, 2)}\n`
          yield* mapFs(
            fs
              .writeFileString(policyPath, policyBody)
              .pipe(Effect.mapError(toFsError(policyPath)))
          )

          yield* Effect.logInfo("Gate evaluation synced", {
            synced: 1,
            passed: evaluation.passed,
            risk_level: evaluation.risk_level,
            warnings: evaluation.warnings.length,
            errors: evaluation.errors.length,
            evaluationPath,
            policyPath
          })

          return {
            synced: 1,
            evaluationPath,
            policyPath,
            passed: evaluation.passed,
            risk_level: evaluation.risk_level
          }
        })
      })

      return SyncGate.of({ sync, stream, evaluate })
    })
  )
}
