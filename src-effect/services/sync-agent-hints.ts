/**
 * Single-resource sync for lean agent-hints observe snapshot →
 * agent-hints/agent-hints.json
 *
 * Copy to: src-effect/services/sync-agent-hints.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Reuses tip GitHubClient.fetchRepository + fetchReleases; requires additive
 * fetchRepositoryTopics + fetchPinnedIssues — see sync-agent-hints.md / snippet.
 * MirrorFs has no writeAgentHints yet → writes via FileSystem under config.directory.
 *
 * Schema models first; MirrorFs markdown from legacy renderAgentHints /
 * generateAgentHints / agent-hints.md is OUT OF SCOPE (JSON snapshot only).
 *
 * Multi-source single-resource style (match cue src/sync/agent-hints.ts):
 *   fetchRepository() → description / features / openIssuesCount (+ topics fallback)
 *   fetchRepositoryTopics() → topics[] (prefer; 404/fail → [])
 *   fetchPinnedIssues() → pinnedIssueNumbers (GraphQL; fail → [])
 *   fetchReleases({ perPage: 5 }) → recentReleaseTags (tagName only)
 *   MirrorFs.readSyncState() → totalIssues / totalPulls by kind
 *   buildAgentHints → write JSON
 * No Stream.paginate. Optional Stream.succeed for a uniform stream() surface
 * (mirrors sync-status / sync-me-summary / sync-activity-summary).
 *
 * Do NOT rewrite SyncSatellites / RepoMetadata / SyncReleases bodies.
 * Pattern mirrors landed sync-status / sync-me-summary Context.Service + Layer
 * + FileSystem snapshot (tip 185725d / #231 status).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError, Release, RepoMetadata, SyncState } from "../domain"
import {
  buildAgentHints,
  AgentHints,
  FileSystemError,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const AGENT_HINTS_DIR_NAME = "agent-hints"
const AGENT_HINTS_FILE_NAME = "agent-hints.json"
/** Match cue buildAgentHints fetchReleases?.(5). */
const RECENT_RELEASES_LIMIT = 5

/**
 * Additive + reused surface expected on GitHubClient
 * (see sync-agent-hints.md / snippet).
 */
type GitHubClientAgentHints = {
  readonly fetchRepository: () => Effect.Effect<RepoMetadata, GitHubError>
  readonly fetchRepositoryTopics: () => Effect.Effect<
    Array<string>,
    GitHubError
  >
  readonly fetchPinnedIssues: () => Effect.Effect<Array<number>, GitHubError>
  readonly fetchReleases: (params?: {
    readonly page?: number
    readonly perPage?: number
  }) => Effect.Effect<Array<Release>, GitHubError>
}

export interface SyncAgentHintsSummary {
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

/** Cue optional fetches catch → empty; keep summary resilient. */
function emptyStringsOnFailure(
  effect: Effect.Effect<Array<string>, SyncError>
): Effect.Effect<Array<string>, never> {
  return effect.pipe(Effect.catchAll(() => Effect.succeed([] as Array<string>)))
}

function emptyNumbersOnFailure(
  effect: Effect.Effect<Array<number>, SyncError>
): Effect.Effect<Array<number>, never> {
  return effect.pipe(Effect.catchAll(() => Effect.succeed([] as Array<number>)))
}

function emptyReleasesOnFailure(
  effect: Effect.Effect<Array<Release>, SyncError>
): Effect.Effect<Array<Release>, never> {
  return effect.pipe(Effect.catchAll(() => Effect.succeed([] as Array<Release>)))
}

function nullStateOnFailure(
  effect: Effect.Effect<SyncState | null, SyncError>
): Effect.Effect<SyncState | null, never> {
  return effect.pipe(
    Effect.catchAll(() => Effect.succeed(null as SyncState | null))
  )
}

/**
 * Tip SyncState counts by kind (match sync-repository totals /
 * generateAgentHints context.totalIssues/totalPulls).
 * Deviation from buggy buildAgentHints open+closed length (documented).
 */
function countsFromSyncState(state: SyncState | null): {
  readonly totalIssues: number
  readonly totalPulls: number
} {
  if (!state) return { totalIssues: 0, totalPulls: 0 }
  let totalIssues = 0
  let totalPulls = 0
  for (const item of Object.values(state.items)) {
    if (item.kind === "issue") totalIssues += 1
    else if (item.kind === "pull") totalPulls += 1
  }
  return { totalIssues, totalPulls }
}

export class SyncAgentHints extends Context.Service<
  SyncAgentHints,
  {
    readonly sync: () => Effect.Effect<SyncAgentHintsSummary, SyncError>
    readonly stream: () => Stream.Stream<AgentHints, SyncError>
  }
>()("ghfs/services/SyncAgentHints") {
  static readonly layer = Layer.effect(
    SyncAgentHints,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchRepositoryTopics / fetchPinnedIssues land on
      // healed github-client (snippet only). Reuses tip fetchRepository /
      // fetchReleases already on tip @ 185725d.
      const github = githubBase as unknown as GitHubClientAgentHints
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchSnapshot = (): Effect.Effect<AgentHints, SyncError> =>
        Effect.gen(function* () {
          const repo = yield* mapGitHub(github.fetchRepository())

          const topicsFromApi = yield* emptyStringsOnFailure(
            mapGitHub(github.fetchRepositoryTopics())
          )
          const topics =
            topicsFromApi.length > 0 ? topicsFromApi : [...repo.topics]

          const pinnedIssueNumbers = yield* emptyNumbersOnFailure(
            mapGitHub(github.fetchPinnedIssues())
          )

          const releases = yield* emptyReleasesOnFailure(
            mapGitHub(
              github.fetchReleases({
                page: 1,
                perPage: RECENT_RELEASES_LIMIT
              })
            )
          )
          const recentReleaseTags = releases
            .slice(0, RECENT_RELEASES_LIMIT)
            .map((release) => release.tagName)

          const state = yield* nullStateOnFailure(mapFs(mirror.readSyncState()))
          const { totalIssues, totalPulls } = countsFromSyncState(state)

          const now = yield* DateTime.now

          return buildAgentHints({
            description: repo.description,
            features: {
              issues: repo.hasIssues,
              projects: repo.hasProjects,
              wiki: repo.hasWiki,
              mergeQueue: repo.mergeQueueEnabled ?? false
            },
            topics,
            pinnedIssueNumbers,
            recentReleaseTags,
            totalIssues,
            totalPulls,
            openIssuesCount: repo.openIssuesCount,
            syncedAt: DateTime.formatIso(now)
          })
        })

      const stream = (): Stream.Stream<AgentHints, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const hints = yield* fetchSnapshot()
            return Stream.succeed(hints)
          })
        )

      const sync = Effect.fn("SyncAgentHints.sync")(function* (): Effect.fn.Return<
        SyncAgentHintsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing agent-hints via lean repo/topics/pinned/releases(5) + SyncState counts (JSON snapshot; markdown OOS)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const hintsDir = path.join(config.directory, AGENT_HINTS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(hintsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(hintsDir)))
          )

          const hints = yield* fetchSnapshot()

          const filePath = path.join(hintsDir, AGENT_HINTS_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; no ProviderRepository dump)
          const encoded = Schema.encodeSync(AgentHints)(hints)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeAgentHints — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeAgentHints(hints) → agent-hints/agent-hints.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Agent hints synced", {
            synced: 1,
            topics: hints.topics.length,
            pinned: hints.pinnedIssueNumbers.length,
            releases: hints.recentReleaseTags.length,
            totalIssues: hints.totalIssues,
            totalPulls: hints.totalPulls,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncAgentHints.of({ sync, stream })
    })
  )
}
