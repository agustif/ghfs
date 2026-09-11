/**
 * Actions workflow definition (Schema-first) — NOT a workflow run.
 *
 * Copy to: src-effect/domain/workflow.ts
 * Then export from domain/index.ts: `export * from "./workflow"`
 *
 * Fields cover GitHub REST `GET /repos/{owner}/{repo}/actions/workflows`
 * workflow objects (id, node_id, name, path, state, created_at, updated_at,
 * html_url, badge_url). Workflow *runs* / jobs / logs are OUT OF SCOPE
 * (legacy kitchen-sink `src/sync/sync-workflows.ts` wrote run markdown — ignore).
 *
 * Snapshot path this slice: `workflows/workflows.json` (JSON array).
 */
import { Schema } from 'effect'

/**
 * Known GitHub Actions workflow `state` values, with String fallback for
 * forward-compat (e.g. `disabled_fork` or future states).
 */
export const WorkflowState = Schema.Union([
  Schema.Literals([
    'active',
    'deleted',
    'disabled_manually',
    'disabled_inactivity',
  ]),
  Schema.String,
])
export type WorkflowState = typeof WorkflowState.Type

/**
 * Repo-level GitHub Actions workflow *definition* (YAML under .github/workflows).
 * Wire via additive `GitHubClient.fetchWorkflows` — see snippet.
 */
export class Workflow extends Schema.Class<Workflow>('Workflow')({
  id: Schema.Int,
  nodeId: Schema.optional(Schema.String),
  name: Schema.String,
  /** Repo-relative path, e.g. `.github/workflows/ci.yml`. */
  path: Schema.String,
  state: WorkflowState,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  htmlUrl: Schema.optional(Schema.String),
  badgeUrl: Schema.optional(Schema.String),
}) {}
