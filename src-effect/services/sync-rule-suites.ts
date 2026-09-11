/**
 * Single-fetch sync for GitHub rule-suite insights → rule-suites/rule-suites.json
 *
 * Copy to: src-effect/services/sync-rule-suites.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchRuleSuites — see sync-rule-suites.md / snippet.
 * MirrorFs has no writeRuleSuites yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/rulesets/rule-suites?per_page= (default limit 30)
 *
 * Schema models first; MirrorFs markdown + actions-snapshot wrapper
 * ({ repo, synced_at, count, rule_suites }) are OUT OF SCOPE (lean array only).
 * Get-one rule_evaluations detail OOS.
 *
 * Single-fetch with limit (legacy writeRuleSuitesFile cue `{ limit: 30 }`).
 * API *is* paginated, but this observe slice caps at one page of 30 like legacy —
 * no Stream.paginate. Optional Stream.fromIterable for a uniform stream() surface
 * (mirrors sync-autolinks). Pattern mirrors landed sync-autolinks / sync-codeowners
 * Context.Service + Layer + FileSystem snapshot (tip 1c6a73c / #224 autolinks).
 */
import { Context, DateTime, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, RuleSuite, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const RULE_SUITES_DIR_NAME = "rule-suites"
const RULE_SUITES_FILE_NAME = "rule-suites.json"
/** Match legacy writeRuleSuitesFile `fetchRuleSuites({ limit: 30 })` + API default per_page. */
const DEFAULT_LIMIT = 30

/** Additive surface expected on GitHubClient (see sync-rule-suites.md). */
type GitHubClientRuleSuites = {
  readonly fetchRuleSuites: (params?: {
    readonly limit?: number
  }) => Effect.Effect<Array<RuleSuite>, GitHubError>
}

export interface SyncRuleSuitesSummary {
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

function compareRuleSuites(a: RuleSuite, b: RuleSuite): number {
  // Newest push first, then stable id
  const byPushed = DateTime.formatIso(b.pushedAt).localeCompare(
    DateTime.formatIso(a.pushedAt)
  )
  return byPushed !== 0 ? byPushed : a.id - b.id
}

export class SyncRuleSuites extends Context.Service<
  SyncRuleSuites,
  {
    readonly sync: () => Effect.Effect<SyncRuleSuitesSummary, SyncError>
    readonly stream: () => Stream.Stream<RuleSuite, SyncError>
  }
>()("ghfs/services/SyncRuleSuites") {
  static readonly layer = Layer.effect(
    SyncRuleSuites,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchRuleSuites lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientRuleSuites
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchAll = (): Effect.Effect<Array<RuleSuite>, SyncError> =>
        mapGitHub(github.fetchRuleSuites({ limit: DEFAULT_LIMIT }))

      const stream = (): Stream.Stream<RuleSuite, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const rows = yield* fetchAll()
            return Stream.fromIterable(rows)
          })
        )

      const sync = Effect.fn("SyncRuleSuites.sync")(function* (): Effect.fn.Return<
        SyncRuleSuitesSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing rule suites via single-fetch limit=30")
          yield* mapFs(mirror.ensureDirectory())

          const ruleSuitesDir = path.join(config.directory, RULE_SUITES_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(ruleSuitesDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(ruleSuitesDir)))
          )

          const collected = yield* fetchAll()
          collected.sort(compareRuleSuites)

          const filePath = path.join(ruleSuitesDir, RULE_SUITES_FILE_NAME)
          // Schema-first encode (wrapper / MirrorFs markdown OOS)
          const encoded = Schema.encodeSync(Schema.Array(RuleSuite))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeRuleSuites — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeRuleSuites(suites) → rule-suites/rule-suites.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Rule suites synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncRuleSuites.of({ sync, stream })
    })
  )
}
