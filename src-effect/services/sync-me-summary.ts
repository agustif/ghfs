/**
 * Single-resource sync for "my items" observe summary →
 * me-summary/me-summary.json
 *
 * Copy to: src-effect/services/sync-me-summary.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchAuthenticatedUser — see sync-me-summary.md / snippet.
 * MirrorFs has no writeMeSummary yet → writes via FileSystem under config.directory.
 *
 * Schema models first; MirrorFs markdown from legacy renderMeSummary is
 * OUT OF SCOPE (JSON snapshot only this slice).
 *
 * Single-fetch style (match cue src/sync/me-summary.ts — local scan, not list API):
 *   fetchAuthenticatedUser() → login
 *   MirrorFs.readSyncState() → best-effort MeSummaryItemInput[]
 *   buildMeSummary → write JSON
 * No Stream.paginate. Optional Stream.succeed for a uniform stream() surface
 * (mirrors sync-deployments-summary / sync-activity-summary / sync-security-summary).
 *
 * IMPORTANT tip deviation: Effect SyncItemState is thinner than legacy
 * (no data.item.assignees / body / comments / title). Do NOT rewrite
 * SyncItemState / engines. Best-effort map leaves scan fields empty →
 * empty assigned/reviewRequested/mentions until richer MeSummaryItemInput
 * is available (CLI/tests can feed them into buildMeSummary directly).
 *
 * Pattern mirrors landed sync-deployments-summary Context.Service + Layer +
 * FileSystem snapshot (tip bbc013a / #222 SyncDeploymentsSummary).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type {
  AuthenticatedUserInput,
  GitHubError,
  MeSummaryItemInput,
  SyncState
} from "../domain"
import {
  buildMeSummary,
  FileSystemError,
  MeSummary,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const ME_SUMMARY_DIR_NAME = "me-summary"
const ME_SUMMARY_FILE_NAME = "me-summary.json"

/** Additive surface expected on GitHubClient (see sync-me-summary.md). */
type GitHubClientMeSummary = {
  readonly fetchAuthenticatedUser: () => Effect.Effect<
    AuthenticatedUserInput | null,
    GitHubError
  >
}

export interface SyncMeSummarySummary {
  readonly synced: number
  readonly path: string
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

function mapGitHub<A, R>(
  effect: Effect.Effect<A, GitHubError, R>
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

/**
 * Best-effort map from tip Effect SyncItemState → MeSummaryItemInput.
 * Tip SyncItemState has number/kind/state/lastUpdatedAt/filePath only —
 * no assignees, requestedReviewers, body, comments, or title. Leave those
 * empty so buildMeSummary yields empty lists (documented deviation).
 */
function itemsFromSyncState(
  state: SyncState | null
): Array<MeSummaryItemInput> {
  if (!state) return []
  return Object.values(state.items).map((item) => ({
    number: item.number,
    kind: item.kind,
    state: item.state,
    title: "",
    updatedAt: DateTime.formatIso(item.lastUpdatedAt),
    assignees: [],
    requestedReviewers: [],
    body: null,
    comments: []
  }))
}

/** Cue returns null on missing user / failure; keep observe sync resilient. */
function nullUserOnFailure(
  effect: Effect.Effect<AuthenticatedUserInput | null, SyncError>
): Effect.Effect<AuthenticatedUserInput | null, never> {
  return effect.pipe(
    Effect.catchAll(() => Effect.succeed(null as AuthenticatedUserInput | null))
  )
}

function nullStateOnFailure(
  effect: Effect.Effect<SyncState | null, SyncError>
): Effect.Effect<SyncState | null, never> {
  return effect.pipe(
    Effect.catchAll(() => Effect.succeed(null as SyncState | null))
  )
}

export class SyncMeSummary extends Context.Service<
  SyncMeSummary,
  {
    readonly sync: () => Effect.Effect<SyncMeSummarySummary, SyncError>
    readonly stream: () => Stream.Stream<MeSummary, SyncError>
  }
>()("ghfs/services/SyncMeSummary") {
  static readonly layer = Layer.effect(
    SyncMeSummary,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchAuthenticatedUser lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientMeSummary
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchSnapshot = (): Effect.Effect<MeSummary, SyncError> =>
        Effect.gen(function* () {
          const user = yield* nullUserOnFailure(
            mapGitHub(github.fetchAuthenticatedUser())
          )
          const state = yield* nullStateOnFailure(mapFs(mirror.readSyncState()))
          const now = yield* DateTime.now
          return buildMeSummary({
            items: itemsFromSyncState(state),
            currentUser: user?.login ?? null,
            syncedAt: DateTime.formatIso(now)
          })
        })

      const stream = (): Stream.Stream<MeSummary, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const summary = yield* fetchSnapshot()
            return Stream.succeed(summary)
          })
        )

      const sync = Effect.fn("SyncMeSummary.sync")(function* (): Effect.fn.Return<
        SyncMeSummarySummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing me-summary via fetchAuthenticatedUser + local SyncState scan (best-effort lean fields)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const summaryDir = path.join(config.directory, ME_SUMMARY_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(summaryDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(summaryDir)))
          )

          const summary = yield* fetchSnapshot()

          const filePath = path.join(summaryDir, ME_SUMMARY_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; no SyncItem data dumps)
          const encoded = Schema.encodeSync(MeSummary)(summary)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeMeSummary — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeMeSummary(summary) → me-summary/me-summary.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Me summary synced", {
            synced: 1,
            assigned: summary.assigned.length,
            reviewRequested: summary.reviewRequested.length,
            mentions: summary.mentions.length,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncMeSummary.of({ sync, stream })
    })
  )
}
