/**
 * Single-resource sync for default-branch protection → rulesets/rulesets.json
 *
 * Copy to: src-effect/services/sync-rulesets.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires tip GitHubClient.fetchRepo + additive fetchBranchProtection —
 * see sync-rulesets.md / snippet.
 * MirrorFs has no writeRulesets yet → writes via FileSystem under config.directory.
 *
 * Cue: src/sync/enhanced-snapshot.ts writeRulesetsFile →
 * fetchRepository.default_branch → fetchBranchProtection → rulesets/rulesets.json.
 * Skip write when protection is null (same as latest-pages-build null skip).
 *
 * DISTINCT from SyncRuleSuites (rule-suites/rule-suites.json evaluation list).
 * Legacy `{ synced_at, default_branch, protection }` wrapper OOS — lean
 * BranchProtection only (`pattern` = branch).
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed /
 * Stream.empty (mirrors sync-latest-pages-build).
 * Pattern mirrors landed sync-latest-pages-build / sync-feeds (tip 5b706b2 / #242).
 * Do NOT rewrite SyncRuleSuites / SyncFeeds / SyncActivityEvents.
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import {
  BranchProtection,
  FileSystemError,
  Repo,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue RULESETS_DIR_NAME / RULESETS_FILE_NAME under config.directory. */
const RULESETS_DIR_NAME = "rulesets"
const RULESETS_FILE_NAME = "rulesets.json"

/** Tip fetchRepo + additive fetchBranchProtection. */
type GitHubClientRulesets = {
  readonly fetchRepo: () => Effect.Effect<Repo, GitHubError>
  readonly fetchBranchProtection: (
    branch: string
  ) => Effect.Effect<BranchProtection | null, GitHubError>
}

export interface SyncRulesetsSummary {
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

export class SyncRulesets extends Context.Service<
  SyncRulesets,
  {
    readonly sync: () => Effect.Effect<SyncRulesetsSummary, SyncError>
    readonly stream: () => Stream.Stream<BranchProtection, SyncError>
  }
>()("ghfs/services/SyncRulesets") {
  static readonly layer = Layer.effect(
    SyncRulesets,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchBranchProtection lands (snippet only).
      const github = githubBase as unknown as GitHubClientRulesets
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchProtection = (): Effect.Effect<
        BranchProtection | null,
        SyncError
      > =>
        Effect.gen(function* () {
          const repo = yield* mapGitHub(github.fetchRepo())
          return yield* mapGitHub(
            github.fetchBranchProtection(repo.defaultBranch)
          )
        })

      const stream = (): Stream.Stream<BranchProtection, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const protection = yield* fetchProtection()
            return protection === null
              ? Stream.empty
              : Stream.succeed(protection)
          })
        )

      const sync = Effect.fn("SyncRulesets.sync")(function* (): Effect.fn.Return<
        SyncRulesetsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing default-branch protection via single-resource fetch"
          )
          yield* mapFs(mirror.ensureDirectory())

          const rulesetsDir = path.join(config.directory, RULESETS_DIR_NAME)
          const filePath = path.join(rulesetsDir, RULESETS_FILE_NAME)

          const protection = yield* fetchProtection()

          // Cue writeRulesetsFile: skip write entirely when fetch returns null
          if (protection === null) {
            yield* Effect.logInfo(
              "No branch protection; skipping rulesets write",
              { synced: 0, path: filePath }
            )
            return { synced: 0, path: filePath }
          }

          yield* mapFs(
            fs
              .makeDirectory(rulesetsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(rulesetsDir)))
          )

          // Schema-first lean BranchProtection (synced_at / default_branch wrapper OOS)
          const encoded = Schema.encodeSync(BranchProtection)(protection)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeRulesets — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeRulesets(protection) → rulesets/rulesets.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Branch protection (rulesets) synced", {
            synced: 1,
            pattern: protection.pattern,
            enforceAdmins: protection.enforceAdmins,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncRulesets.of({ sync, stream })
    })
  )
}
