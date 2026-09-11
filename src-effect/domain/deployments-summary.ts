/**
 * Deployments summary snapshot (Schema-first) — lean per-environment latest
 * deployment + count for deployments-summary.json.
 *
 * Copy to: src-effect/domain/deployments-summary.ts
 * Then export from domain/index.ts: `export * from "./deployments-summary"`
 *
 * Matches legacy `buildDeploymentsSummary` shape in src/sync/deployments-summary.ts:
 * `{ environments: Record<env, { latest, count }>, syncedAt }`.
 *
 * LEAN by design:
 * - Persist one latest row per environment + count (NOT full deployment history dump)
 * - Do NOT embed statuses arrays, payload kitchen-sink, or per-deployment status fetches
 * - Wire `state` is not on listDeployments — map when present, else `"unknown"`
 *   (statuses N+1 OOS for this observe summary)
 *
 * Snapshot path this slice: `deployments-summary/deployments-summary.json`
 * Legacy wrote `deployments/summary.json` (+ summary.md) via
 * extended-metadata-ergonomics — sibling-style dir under deployments-summary/
 * matches activity-summary / security-summary. MirrorFs markdown OOS.
 *
 * Wire via additive GitHubClient.fetchDeployments — see snippet.
 */
import { Schema } from 'effect'

/**
 * Transient fetch row from fetchDeployments — enough to aggregate by environment.
 * Not the full ProviderDeployment kitchen-sink (`[key: string]: any`, task,
 * statusesUrl, repositoryUrl, …).
 */
export interface DeploymentInput {
  readonly id: number
  readonly environment: string
  readonly state: string
  readonly description: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly creator: string | null
  readonly ref: string
  readonly sha: string
  readonly url?: string
}

/**
 * Slim latest-deployment row persisted under each environment key
 * (matches cue DeploymentsSummary.environments[*].latest).
 */
export const DeploymentLatest = Schema.Struct({
  id: Schema.Number,
  state: Schema.String,
  description: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
  creator: Schema.NullOr(Schema.String),
  ref: Schema.String,
  sha: Schema.String,
  url: Schema.optional(Schema.String),
})
export type DeploymentLatest = typeof DeploymentLatest.Type

/** Per-environment bucket: latest row + how many deployments seen for that env. */
export const EnvironmentDeployments = Schema.Struct({
  latest: DeploymentLatest,
  count: Schema.Int,
})
export type EnvironmentDeployments = typeof EnvironmentDeployments.Type

/**
 * Lean deployments-summary snapshot (single resource after one deployments list).
 * Wire via additive fetchDeployments — see snippet.
 */
export class DeploymentsSummary extends Schema.Class<DeploymentsSummary>(
  'DeploymentsSummary',
)({
  environments: Schema.Record(Schema.String, EnvironmentDeployments),
  syncedAt: Schema.String,
}) {}

export const decodeDeploymentsSummary =
  Schema.decodeUnknownSync(DeploymentsSummary)
export const decodeDeploymentLatest = Schema.decodeUnknownSync(DeploymentLatest)
export const decodeEnvironmentDeployments =
  Schema.decodeUnknownSync(EnvironmentDeployments)

function toLatest(row: DeploymentInput): DeploymentLatest {
  return DeploymentLatest.make({
    id: row.id,
    state: row.state,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    creator: row.creator,
    ref: row.ref,
    sha: row.sha,
    ...(row.url !== undefined ? { url: row.url } : {}),
  })
}

/**
 * Pure aggregator — mirrors legacy src/sync/deployments-summary.ts
 * buildDeploymentsSummary: group by environment, keep newest createdAt as
 * latest, increment count. Emits lean latest rows only (no history dump).
 */
export function buildDeploymentsSummary(input: {
  readonly deployments: ReadonlyArray<DeploymentInput>
  readonly syncedAt: string
}): DeploymentsSummary {
  const environments: Record<string, EnvironmentDeployments> = {}

  for (const deployment of input.deployments) {
    const env =
      deployment.environment.trim().length > 0
        ? deployment.environment
        : 'unknown'

    const existing = environments[env]
    if (!existing) {
      environments[env] = EnvironmentDeployments.make({
        latest: toLatest(deployment),
        count: 1,
      })
      continue
    }

    const nextCount = existing.count + 1
    const currentLatest = new Date(existing.latest.createdAt).getTime()
    const thisCreated = new Date(deployment.createdAt).getTime()
    const latest =
      thisCreated > currentLatest ? toLatest(deployment) : existing.latest

    environments[env] = EnvironmentDeployments.make({
      latest,
      count: nextCount,
    })
  }

  return DeploymentsSummary.make({
    environments,
    syncedAt: input.syncedAt,
  })
}
