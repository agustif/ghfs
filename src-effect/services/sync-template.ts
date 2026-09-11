/**
 * Single-resource sync for repo template flags → template.json
 *
 * Copy to: src-effect/services/sync-template.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchTemplateInfo — see sync-template.md / snippet.
 * MirrorFs has no writeTemplateInfo yet → writes via FileSystem under config.directory.
 *
 * Cue: src/sync/extended-metadata.ts writeTemplateInfo → REPO_TEMPLATE_FILE_NAME
 * (`template.json` at mirror root). Lean object only (no wrapper).
 *
 * Single-resource fetch — no Stream.paginate. Optional Stream.succeed for a
 * uniform stream() surface (mirrors sync-viewer-status / sync-interaction-limits).
 * Pattern mirrors landed sync-viewer-status (tip 6a71e55 / #237).
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, TemplateInfo } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue REPO_TEMPLATE_FILE_NAME at mirror root. */
const TEMPLATE_FILE_NAME = "template.json"

/** Additive surface expected on GitHubClient (see sync-template.md). */
type GitHubClientTemplateInfo = {
  readonly fetchTemplateInfo: () => Effect.Effect<TemplateInfo, GitHubError>
}

export interface SyncTemplateSummary {
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

export class SyncTemplate extends Context.Service<
  SyncTemplate,
  {
    readonly sync: () => Effect.Effect<SyncTemplateSummary, SyncError>
    readonly stream: () => Stream.Stream<TemplateInfo, SyncError>
  }
>()("ghfs/services/SyncTemplate") {
  static readonly layer = Layer.effect(
    SyncTemplate,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchTemplateInfo lands on healed github-client (snippet only).
      const github = githubBase as unknown as GitHubClientTemplateInfo
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchInfo = (): Effect.Effect<TemplateInfo, SyncError> =>
        mapGitHub(github.fetchTemplateInfo())

      const stream = (): Stream.Stream<TemplateInfo, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const info = yield* fetchInfo()
            return Stream.succeed(info)
          })
        )

      const sync = Effect.fn("SyncTemplate.sync")(function* (): Effect.fn.Return<
        SyncTemplateSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing template info via single-resource fetch")
          yield* mapFs(mirror.ensureDirectory())

          const info = yield* fetchInfo()

          const filePath = path.join(config.directory, TEMPLATE_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; cue root template.json)
          const encoded = Schema.encodeSync(TemplateInfo)(info)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeTemplateInfo — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeTemplateInfo(info) → template.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Template info synced", {
            synced: 1,
            isTemplate: info.isTemplate,
            templateRepository: info.templateRepository,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncTemplate.of({ sync, stream })
    })
  )
}
