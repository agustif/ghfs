/**
 * Stream.paginate sync for GitHub repo webhooks (hooks) → webhooks/webhooks.json
 *
 * Copy to: src-effect/services/sync-actions-webhooks.ts
 * Wire: export from services/index (barrels already on tip; additive only — do not edit healed bodies).
 *
 * Requires additive GitHubClient.fetchActionsWebhooks — see sync-actions-webhooks.md / snippet.
 * MirrorFs has no writeWebhooks yet → writes via FileSystem under config.directory.
 * API: GET /repos/{owner}/{repo}/hooks?page=&per_page=
 *
 * Schema models first; webhook deliveries + MirrorFs markdown from legacy
 * sync-actions-webhooks.ts are OUT OF SCOPE (lean hooks list only this slice).
 *
 * Pattern mirrors landed sync-pages-builds / sync-collaborators Stream.paginate + FileSystem
 * snapshot (tip e06d829; REST page siblings pages-builds/collaborators).
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { GitHubError } from "../domain"
import { FileSystemError, SyncError, Webhook } from "../domain"
import { GhfsConfig } from "./config"
import { GitHubClient } from "./github-client"
import { MirrorFs } from "./mirror-fs"

const WEBHOOKS_DIR_NAME = "webhooks"
const WEBHOOKS_FILE_NAME = "webhooks.json"
const PER_PAGE = 100

type PageState = { readonly page: number }

export interface SyncActionsWebhooksSummary {
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

function compareWebhooks(a: Webhook, b: Webhook): number {
  return a.id - b.id
}

export class SyncActionsWebhooks extends Context.Service<
  SyncActionsWebhooks,
  {
    readonly sync: () => Effect.Effect<SyncActionsWebhooksSummary, SyncError>
    readonly stream: () => Stream.Stream<Webhook, SyncError>
  }
>()("ghfs/services/SyncActionsWebhooks") {
  static readonly layer = Layer.effect(
    SyncActionsWebhooks,
    Effect.gen(function* () {
      const github = yield* GitHubClient
      const mirror = yield* MirrorFs
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const stream = (): Stream.Stream<Webhook, SyncError> =>
        Stream.paginate({ page: 1 } as PageState, (state) =>
          Effect.gen(function* () {
            const hooks = yield* mapGitHub(
              github.fetchActionsWebhooks({ page: state.page, perPage: PER_PAGE })
            )

            if (hooks.length === 0) {
              return [hooks, Option.none()] as const
            }

            const next =
              hooks.length < PER_PAGE
                ? Option.none<PageState>()
                : Option.some({ page: state.page + 1 })

            return [hooks, next] as const
          })
        )

      const sync = Effect.fn("SyncActionsWebhooks.sync")(function* (): Effect.fn.Return<
        SyncActionsWebhooksSummary,
        SyncError
      > {
        return yield* Effect.gen(function* () {
          yield* Effect.logInfo("Syncing actions webhooks via Stream.paginate")
          yield* mapFs(mirror.ensureDirectory())

          const webhooksDir = path.join(config.directory, WEBHOOKS_DIR_NAME)
          yield* mapFs(
            fs
              .makeDirectory(webhooksDir, { recursive: true })
              .pipe(Effect.mapError(toFsError(webhooksDir)))
          )

          const collected = yield* stream().pipe(
            Stream.runFold(() => [] as Array<Webhook>, (acc, hook) => {
              acc.push(hook)
              return acc
            })
          )

          collected.sort(compareWebhooks)

          const filePath = path.join(webhooksDir, WEBHOOKS_FILE_NAME)
          // Schema-first encode (MirrorFs markdown / deliveries OOS)
          const encoded = Schema.encodeSync(Schema.Array(Webhook))(collected)
          const body = `${JSON.stringify(encoded, null, 2)}\n`

          // NOTE: MirrorFs has no writeWebhooks — FileSystem write under config.directory.
          // Future additive: MirrorFs.writeWebhooks(hooks) → webhooks/webhooks.json
          yield* mapFs(
            fs.writeFileString(filePath, body).pipe(Effect.mapError(toFsError(filePath)))
          )

          yield* Effect.logInfo("Actions webhooks synced", {
            synced: collected.length,
            path: filePath
          })

          return { synced: collected.length, path: filePath }
        })
      })

      return SyncActionsWebhooks.of({ sync, stream })
    })
  )
}
