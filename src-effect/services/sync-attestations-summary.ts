/**
 * Stream.paginate count-only sync for attestations →
 * security/attestations-summary.json
 *
 * Copy to: src-effect/services/sync-attestations-summary.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchAttestations — see sync-attestations-summary.md / snippet.
 * MirrorFs has no writeAttestationsSummary yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/attestations?page=&per_page=
 * Count list rows only — do NOT persist attestation bodies.
 * 403/404 → { totalCount: 0 } (empty pages from client catchIf).
 *
 * Cue: src/sync/write-dependency-intelligence.ts → security/attestations-summary.json.
 * This slice: lean JSON **object** `{ totalCount }` only.
 *
 * Paginated list for counting — Stream.paginate (mirrors sync-tags). Always write.
 * Distinct from SyncSbomSummary / SyncSecuritySummary. Pattern mirrors landed
 * sync-sbom-summary (tip 82015a0 / #258) for path/docs; pagination for count.
 * Do NOT rewrite SyncSbomSummary / SyncSecuritySummary / SyncSatellites bodies.
 *
 * Dep-graph / dep-reviews / full Dependabot alerts stay OOS.
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { AttestationsSummary, FileSystemError, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

/** Match cue security/attestations-summary.json under config.directory. */
const SECURITY_DIR_NAME = "security"
const ATTESTATIONS_SUMMARY_FILE_NAME = "attestations-summary.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

/**
 * Opaque page rows — bodies discarded; only length is used.
 * Additive surface expected on GitHubClient (see sync-attestations-summary.md).
 */
type GitHubClientAttestations = {
  readonly fetchAttestations: (params?: {
    readonly page?: number
    readonly perPage?: number
  }) => Effect.Effect<ReadonlyArray<unknown>, GitHubError>
}

export interface SyncAttestationsSummarySummary {
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

export class SyncAttestationsSummary extends Context.Service<
  SyncAttestationsSummary,
  {
    readonly sync: () => Effect.Effect<SyncAttestationsSummarySummary, SyncError>
    readonly stream: () => Stream.Stream<AttestationsSummary, SyncError>
  }
>()("ghfs/services/SyncAttestationsSummary") {
  static readonly layer = Layer.effect(
    SyncAttestationsSummary,
    Effect.gen(function* () {
      const githubBase = yield* GitHubClient
      // Cast until additive fetchAttestations lands (snippet only).
      const github = githubBase as unknown as GitHubClientAttestations
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const countAll = (): Effect.Effect<number, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const rows = yield* mapGitHub(
              github.fetchAttestations({
                page: state.page,
                perPage: PER_PAGE
              })
            )

            if (rows.length === 0) {
              return [0, Option.none()] as const
            }

            const next =
              rows.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [rows.length, next] as const
          })
        ).pipe(Stream.runFold(0, (acc, n) => acc + n))

      const stream = (): Stream.Stream<AttestationsSummary, SyncError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const totalCount = yield* countAll()
            return Stream.succeed(new AttestationsSummary({ totalCount }))
          })
        )

      const sync = Effect.fn("SyncAttestationsSummary.sync")(function* (): Effect.fn.Return<
        SyncAttestationsSummarySummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo(
            "Syncing attestations summary via Stream.paginate count-only"
          )
          yield* mapFs(mirror.ensureDirectory())

          const dir = path.join(config.directory, SECURITY_DIR_NAME)
          const filePath = path.join(dir, ATTESTATIONS_SUMMARY_FILE_NAME)

          const totalCount = yield* countAll()
          const summary = new AttestationsSummary({ totalCount })

          yield* mapFs(
            fs
              .makeDirectory(dir, { recursive: true })
              .pipe(Effect.mapError(toFsError(dir)))
          )

          const encoded = Schema.encodeSync(AttestationsSummary)(summary)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeAttestationsSummary — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeAttestationsSummary(summary) → security/attestations-summary.json
          // Always write lean object (including { totalCount: 0 }). Bodies never persisted.
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Attestations summary synced", {
            synced: 1,
            totalCount,
            path: filePath
          })

          return { synced: 1, path: filePath }
        })
      })

      return SyncAttestationsSummary.of({ sync, stream })
    })
  )
}
