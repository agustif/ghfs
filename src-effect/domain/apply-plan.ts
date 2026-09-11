/**
 * Desired-state apply plan domain types (Schema-first).
 *
 * Copy to: src-effect/domain/apply-plan.ts
 * Then export from domain/index.ts: `export * from "./apply-plan"`
 *
 * Ops stub tags align with agustif/alchemy GitHub provider resources
 * (Label, Milestone, Issue, PullRequest, …). ApplyEngine maps these
 * through the alchemy deploy boundary — not bespoke GitHub mutators.
 */
import { Schema } from 'effect'

/** Alchemy GitHub resource kinds exposed to ghfs plan/apply. */
export const ApplyResourceKind = Schema.Literals([
  'label',
  'milestone',
  'issue',
  'pr',
  'comment',
  'release',
  'wiki',
])
export type ApplyResourceKind = Schema.Schema.Type<typeof ApplyResourceKind>

export const ApplyAction = Schema.Literals(['create', 'update', 'delete'])
export type ApplyAction = Schema.Schema.Type<typeof ApplyAction>

const ApplyOpBase = Schema.Struct({
  /** Logical id within kind (label name, milestone title, issue/PR number as string). */
  id: Schema.String,
  /** Stable URI: `ghfs:<kind>:<id>` */
  uri: Schema.String,
  /** Optional props blob for create/update (validated later by alchemy resource schemas). */
  props: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  /** Alchemy resource type string, e.g. `GitHub.Label`. */
  alchemyType: Schema.optional(Schema.String),
})

// --- label ---
export class CreateLabelOp extends Schema.Class<CreateLabelOp>('CreateLabelOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('create'),
  kind: Schema.Literal('label'),
}) {}

export class UpdateLabelOp extends Schema.Class<UpdateLabelOp>('UpdateLabelOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('update'),
  kind: Schema.Literal('label'),
}) {}

export class DeleteLabelOp extends Schema.Class<DeleteLabelOp>('DeleteLabelOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('delete'),
  kind: Schema.Literal('label'),
}) {}

// --- milestone ---
export class CreateMilestoneOp extends Schema.Class<CreateMilestoneOp>('CreateMilestoneOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('create'),
  kind: Schema.Literal('milestone'),
}) {}

export class UpdateMilestoneOp extends Schema.Class<UpdateMilestoneOp>('UpdateMilestoneOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('update'),
  kind: Schema.Literal('milestone'),
}) {}

export class DeleteMilestoneOp extends Schema.Class<DeleteMilestoneOp>('DeleteMilestoneOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('delete'),
  kind: Schema.Literal('milestone'),
}) {}

// --- issue ---
export class CreateIssueOp extends Schema.Class<CreateIssueOp>('CreateIssueOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('create'),
  kind: Schema.Literal('issue'),
}) {}

export class UpdateIssueOp extends Schema.Class<UpdateIssueOp>('UpdateIssueOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('update'),
  kind: Schema.Literal('issue'),
}) {}

export class DeleteIssueOp extends Schema.Class<DeleteIssueOp>('DeleteIssueOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('delete'),
  kind: Schema.Literal('issue'),
}) {}

// --- pr (PullRequest) ---
export class CreatePullOp extends Schema.Class<CreatePullOp>('CreatePullOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('create'),
  kind: Schema.Literal('pr'),
}) {}

export class UpdatePullOp extends Schema.Class<UpdatePullOp>('UpdatePullOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('update'),
  kind: Schema.Literal('pr'),
}) {}

export class DeletePullOp extends Schema.Class<DeletePullOp>('DeletePullOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('delete'),
  kind: Schema.Literal('pr'),
}) {}

// --- stub extras (comment / release / wiki) — same shape, ready for alchemy wiring ---
export class CreateCommentOp extends Schema.Class<CreateCommentOp>('CreateCommentOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('create'),
  kind: Schema.Literal('comment'),
}) {}

export class UpdateCommentOp extends Schema.Class<UpdateCommentOp>('UpdateCommentOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('update'),
  kind: Schema.Literal('comment'),
}) {}

export class DeleteCommentOp extends Schema.Class<DeleteCommentOp>('DeleteCommentOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('delete'),
  kind: Schema.Literal('comment'),
}) {}

export class CreateReleaseOp extends Schema.Class<CreateReleaseOp>('CreateReleaseOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('create'),
  kind: Schema.Literal('release'),
}) {}

export class UpdateReleaseOp extends Schema.Class<UpdateReleaseOp>('UpdateReleaseOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('update'),
  kind: Schema.Literal('release'),
}) {}

export class DeleteReleaseOp extends Schema.Class<DeleteReleaseOp>('DeleteReleaseOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('delete'),
  kind: Schema.Literal('release'),
}) {}

export class CreateWikiOp extends Schema.Class<CreateWikiOp>('CreateWikiOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('create'),
  kind: Schema.Literal('wiki'),
}) {}

export class UpdateWikiOp extends Schema.Class<UpdateWikiOp>('UpdateWikiOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('update'),
  kind: Schema.Literal('wiki'),
}) {}

export class DeleteWikiOp extends Schema.Class<DeleteWikiOp>('DeleteWikiOp')({
  ...ApplyOpBase.fields,
  action: Schema.Literal('delete'),
  kind: Schema.Literal('wiki'),
}) {}

export const ApplyOpSchema = Schema.Union([
  CreateLabelOp,
  UpdateLabelOp,
  DeleteLabelOp,
  CreateMilestoneOp,
  UpdateMilestoneOp,
  DeleteMilestoneOp,
  CreateIssueOp,
  UpdateIssueOp,
  DeleteIssueOp,
  CreatePullOp,
  UpdatePullOp,
  DeletePullOp,
  CreateCommentOp,
  UpdateCommentOp,
  DeleteCommentOp,
  CreateReleaseOp,
  UpdateReleaseOp,
  DeleteReleaseOp,
  CreateWikiOp,
  UpdateWikiOp,
  DeleteWikiOp,
])
export type ApplyOp = Schema.Schema.Type<typeof ApplyOpSchema>

export class ApplyPlanSummary extends Schema.Class<ApplyPlanSummary>('ApplyPlanSummary')({
  creates: Schema.Int,
  updates: Schema.Int,
  deletes: Schema.Int,
  total: Schema.Int,
}) {}

export class ApplyPlan extends Schema.Class<ApplyPlan>('ApplyPlan')({
  id: Schema.String,
  dryRun: Schema.Boolean,
  createdAt: Schema.DateTimeUtc,
  repo: Schema.optional(Schema.String),
  directory: Schema.optional(Schema.String),
  ops: Schema.Array(ApplyOpSchema),
  summary: ApplyPlanSummary,
}) {}
export type ApplyPlanType = Schema.Schema.Type<typeof ApplyPlan>

export class ApplyOpResult extends Schema.Class<ApplyOpResult>('ApplyOpResult')({
  uri: Schema.String,
  action: ApplyAction,
  kind: ApplyResourceKind,
  status: Schema.Literals(['applied', 'skipped', 'failed', 'dry-run']),
  message: Schema.optional(Schema.String),
}) {}
export type ApplyOpResultType = Schema.Schema.Type<typeof ApplyOpResult>

export class ApplyResult extends Schema.Class<ApplyResult>('ApplyResult')({
  planId: Schema.String,
  dryRun: Schema.Boolean,
  applied: Schema.Int,
  failed: Schema.Int,
  skipped: Schema.Int,
  results: Schema.Array(ApplyOpResult),
}) {}
export type ApplyResultType = Schema.Schema.Type<typeof ApplyResult>

/** Options for ApplyEngine.plan — Schema-first (no hand-rolled interface). */
export class ApplyPlanOptions extends Schema.Class<ApplyPlanOptions>('ApplyPlanOptions')({
  repo: Schema.optional(Schema.String),
  directory: Schema.optional(Schema.String),
  dryRun: Schema.optional(Schema.Boolean),
}) {}
export type ApplyPlanOptionsType = Schema.Schema.Type<typeof ApplyPlanOptions>

/** Options for ApplyEngine.apply — Schema-first. */
export class ApplyOptions extends Schema.Class<ApplyOptions>('ApplyOptions')({
  dryRun: Schema.Boolean,
}) {}
export type ApplyOptionsType = Schema.Schema.Type<typeof ApplyOptions>
