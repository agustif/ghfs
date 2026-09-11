/**
 * Single-file sync for GitHub CODEOWNERS → codeowners/codeowners.json
 *
 * Copy to: src-effect/services/sync-codeowners.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchCodeowners — see sync-codeowners.md / snippet.
 * MirrorFs has no writeCodeowners yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/contents/{CODEOWNERS|.github/CODEOWNERS|docs/CODEOWNERS}
 *
 * Schema models first; meta/codeowners.md MirrorFs markdown from legacy
 * sync-codeowners.ts is OUT OF SCOPE (JSON snapshot only this slice).
 *
 * Single-file fetch/parse — no Stream.paginate required; optional
 * Stream.fromIterable over rules for a uniform stream() surface.
 * Pattern mirrors landed sync-collaborators Context.Service + Layer + FileSystem
 * snapshot (tip 3aa7514 / #210 collaborators).
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import {
  CodeownersFile,
  CodeownersRule,
  FileSystemError,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const CODEOWNERS_DIR_NAME = "codeowners"
const CODEOWNERS_FILE_NAME = "codeowners.json"

export interface SyncCodeownersSummary {
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

export class SyncCodeowners extends Context.Service<
  SyncCodeowners,
  {
    readonly sync: () => Effect.Effect<SyncCodeownersSummary, SyncError>
    readonly stream: () => Stream.Stream<CodeownersRule, SyncError>
  }
>()("ghfs/services/SyncCodeowners") {
  static readonly layer = Layer.effect(
    SyncCodeowners,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchFile = (): Effect.Effect<CodeownersFile, SyncError> =>
        Effect.gen(function* () {
          const fetched = yield* mapGitHub(github.fetchCodeowners())
          return (
            fetched ??
            new CodeownersFile({
              rules: [],
              raw: null
            })
          )
        })

      const stream = (): Stream.Stream<CodeownersRule, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const file = yield* fetchFile()
            return Stream.fromIterable(file.rules)
          })
        )

      const sync = Effect.fn("SyncCodeowners.sync")(function* (): Effect.fn.Return<
        SyncCodeownersSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing CODEOWNERS via single-file Contents fetch")
          yield* mapFs(mirror.ensureDirectory())

          const codeownersDir = path.join(config.directory, CODEOWNERS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(codeownersDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(codeownersDir)))
          )

          const file = yield* fetchFile()

          const filePath = path.join(codeownersDir, CODEOWNERS_FILE_NAME)
          // Schema-first encode (meta/codeowners.md MirrorFs markdown OOS)
          const encoded = Schema.encodeSync(CodeownersFile)(file)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeCodeowners — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeCodeowners(file) → codeowners/codeowners.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("CODEOWNERS synced", {
            synced: file.rules.length,
            sourcePath: file.path ?? null,
            path: filePath
          })

          return { synced: file.rules.length, path: filePath }
        })
      })

      return SyncCodeowners.of({ sync, stream })
    })
  )
}
