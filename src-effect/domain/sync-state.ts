import { Schema } from "effect"

export class SyncItemState extends Schema.Class<SyncItemState>("SyncItemState")({
  number: Schema.Int,
  kind: Schema.Literal("issue", "pull"),
  state: Schema.Literal("open", "closed"),
  lastUpdatedAt: Schema.DateTimeUtc,
  lastSyncedAt: Schema.DateTimeUtc,
  filePath: Schema.String,
  patchPath: Schema.optional(Schema.String)
}) {}

export class SyncState extends Schema.Class<SyncState>("SyncState")({
  version: Schema.Literal(1),
  repo: Schema.optional(Schema.String),
  lastSyncedAt: Schema.optional(Schema.DateTimeUtc),
  lastSince: Schema.optional(Schema.DateTimeUtc),
  items: Schema.Record({ key: Schema.String, value: SyncItemState })
}) {}
