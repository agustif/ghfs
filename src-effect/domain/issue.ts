import { Schema } from 'effect'

export class Issue extends Schema.Class<Issue>('Issue')({
  number: Schema.Int,
  title: Schema.String,
  state: Schema.Literals(['open', 'closed']),
  body: Schema.NullOr(Schema.String),
  labels: Schema.Array(Schema.String),
  assignees: Schema.Array(Schema.String),
  milestone: Schema.NullOr(Schema.String),
  author: Schema.String,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  closedAt: Schema.NullOr(Schema.DateTimeUtc),
  comments: Schema.Array(
    Schema.Struct({
      id: Schema.Int,
      author: Schema.String,
      body: Schema.String,
      createdAt: Schema.DateTimeUtc,
      updatedAt: Schema.DateTimeUtc,
    }),
  ),
}) {}
