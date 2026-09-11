import { Schema } from 'effect'

const BaseOp = Schema.Struct({
  number: Schema.Int,
  ifUnchangedSince: Schema.optional(Schema.DateTimeUtc),
})

export class CloseOp extends Schema.Class<CloseOp>('CloseOp')({
  ...BaseOp.fields,
  action: Schema.Literal('close'),
}) {}

export class CloseWithCommentOp extends Schema.Class<CloseWithCommentOp>('CloseWithCommentOp')({
  ...BaseOp.fields,
  action: Schema.Literal('close-with-comment'),
  body: Schema.String,
}) {}

export class ReopenOp extends Schema.Class<ReopenOp>('ReopenOp')({
  ...BaseOp.fields,
  action: Schema.Literal('reopen'),
}) {}

export class SetTitleOp extends Schema.Class<SetTitleOp>('SetTitleOp')({
  ...BaseOp.fields,
  action: Schema.Literal('set-title'),
  title: Schema.String,
}) {}

export class SetBodyOp extends Schema.Class<SetBodyOp>('SetBodyOp')({
  ...BaseOp.fields,
  action: Schema.Literal('set-body'),
  body: Schema.String,
}) {}

export class AddCommentOp extends Schema.Class<AddCommentOp>('AddCommentOp')({
  ...BaseOp.fields,
  action: Schema.Literal('add-comment'),
  body: Schema.String,
}) {}

export class AddLabelsOp extends Schema.Class<AddLabelsOp>('AddLabelsOp')({
  ...BaseOp.fields,
  action: Schema.Literal('add-labels'),
  labels: Schema.Array(Schema.String),
}) {}

export class RemoveLabelsOp extends Schema.Class<RemoveLabelsOp>('RemoveLabelsOp')({
  ...BaseOp.fields,
  action: Schema.Literal('remove-labels'),
  labels: Schema.Array(Schema.String),
}) {}

export class SetLabelsOp extends Schema.Class<SetLabelsOp>('SetLabelsOp')({
  ...BaseOp.fields,
  action: Schema.Literal('set-labels'),
  labels: Schema.Array(Schema.String),
}) {}

export class AddAssigneesOp extends Schema.Class<AddAssigneesOp>('AddAssigneesOp')({
  ...BaseOp.fields,
  action: Schema.Literal('add-assignees'),
  assignees: Schema.Array(Schema.String),
}) {}

export class RemoveAssigneesOp extends Schema.Class<RemoveAssigneesOp>('RemoveAssigneesOp')({
  ...BaseOp.fields,
  action: Schema.Literal('remove-assignees'),
  assignees: Schema.Array(Schema.String),
}) {}

export class SetAssigneesOp extends Schema.Class<SetAssigneesOp>('SetAssigneesOp')({
  ...BaseOp.fields,
  action: Schema.Literal('set-assignees'),
  assignees: Schema.Array(Schema.String),
}) {}

export class SetMilestoneOp extends Schema.Class<SetMilestoneOp>('SetMilestoneOp')({
  ...BaseOp.fields,
  action: Schema.Literal('set-milestone'),
  milestone: Schema.String,
}) {}

export class ClearMilestoneOp extends Schema.Class<ClearMilestoneOp>('ClearMilestoneOp')({
  ...BaseOp.fields,
  action: Schema.Literal('clear-milestone'),
}) {}

export class LockOp extends Schema.Class<LockOp>('LockOp')({
  ...BaseOp.fields,
  action: Schema.Literal('lock'),
  reason: Schema.optional(Schema.String),
}) {}

export class UnlockOp extends Schema.Class<UnlockOp>('UnlockOp')({
  ...BaseOp.fields,
  action: Schema.Literal('unlock'),
}) {}

export class RequestReviewersOp extends Schema.Class<RequestReviewersOp>('RequestReviewersOp')({
  ...BaseOp.fields,
  action: Schema.Literal('request-reviewers'),
  reviewers: Schema.Array(Schema.String),
}) {}

export class RemoveReviewersOp extends Schema.Class<RemoveReviewersOp>('RemoveReviewersOp')({
  ...BaseOp.fields,
  action: Schema.Literal('remove-reviewers'),
  reviewers: Schema.Array(Schema.String),
}) {}

export class MarkReadyForReviewOp extends Schema.Class<MarkReadyForReviewOp>('MarkReadyForReviewOp')({
  ...BaseOp.fields,
  action: Schema.Literal('mark-ready-for-review'),
}) {}

export class ConvertToDraftOp extends Schema.Class<ConvertToDraftOp>('ConvertToDraftOp')({
  ...BaseOp.fields,
  action: Schema.Literal('convert-to-draft'),
}) {}

export const ExecuteOpSchema = Schema.Union([
  CloseOp,
  CloseWithCommentOp,
  ReopenOp,
  SetTitleOp,
  SetBodyOp,
  AddCommentOp,
  AddLabelsOp,
  RemoveLabelsOp,
  SetLabelsOp,
  AddAssigneesOp,
  RemoveAssigneesOp,
  SetAssigneesOp,
  SetMilestoneOp,
  ClearMilestoneOp,
  LockOp,
  UnlockOp,
  RequestReviewersOp,
  RemoveReviewersOp,
  MarkReadyForReviewOp,
  ConvertToDraftOp,
])

export type ExecuteOp = typeof ExecuteOpSchema.Type
export type ExecuteOp = Schema.Schema.Type<typeof ExecuteOpSchema>
