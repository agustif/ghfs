import { Schema } from "effect"

export class Repo extends Schema.Class<Repo>("Repo")({
  owner: Schema.String,
  name: Schema.String,
  fullName: Schema.String,
  description: Schema.NullOr(Schema.String),
  defaultBranch: Schema.String,
  labels: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      color: Schema.String,
      description: Schema.NullOr(Schema.String)
    })
  ),
  milestones: Schema.Array(
    Schema.Struct({
      number: Schema.Int,
      title: Schema.String,
      state: Schema.Literal("open", "closed"),
      description: Schema.NullOr(Schema.String)
    })
  )
}) {}
