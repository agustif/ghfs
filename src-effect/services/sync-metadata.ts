/**
 * Single-resource sync for GitHub repo metadata → metadata/metadata.json
 *
 * Copy to: src-effect/services/sync-metadata.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchRepository (+ optional fetchSecurityAdvisories)
 * — see sync-metadata.md / snippet.
 * MirrorFs has no writeRepoMetadata yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo} (+ GET …/security-advisories)
 *
 * Schema models first; MirrorFs markdown from legacy sync-metadata.ts
 * is OUT OF SCOPE (JSON snapshot only this slice).
 *
 * Single-resource fetch — no Stream.paginate (repo core is one REST object).
 * Optional Stream.succeed for a uniform stream() surface (mirrors
 * sync-interaction-limits / sync-codeowners).
 * Does NOT re-fetch labels / milestones / CODEOWNERS content (SyncLabels /
 * SyncMilestones / SyncCodeowners own those). Optional advisories nested on
 * the snapshot when non-empty.
 *
 * Pattern mirrors landed sync-interaction-limits Context.Service + Layer +
 * FileSystem snapshot (tip 581865f / #216 interaction-limits).
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import {
  FileSystemError,
  RepoMetadata,
  RepoSecurityAdvisory,
  SyncError
} from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const METADATA_DIR_NAME = "metadata"
const METADATA_FILE_NAME = "metadata.json"

export interface SyncMetadataSummary {
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

function withSecurityAdvisories(
  repo: RepoMetadata,
  advisories: Array<RepoSecurityAdvisory>
): RepoMetadata {
  if (advisories.length === 0) return repo
  const encoded = {
    ...Schema.encodeSync(RepoMetadata)(repo),
    securityAdvisories: Schema.encodeSync(Schema.Array(RepoSecurityAdvisory))(
      advisories
    )
  }
  return Schema.decodeUnknownSync(RepoMetadata)(encoded)
}

export class SyncMetadata extends Context.Service<
  SyncMetadata,
  {
    readonly sync: () => Effect.Effect<SyncMetadataSummary, SyncError>
    readonly stream: () => Stream.Stream<RepoMetadata, SyncError>
  }
>()("ghfs/services/SyncMetadata") {
  static readonly layer = Layer.effect(
    SyncMetadata,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const fetchSnapshot = (): Effect.Effect<RepoMetadata, SyncError> =>
        Effect.gen(function* () {
          const repo = yield* mapGitHub(github.fetchRepository())
          const advisories = yield* mapGitHub(github.fetchSecurityAdvisories())
          return withSecurityAdvisories(repo, advisories)
        })

      const stream = (): Stream.Stream<RepoMetadata, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const metadata = yield* fetchSnapshot()
            return Stream.succeed(metadata)
          })
        )

      const sync = Effect.fn("SyncMetadata.sync")(function* (): Effect.fn.Return<
        SyncMetadataSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing repo metadata via single-resource fetch (+ optional advisories)"
          )
          yield* mapFs(mirror.ensureDirectory())

          const metadataDir = path.join(config.directory, METADATA_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(metadataDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(metadataDir)))
          )

          const metadata = yield* fetchSnapshot()

          const filePath = path.join(metadataDir, METADATA_FILE_NAME)
          // Schema-first encode (MirrorFs markdown OOS; no labels/milestones arrays)
          const encoded = Schema.encodeSync(RepoMetadata)(metadata)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeRepoMetadata — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeRepoMetadata(metadata) → metadata/metadata.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Repo metadata synced", {
            synced: 1,
            fullName: metadata.fullName,
            advisories: metadata.securityAdvisories?.length ?? 0,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncMetadata.of({ sync, stream })
    })
  )
}
