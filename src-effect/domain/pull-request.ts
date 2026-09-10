import { Schema } from "effect"

export class PullRequest extends Schema.Class<PullRequest>("PullRequest")({
  number: Schema.Int,
  title: Schema.String,
  state: Schema.Literal("open", "closed"),
  body: Schema.NullOr(Schema.String),
  labels: Schema.Array(Schema.String),
  assignees: Schema.Array(Schema.String),
  milestone: Schema.NullOr(Schema.String),
  author: Schema.String,
  isDraft: Schema.Boolean,
  merged: Schema.Boolean,
  mergedAt: Schema.NullOr(Schema.DateTimeUtc),
  baseRef: Schema.String,
  headRef: Schema.String,
  reviewersRequested: Schema.Array(Schema.String),
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  closedAt: Schema.NullOr(Schema.DateTimeUtc),
  comments: Schema.Array(
    Schema.Struct({
      id: Schema.Int,
      author: Schema.String,
      body: Schema.String,
      createdAt: Schema.DateTimeUtc,
      updatedAt: Schema.DateTimeUtc
    })
  )
}) {}
