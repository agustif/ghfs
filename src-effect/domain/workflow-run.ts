/**
 * Recent Actions workflow *run* row (Schema-first) — NOT a workflow definition.
 *
 * Copy to: src-effect/domain/workflow-run.ts
 * Then export from domain/index.ts: `export * from "./workflow-run"`
 *
 * Fields cover legacy ProviderWorkflowRun / fetchRecentWorkflowRuns in
 * src/providers/github/enhanced.ts + writeActionsFile
 * (actions/recent-runs.json).
 *
 * DISTINCT from Workflow / SyncWorkflows (definitions → workflows/workflows.json)
 * and SyncWorkflowPermissions (actions/workflows.json with getWorkflow detail).
 *
 * Snapshot path this slice: `actions/recent-runs.json` (lean JSON **array**).
 * Legacy wrapper `{ synced_at, runs }` OOS. Jobs / logs / per-workflow dirs OOS.
 *
 * Wire via additive `GitHubClient.fetchRecentWorkflowRuns` — see snippet
 * (`GET /repos/{owner}/{repo}/actions/runs?per_page=` cue limit 20).
 */
import { Schema } from "effect"

/**
 * Known run `status` values, with String fallback for forward-compat.
 */
export const WorkflowRunStatus = Schema.Union([
  Schema.Literals([
    "queued",
    "in_progress",
    "completed",
    "waiting",
    "requested",
    "pending"
  ]),
  Schema.String
])
export type WorkflowRunStatus = typeof WorkflowRunStatus.Type

/**
 * Known run `conclusion` values, with String fallback; null while not completed.
 */
export const WorkflowRunConclusion = Schema.NullOr(
  Schema.Union([
    Schema.Literals([
      "success",
      "failure",
      "neutral",
      "cancelled",
      "skipped",
      "timed_out",
      "action_required",
      "stale"
    ]),
    Schema.String
  ])
)
export type WorkflowRunConclusion = typeof WorkflowRunConclusion.Type

/**
 * Lean recent workflow-run list row.
 */
export class WorkflowRun extends Schema.Class<WorkflowRun>("WorkflowRun")({
  id: Schema.Int,
  name: Schema.NullOr(Schema.String),
  headBranch: Schema.NullOr(Schema.String),
  headSha: Schema.String,
  status: WorkflowRunStatus,
  conclusion: WorkflowRunConclusion,
  workflowId: Schema.Int,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  htmlUrl: Schema.optional(Schema.String),
  event: Schema.String,
  actor: Schema.NullOr(Schema.String)
}) {}
