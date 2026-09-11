/**
 * Thin SyncSatellites orchestrator — STAGE WIRING for landed repo-level Sync* services.
 *
 * Copy to: src-effect/services/sync-satellites.ts
 * Wire: export from services/index; AppLayer SyncSatellites.layer; CLI / optional SyncEngine snippet.
 *
 * Does NOT rewrite sync-engine / sync-engine-streaming / github-client / mirror-fs / closed heal bodies.
 * SyncComments / SyncTimeline are item-scoped (require subject) — OMITTED; follow-up.
 *
 * Tip: 0d6526b
 */
import { Context, Effect, Layer, Result } from "effect"
import type { SyncError } from "../domain"
import { GhfsConfig } from "./config"

/** Per-stage result row (success, flag-skip, or mapped error). */
export interface SyncSatelliteStageResult {
  readonly name: string
  readonly synced?: number
  readonly path?: string
  readonly skipped?: boolean
  readonly error?: string
}

export interface SyncSatellitesSummary {
  readonly stages: number
  readonly synced: number
  readonly errors: number
  readonly results: ReadonlyArray<SyncSatelliteStageResult>
}

type SatelliteSyncFn = () => Effect.Effect<
  { readonly synced: number; readonly path?: string },
  SyncError
>

export interface SatelliteStageSpec {
  readonly name: string
  readonly enabled: boolean
  readonly run: SatelliteSyncFn
}

/**
 * Optional satellite flags — NOT on Effect GhfsConfig @ tip 0d6526b
 * (only syncIssues / syncPulls / syncClosed / syncPatches exist).
 * When additive config lands, cast/read these keys; until then legacy defaults apply.
 *
 * Legacy cues (src/config/load.ts + sync-*.ts guards):
 *   labelsAndMilestones/discussions/wiki/mergeQueue/releases/packages/workflows/metadata → default true
 *   pagesBuilds / interactionLimits / webhooks / people → default false
 *   teams / collaborators / codeowners / projectsV2 / sponsorships → no dedicated resolved flag → run (default true)
 */
export type SatelliteConfigFlags = {
  readonly syncLabelsAndMilestones?: boolean
  readonly syncDiscussions?: boolean
  readonly syncWiki?: boolean
  readonly syncMergeQueue?: boolean
  readonly syncReleases?: boolean
  readonly syncPackages?: boolean
  readonly syncWorkflows?: boolean
  readonly syncMetadata?: boolean
  readonly syncPagesBuilds?: boolean
  readonly syncInteractionLimits?: boolean
  readonly syncWebhooks?: boolean
  readonly syncPeople?: boolean
  readonly syncTeams?: boolean
  readonly syncCollaborators?: boolean
  readonly syncCodeowners?: boolean
  readonly syncProjectsV2?: boolean
  readonly syncSponsorships?: boolean
}

const LEGACY_DEFAULTS: Readonly<Record<keyof SatelliteConfigFlags, boolean>> = {
  syncLabelsAndMilestones: true,
  syncDiscussions: true,
  syncWiki: true,
  syncMergeQueue: true,
  syncReleases: true,
  syncPackages: true,
  syncWorkflows: true,
  syncMetadata: true,
  syncPagesBuilds: false,
  syncInteractionLimits: false,
  syncWebhooks: false,
  syncPeople: false,
  syncTeams: true,
  syncCollaborators: true,
  syncCodeowners: true,
  syncProjectsV2: true,
  syncSponsorships: true
}

/** Gate: use flag when present on config; else legacy default (undefined → default, not always-off). */
export function isSatelliteEnabled(
  config: object,
  key: keyof SatelliteConfigFlags
): boolean {
  const flags = config as SatelliteConfigFlags
  const value = flags[key]
  if (typeof value === "boolean") {
    return value
  }
  return LEGACY_DEFAULTS[key]
}

/**
 * Sequential stage runner — log + fold errors so one satellite failure does not abort the rest.
 * Exported for unit tests (stubbed stage list, no live GitHub).
 */
export function runSatelliteStages(
  stages: ReadonlyArray<SatelliteStageSpec>
): Effect.Effect<SyncSatellitesSummary> {
  return Effect.gen(function* () {
    const results: Array<SyncSatelliteStageResult> = []
    let synced = 0
    let errors = 0

    for (const stage of stages) {
      if (!stage.enabled) {
        yield* Effect.logInfo(`Skipping satellite stage (flag off)`, {
          stage: stage.name
        })
        results.push({ name: stage.name, skipped: true })
        continue
      }

      yield* Effect.logInfo(`Running satellite stage`, { stage: stage.name })

      const outcome = yield* Effect.result(stage.run())

      if (Result.isFailure(outcome)) {
        const message = outcome.failure.message
        yield* Effect.logError(`Satellite stage failed`, {
          stage: stage.name,
          message
        })
        results.push({ name: stage.name, error: message })
        errors++
        continue
      }

      const summary = outcome.success
      synced += summary.synced
      results.push({
        name: stage.name,
        synced: summary.synced,
        path: summary.path
      })
    }

    const out: SyncSatellitesSummary = {
      stages: stages.length,
      synced,
      errors,
      results
    }

    yield* Effect.logInfo("Satellite sync complete", {
      stages: out.stages,
      synced: out.synced,
      errors: out.errors
    })

    return out
  })
}

export class SyncSatellites extends Context.Service<
  SyncSatellites,
  {
    readonly sync: () => Effect.Effect<SyncSatellitesSummary, SyncError>
  }
>()("ghfs/services/SyncSatellites") {
  static readonly layer = Layer.effect(
    SyncSatellites,
    Effect.gen(function* () {
      const config = yield* GhfsConfig

      // Lazy-load Sync* so unit tests of fold helpers do not evaluate tip's
      // @effect/platform barrel (still imports removed effect/Either).
      const {
        SyncLabels,
        SyncMilestones,
        SyncMetadata,
        SyncCodeowners,
        SyncCollaborators,
        SyncPeople,
        SyncTeams,
        SyncReleases,
        SyncDiscussions,
        SyncWiki,
        SyncWorkflows,
        SyncMergeQueue,
        SyncPackages,
        SyncProjectsV2,
        SyncPagesBuilds,
        SyncSponsorships,
        SyncActionsWebhooks,
        SyncInteractionLimits
      } = yield* Effect.promise(() =>
        Promise.all([
          import("./sync-labels"),
          import("./sync-milestones"),
          import("./sync-metadata"),
          import("./sync-codeowners"),
          import("./sync-collaborators"),
          import("./sync-people"),
          import("./sync-teams"),
          import("./sync-releases"),
          import("./sync-discussions"),
          import("./sync-wiki"),
          import("./sync-workflows"),
          import("./sync-merge-queue"),
          import("./sync-packages"),
          import("./sync-projects-v2"),
          import("./sync-pages-builds"),
          import("./sync-sponsorships"),
          import("./sync-actions-webhooks"),
          import("./sync-interaction-limits")
        ]).then(
          ([
            labelsMod,
            milestonesMod,
            metadataMod,
            codeownersMod,
            collaboratorsMod,
            peopleMod,
            teamsMod,
            releasesMod,
            discussionsMod,
            wikiMod,
            workflowsMod,
            mergeQueueMod,
            packagesMod,
            projectsV2Mod,
            pagesBuildsMod,
            sponsorshipsMod,
            actionsWebhooksMod,
            interactionLimitsMod
          ]) => ({
            SyncLabels: labelsMod.SyncLabels,
            SyncMilestones: milestonesMod.SyncMilestones,
            SyncMetadata: metadataMod.SyncMetadata,
            SyncCodeowners: codeownersMod.SyncCodeowners,
            SyncCollaborators: collaboratorsMod.SyncCollaborators,
            SyncPeople: peopleMod.SyncPeople,
            SyncTeams: teamsMod.SyncTeams,
            SyncReleases: releasesMod.SyncReleases,
            SyncDiscussions: discussionsMod.SyncDiscussions,
            SyncWiki: wikiMod.SyncWiki,
            SyncWorkflows: workflowsMod.SyncWorkflows,
            SyncMergeQueue: mergeQueueMod.SyncMergeQueue,
            SyncPackages: packagesMod.SyncPackages,
            SyncProjectsV2: projectsV2Mod.SyncProjectsV2,
            SyncPagesBuilds: pagesBuildsMod.SyncPagesBuilds,
            SyncSponsorships: sponsorshipsMod.SyncSponsorships,
            SyncActionsWebhooks: actionsWebhooksMod.SyncActionsWebhooks,
            SyncInteractionLimits: interactionLimitsMod.SyncInteractionLimits
          })
        )
      )

      const labels = yield* SyncLabels
      const milestones = yield* SyncMilestones
      const metadata = yield* SyncMetadata
      const codeowners = yield* SyncCodeowners
      const collaborators = yield* SyncCollaborators
      const people = yield* SyncPeople
      const teams = yield* SyncTeams
      const releases = yield* SyncReleases
      const discussions = yield* SyncDiscussions
      const wiki = yield* SyncWiki
      const workflows = yield* SyncWorkflows
      const mergeQueue = yield* SyncMergeQueue
      const packages = yield* SyncPackages
      const projectsV2 = yield* SyncProjectsV2
      const pagesBuilds = yield* SyncPagesBuilds
      const sponsorships = yield* SyncSponsorships
      const actionsWebhooks = yield* SyncActionsWebhooks
      const interactionLimits = yield* SyncInteractionLimits

      const sync = Effect.fn("SyncSatellites.sync")(function* (): Effect.fn.Return<
        SyncSatellitesSummary,
        SyncError
      > {
        // SyncError is absorbed per-stage via Effect.result — surface never fails the batch.
        // Typed as SyncError on the service contract for sibling consistency.
        // Stage note (not wired): rule-suites observe satellite — SyncRuleSuites; gate syncRuleSuites default false; prefer next snapshot surface.
        const stages: Array<SatelliteStageSpec> = [
          {
            name: "SyncMetadata",
            enabled: isSatelliteEnabled(config, "syncMetadata"),
            run: () => metadata.sync()
          },
          {
            name: "SyncLabels",
            enabled: isSatelliteEnabled(config, "syncLabelsAndMilestones"),
            run: () => labels.sync()
          },
          {
            name: "SyncMilestones",
            enabled: isSatelliteEnabled(config, "syncLabelsAndMilestones"),
            run: () => milestones.sync()
          },
          {
            name: "SyncCodeowners",
            enabled: isSatelliteEnabled(config, "syncCodeowners"),
            run: () => codeowners.sync()
          },
          {
            name: "SyncCollaborators",
            enabled: isSatelliteEnabled(config, "syncCollaborators"),
            run: () => collaborators.sync()
          },
          {
            name: "SyncPeople",
            enabled: isSatelliteEnabled(config, "syncPeople"),
            run: () => people.sync()
          },
          {
            name: "SyncTeams",
            enabled: isSatelliteEnabled(config, "syncTeams"),
            run: () => teams.sync()
          },
          {
            name: "SyncReleases",
            enabled: isSatelliteEnabled(config, "syncReleases"),
            run: () => releases.sync()
          },
          {
            name: "SyncDiscussions",
            enabled: isSatelliteEnabled(config, "syncDiscussions"),
            run: () => discussions.sync()
          },
          {
            name: "SyncWiki",
            enabled: isSatelliteEnabled(config, "syncWiki"),
            run: () => wiki.sync()
          },
          {
            name: "SyncWorkflows",
            enabled: isSatelliteEnabled(config, "syncWorkflows"),
            run: () => workflows.sync()
          },
          {
            name: "SyncMergeQueue",
            enabled: isSatelliteEnabled(config, "syncMergeQueue"),
            run: () => mergeQueue.sync()
          },
          {
            name: "SyncPackages",
            enabled: isSatelliteEnabled(config, "syncPackages"),
            run: () => packages.sync()
          },
          {
            name: "SyncProjectsV2",
            enabled: isSatelliteEnabled(config, "syncProjectsV2"),
            run: () => projectsV2.sync()
          },
          {
            name: "SyncPagesBuilds",
            enabled: isSatelliteEnabled(config, "syncPagesBuilds"),
            run: () => pagesBuilds.sync()
          },
          {
            name: "SyncSponsorships",
            enabled: isSatelliteEnabled(config, "syncSponsorships"),
            run: () => sponsorships.sync()
          },
          {
            name: "SyncActionsWebhooks",
            enabled: isSatelliteEnabled(config, "syncWebhooks"),
            run: () => actionsWebhooks.sync()
          },
          {
            name: "SyncInteractionLimits",
            enabled: isSatelliteEnabled(config, "syncInteractionLimits"),
            run: () => interactionLimits.sync()
          }
        ]

        return yield* runSatelliteStages(stages)
      })

      return SyncSatellites.of({ sync })
    })
  )
}
