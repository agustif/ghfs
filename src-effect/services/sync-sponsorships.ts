/**
 * Stream.paginate sync for as-maintainer sponsorships → sponsorships/sponsorships.json
 *
 * Copy to: src-effect/services/sync-sponsorships.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchSponsorships — see sync-sponsorships.md / snippet.
 * MirrorFs has no writeSponsorships yet → writes via FileSystem under config.directory.
 * Transport: GraphQL `user|organization.sponsorshipsAsMaintainer(first, after)`
 * (REST has no Sponsors list for maintainers).
 *
 * Schema models first; MirrorFs markdown/layout (`sponsors.md`, `funding.md`) and
 * FUNDING.yml funding links are OUT OF SCOPE (legacy lives in src/sync/sync-sponsorships.ts).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, Sponsorship, SyncError } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const SPONSORSHIPS_DIR_NAME = "sponsorships"
const SPONSORSHIPS_FILE_NAME = "sponsorships.json"
const FIRST = 100

/** Cursor page state for GraphQL `after` pagination. */
type PageState = { readonly cursor: string | null }

/** One GraphQL sponsorshipsAsMaintainer page (additive client surface). */
export type SponsorshipsPage = {
  readonly sponsorships: Array<Sponsorship>
  readonly pageInfo: {
    readonly hasNextPage: boolean
    readonly endCursor: string | null
  }
}

export interface SyncSponsorshipsSummary {
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

export class SyncSponsorships extends Context.Service<
  SyncSponsorships,
  {
    readonly sync: () => Effect.Effect<SyncSponsorshipsSummary, SyncError>
    readonly stream: () => Stream.Stream<Sponsorship, SyncError>
  }
>()("ghfs/services/SyncSponsorships") {
  static readonly layer = Layer.effect(
    SyncSponsorships,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<Sponsorship, SyncError> =>
        Stream.paginate({ cursor: null } as PageState, (state) =>
          Effect.gen(function* () {
            const page = yield* mapGitHub(
              github.fetchSponsorships({
                after: state.cursor,
                first: FIRST
              })
            )

            const sponsorships = page.sponsorships

            if (sponsorships.length === 0) {
              return [sponsorships, Option.none()] as const
            }

            const next =
              page.pageInfo.hasNextPage && page.pageInfo.endCursor
                ? Option.some({ cursor: page.pageInfo.endCursor })
                : Option.none<PageState>()

            return [sponsorships, next] as const
          })
        )

      const sync = Effect.fn("SyncSponsorships.sync")(function* (): Effect.fn.Return<
        SyncSponsorshipsSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing sponsorships via Stream.paginate (GraphQL cursor)")
          yield* mapFs(mirror.ensureDirectory())

          const sponsorshipsDir = path.join(config.directory, SPONSORSHIPS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(sponsorshipsDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(sponsorshipsDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<Sponsorship>, (acc, sponsorship) => {
              acc.push(sponsorship)
              return acc
            })
          )

          // No public number on Sponsorship — stable sort by sponsor.login then createdAt.
          collected.sort((a, b) => {
            const byLogin = a.sponsor.login.localeCompare(b.sponsor.login)
            if (byLogin !== 0) return byLogin
            return String(a.createdAt).localeCompare(String(b.createdAt))
          })

          const filePath = path.join(sponsorshipsDir, SPONSORSHIPS_FILE_NAME)
          // Schema-first: DateTimeUtc → ISO strings (markdown / funding OOS)
          const encoded = Schema.encodeSync(Schema.Array(Sponsorship))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeSponsorships — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeSponsorships(sponsorships) → sponsorships/sponsorships.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Sponsorships synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncSponsorships.of({ sync, stream })
    })
  )
}
