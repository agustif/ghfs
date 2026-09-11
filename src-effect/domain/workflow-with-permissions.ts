/**
 * Actions workflow definition + optional getWorkflow detail (legacy "permissions").
 *
 * Copy to: src-effect/domain/workflow-with-permissions.ts
 * Then export from domain/index.ts: `export * from "./workflow-with-permissions"`
 *
 * Cue: src/sync/actions-snapshot.ts writeWorkflowsFile merges list rows with
 * provider.fetchWorkflowPermissions(workflow.id) under key `permissions`
 * (misnamed — REST is GET .../actions/workflows/{workflow_id}, not OAuth scopes).
 *
 * Snapshot path this slice: `actions/workflows.json` (lean JSON array).
 * Kitchen-sink wrapper `{ repo, synced_at, count, workflows }` is OUT OF SCOPE.
 * Does NOT rewrite SyncWorkflows / Workflow (list → workflows/workflows.json).
 */
import { Schema } from "effect"
import { WorkflowState } from "./workflow"

/**
 * Workflow list row plus optional getWorkflow payload under `permissions`.
 * Detail payload stays Schema.Unknown (forward-compat; legacy stores full REST body).
 */
export class WorkflowWithPermissions extends Schema.Class<WorkflowWithPermissions>(
  "WorkflowWithPermissions"
)({
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
  /**
   * Full GET /repos/{owner}/{repo}/actions/workflows/{id} JSON (legacy field name).
   * Absent when the N+1 fetch failed or was skipped.
   */
  permissions: Schema.optional(Schema.Unknown)
}) {}
