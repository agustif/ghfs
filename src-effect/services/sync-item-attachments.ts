/**
 * Thin SyncItemAttachments orchestrator — item-scoped SyncComments + SyncTimeline.
 *
 * Copy to: src-effect/services/sync-item-attachments.ts
 * Wire: export from services/index; AppLayer SyncItemAttachments.layer; CLI snippet.
 *
 * WHY: SyncComments / SyncTimeline already landed but require `{ kind, number }` subject.
 * SyncSatellites (#218) correctly omitted them. Natural hook without rewriting the
 * SyncEngine loop: AFTER SyncEngineStreaming.sync writes SyncState, this orchestrator
 * reads MirrorFs.readSyncState() and for each tracked item calls comments/timeline sync.
 *
 * Does NOT rewrite sync-engine / sync-engine-streaming / sync-satellites / sync-comments /
 * sync-timeline / mirror-fs / github-client / config / closed heal bodies.
 *
 * Tip: a41dbca
 */
import { Context, Effect, Layer, Result } from "effect"
import type { FileSystemError, SyncItemState } from "../domain"
import { SyncError } from "../domain"
import { GhfsConfig } from "./config"

export interface SyncItemAttachmentResult {
  readonly kind: "issue" | "pull"
  readonly number: number
  readonly commentsSynced?: number
  readonly timelineSynced?: number
  readonly error?: string
}

export interface SyncItemAttachmentsSummary {
  readonly items: number
  readonly commentsSynced: number
  readonly timelineSynced: number
  readonly errors: number
  readonly results: ReadonlyArray<SyncItemAttachmentResult>
}

export type SyncItemAttachmentsOptions = {
  readonly comments?: boolean
  readonly timeline?: boolean
  readonly maxItems?: number
}

/**
 * Optional item-attachment flags — NOT on Effect GhfsConfig @ tip a41dbca
 * (only syncIssues / syncPulls / syncClosed / syncPatches exist).
 * When additive config lands, cast/read these keys; until then defaults apply (both on).
 *
 * Call-site `options.comments` / `options.timeline` override config when provided.
 */
export type ItemAttachmentConfigFlags = {
  readonly syncComments?: boolean
  readonly syncTimeline?: boolean
}

const LEGACY_DEFAULTS: Readonly<
  Record<keyof ItemAttachmentConfigFlags, boolean>
> = {
  syncComments: true,
  syncTimeline: true
}

/** Gate: options override → config flag when present → legacy default (both on). */
export function isItemAttachmentEnabled(
  config: object,
  key: keyof ItemAttachmentConfigFlags,
  optionOverride?: boolean
): boolean {
  if (typeof optionOverride === "boolean") {
    return optionOverride
  }
  const flags = config as ItemAttachmentConfigFlags
  const value = flags[key]
  if (typeof value === "boolean") {
    return value
  }
  return LEGACY_DEFAULTS[key]
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

export type ItemAttachmentSubject = {
  readonly kind: "issue" | "pull"
  readonly number: number
}

export type ItemAttachmentStageFns = {
  readonly syncComments: (
    subject: ItemAttachmentSubject
  ) => Effect.Effect<{ readonly synced: number }, SyncError>
  readonly syncTimeline: (
    subject: ItemAttachmentSubject
  ) => Effect.Effect<{ readonly synced: number }, SyncError>
}

export type ItemAttachmentRunOptions = {
  readonly comments: boolean
  readonly timeline: boolean
  readonly maxItems?: number
}

/**
 * Sequential per-item runner — log + fold errors so one item (or stage) failure
 * does not abort the rest. Exported for unit tests (stub items / stub sync fns,
 * no live GitHub).
 *
 * Tip Effect has no Effect.either — use Effect.result (Result) for isolation
 * (same pattern as SyncSatellites.runSatelliteStages).
 */
export function runItemAttachmentStages(
  items: ReadonlyArray<ItemAttachmentSubject>,
  stages: ItemAttachmentStageFns,
  options: ItemAttachmentRunOptions
): Effect.Effect<SyncItemAttachmentsSummary> {
  return Effect.gen(function* () {
    const capped =
      typeof options.maxItems === "number" && options.maxItems >= 0
        ? items.slice(0, options.maxItems)
        : items

    const results: Array<SyncItemAttachmentResult> = []
    let commentsSynced = 0
    let timelineSynced = 0
    let errors = 0

    for (const subject of capped) {
      yield* Effect.logInfo("Running item attachment stages", {
        kind: subject.kind,
        number: subject.number,
        comments: options.comments,
        timeline: options.timeline
      })

      let itemComments: number | undefined
      let itemTimeline: number | undefined
      const itemErrors: Array<string> = []

      if (options.comments) {
        const outcome = yield* Effect.result(stages.syncComments(subject))
        if (Result.isFailure(outcome)) {
          const message = outcome.failure.message
          yield* Effect.logError(`Item comments sync failed`, {
            kind: subject.kind,
            number: subject.number,
            message
          })
          itemErrors.push(`comments: ${message}`)
        } else {
          itemComments = outcome.success.synced
          commentsSynced += outcome.success.synced
        }
      }

      if (options.timeline) {
        const outcome = yield* Effect.result(stages.syncTimeline(subject))
        if (Result.isFailure(outcome)) {
          const message = outcome.failure.message
          yield* Effect.logError(`Item timeline sync failed`, {
            kind: subject.kind,
            number: subject.number,
            message
          })
          itemErrors.push(`timeline: ${message}`)
        } else {
          itemTimeline = outcome.success.synced
          timelineSynced += outcome.success.synced
        }
      }

      if (itemErrors.length > 0) {
        errors++
      }

      const row: SyncItemAttachmentResult = {
        kind: subject.kind,
        number: subject.number,
        ...(itemComments !== undefined ? { commentsSynced: itemComments } : {}),
        ...(itemTimeline !== undefined ? { timelineSynced: itemTimeline } : {}),
        ...(itemErrors.length > 0 ? { error: itemErrors.join("; ") } : {})
      }
      results.push(row)
    }

    const out: SyncItemAttachmentsSummary = {
      items: capped.length,
      commentsSynced,
      timelineSynced,
      errors,
      results
    }

    yield* Effect.logInfo("Item attachment sync complete", {
      items: out.items,
      commentsSynced: out.commentsSynced,
      timelineSynced: out.timelineSynced,
      errors: out.errors
    })

    return out
  })
}

function toSubjects(
  items: ReadonlyArray<SyncItemState>
): Array<ItemAttachmentSubject> {
  return items.map((item) => ({
    kind: item.kind,
    number: item.number
  }))
}

const EMPTY_SUMMARY: SyncItemAttachmentsSummary = {
  items: 0,
  commentsSynced: 0,
  timelineSynced: 0,
  errors: 0,
  results: []
}

export class SyncItemAttachments extends Context.Service<
  SyncItemAttachments,
  {
    readonly sync: (
      options?: SyncItemAttachmentsOptions
    ) => Effect.Effect<SyncItemAttachmentsSummary, SyncError>
  }
>()("ghfs/services/SyncItemAttachments") {
  static readonly layer = Layer.effect(
    SyncItemAttachments,
    Effect.gen(function* () {
      // Dynamic imports keep unit-test import of pure helpers free of @effect/platform
      // (same pattern as SyncSatellites — avoids effect/Either resolution under vitest).
      const {
        MirrorFs,
        SyncComments,
        SyncTimeline
      } = yield* Effect.promise(() =>
        Promise.all([
          import("./mirror-fs"),
          import("./sync-comments"),
          import("./sync-timeline")
        ]).then(([mirrorMod, commentsMod, timelineMod]) => ({
          MirrorFs: mirrorMod.MirrorFs,
          SyncComments: commentsMod.SyncComments,
          SyncTimeline: timelineMod.SyncTimeline
        }))
      )

      const mirror = yield* MirrorFs
      const comments = yield* SyncComments
      const timeline = yield* SyncTimeline
      const config = yield* GhfsConfig

      const sync = Effect.fn("SyncItemAttachments.sync")(function* (
        options?: SyncItemAttachmentsOptions
      ): Effect.fn.Return<SyncItemAttachmentsSummary, SyncError> {
        const enableComments = isItemAttachmentEnabled(
          config,
          "syncComments",
          options?.comments
        )
        const enableTimeline = isItemAttachmentEnabled(
          config,
          "syncTimeline",
          options?.timeline
        )

        const state = yield* mapFs(mirror.readSyncState())
        if (state === null) {
          yield* Effect.logInfo(
            "No SyncState yet — skipping item attachment sync"
          )
          return EMPTY_SUMMARY
        }

        const subjects = toSubjects(Object.values(state.items))

        // SyncError is absorbed per-stage via Effect.result — surface never fails
        // the batch after SyncState is read. Typed SyncError for sibling consistency.
        return yield* runItemAttachmentStages(
          subjects,
          {
            syncComments: (subject) => comments.sync(subject),
            syncTimeline: (subject) => timeline.sync(subject)
          },
          {
            comments: enableComments,
            timeline: enableTimeline,
            maxItems: options?.maxItems
          }
        )
      })

      return SyncItemAttachments.of({ sync })
    })
  )
}
