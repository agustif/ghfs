/**
 * Agent hints snapshot (Schema-first) — lean observe fields for
 * agent-hints/agent-hints.json.
 *
 * Copy to: src-effect/domain/agent-hints.ts
 * Then export from domain/index.ts: `export * from "./agent-hints"`
 *
 * Matches lean cue from src/sync/agent-hints.ts `buildAgentHints` /
 * `generateAgentHints` / `renderAgentHints` **fields**, NOT the full
 * ProviderRepository dump or markdown:
 *   description, features flags, topics[], pinned issues, recent release
 *   tags, totalIssues / totalPulls / openIssuesCount, syncedAt.
 *
 * LEAN by design:
 * - Dedicated `AgentHints` Class — NOT kitchen-sink ProviderRepository /
 *   full RepoMetadata embed
 * - Nested `AgentHintsFeatures` flags only (issues / projects / wiki /
 *   mergeQueue)
 * - `topics: string[]`, `pinnedIssueNumbers: number[]`,
 *   `recentReleaseTags: string[]` — NOT full topic objects / Release rows
 * - Counts from tip SyncState by kind (+ openIssuesCount from repo wire)
 *
 * Snapshot path this slice: `agent-hints/agent-hints.json`
 * Legacy `renderAgentHints` / `generateAgentHints` markdown →
 * `agent-hints.md` is OUT OF SCOPE (JSON snapshot only). MirrorFs markdown OOS.
 *
 * Wire via reuse of tip `fetchRepository` / `fetchReleases` + additive
 * `fetchRepositoryTopics` / `fetchPinnedIssues` — see snippet.
 * Counts come from MirrorFs.readSyncState() (local).
 */
import { Schema } from 'effect'

/**
 * Nested feature flags (legacy markdown "Features" section).
 * Sourced from lean repo wire (`has_issues` / `has_projects` / `has_wiki` /
 * `merge_queue_enabled`) — NOT a full RepoMetadata dump.
 */
export const AgentHintsFeatures = Schema.Struct({
  issues: Schema.Boolean,
  projects: Schema.Boolean,
  wiki: Schema.Boolean,
  /** REST often omits merge queue; map null/undefined → false in build. */
  mergeQueue: Schema.Boolean,
})
export type AgentHintsFeatures = typeof AgentHintsFeatures.Type

/**
 * Transient scan / fetch input for `buildAgentHints` — lean fields only.
 * NOT a full ProviderRepository / Release / SyncState kitchen-sink.
 *
 * Service maps tip RepoMetadata + topics + pinned + release tags +
 * SyncState counts into this shape.
 */
export interface AgentHintsInput {
  readonly description?: string | null
  readonly features: {
    readonly issues: boolean
    readonly projects: boolean
    readonly wiki: boolean
    readonly mergeQueue: boolean
  }
  readonly topics?: ReadonlyArray<string>
  readonly pinnedIssueNumbers?: ReadonlyArray<number>
  readonly recentReleaseTags?: ReadonlyArray<string>
  readonly totalIssues?: number
  readonly totalPulls?: number
  readonly openIssuesCount?: number
  readonly syncedAt: string
}

/**
 * Lean agent-hints snapshot (single resource after repo + topics + pinned +
 * limited releases fetch + local SyncState counts).
 */
export class AgentHints extends Schema.Class<AgentHints>('AgentHints')({
  description: Schema.NullOr(Schema.String),
  features: AgentHintsFeatures,
  topics: Schema.Array(Schema.String),
  pinnedIssueNumbers: Schema.Array(Schema.Int),
  recentReleaseTags: Schema.Array(Schema.String),
  totalIssues: Schema.Int,
  totalPulls: Schema.Int,
  openIssuesCount: Schema.Int,
  syncedAt: Schema.String,
}) {}

export const decodeAgentHints = Schema.decodeUnknownSync(AgentHints)
export const decodeAgentHintsFeatures =
  Schema.decodeUnknownSync(AgentHintsFeatures)

/**
 * Pure aggregator — mirrors lean cue fields from
 * src/sync/agent-hints.ts without embedding full repository / release objects
 * or rendering markdown.
 *
 * Counts default to 0; arrays default to []; description defaults to null.
 * `mergeQueue` already normalized by caller (null → false).
 */
export function buildAgentHints(input: AgentHintsInput): AgentHints {
  return AgentHints.make({
    description: input.description ?? null,
    features: AgentHintsFeatures.make({
      issues: input.features.issues,
      projects: input.features.projects,
      wiki: input.features.wiki,
      mergeQueue: input.features.mergeQueue,
    }),
    topics: [...(input.topics ?? [])],
    pinnedIssueNumbers: [...(input.pinnedIssueNumbers ?? [])],
    recentReleaseTags: [...(input.recentReleaseTags ?? [])],
    totalIssues: input.totalIssues ?? 0,
    totalPulls: input.totalPulls ?? 0,
    openIssuesCount: input.openIssuesCount ?? 0,
    syncedAt: input.syncedAt,
  })
}
