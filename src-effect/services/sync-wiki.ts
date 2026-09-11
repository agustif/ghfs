/**
 * Stream.paginate sync for repo wiki pages → wiki/pages.json
 *
 * Copy to: src-effect/services/sync-wiki.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchWikiPages — see sync-wiki.md / snippet.
 * MirrorFs has no writeWiki yet → writes via FileSystem under config.directory.
 *
 * GitHub has no official REST/GraphQL list-wiki-pages endpoint. The additive
 * client may list-all then slice by page/perPage; SyncWiki still uses
 * Stream.paginate for consistency (page 1 may return all → Option.none).
 *
 * Schema models first; MirrorFs markdown/layout (`wiki/*.md`, `wiki.md`) is OUT OF SCOPE
 * (legacy lives in src/sync/sync-wiki.ts).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, WikiPage } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const WIKI_DIR_NAME = "wiki"
const WIKI_FILE_NAME = "pages.json"
const PER_PAGE = 100

type PageState = { readonly page: number }


export interface SyncWikiSummary {
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

export class SyncWiki extends Context.Service<
  SyncWiki,
  {
    readonly sync: () => Effect.Effect<SyncWikiSummary, SyncError>
    readonly stream: () => Stream.Stream<WikiPage, SyncError>
  }
>()("ghfs/services/SyncWiki") {
  static readonly layer = Layer.effect(
    SyncWiki,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<WikiPage, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const pages = yield* mapGitHub(
              github.fetchWikiPages({ page: state.page, perPage: PER_PAGE })
            )

            if (pages.length === 0) {
              return [pages, Option.none()] as const
            }

            // Non-paginated list-all clients return everything on page 1
            // (length may be < or > PER_PAGE); stop when short page OR
            // when the client already returned the full set in one shot.
            const next =
              pages.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [pages, next] as const
          })
        )

      const sync = Effect.fn("SyncWiki.sync")(function* (): Effect.fn.Return<
        SyncWikiSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing wiki pages via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const wikiDir = path.join(config.directory, WIKI_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(wikiDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(wikiDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<WikiPage>, (acc, page) => {
              acc.push(page)
              return acc
            })
          )

          // Stable snapshot order by page name (slug).
          collected.sort((a, b) => a.name.localeCompare(b.name))

          const filePath = path.join(wikiDir, WIKI_FILE_NAME)
          // Schema-first: DateTimeUtc → ISO strings (markdown layout OOS)
          const encoded = Schema.encodeSync(Schema.Array(WikiPage))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeWiki — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeWiki(pages) → wiki/pages.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Wiki pages synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncWiki.of({ sync, stream })
    })
  )
}
