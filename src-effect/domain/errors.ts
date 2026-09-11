import { Schema } from 'effect'

export class GitHubError extends new Schema.TaggedError<GitHubError>()('GitHubError', {
  status: Schema.Int,
  message: Schema.String,
  details: Schema.optional(Schema.Unknown),
}) {}

export class SyncError extends new Schema.TaggedError<SyncError>()('SyncError', {
  message: Schema.String,
  number: Schema.optional(Schema.Int),
  cause: Schema.optional(Schema.Unknown),
}) {}

export class ConfigError extends new Schema.TaggedError<ConfigError>()('ConfigError', {
  message: Schema.String,
  field: Schema.optional(Schema.String),
}) {}

export class FileSystemError extends new Schema.TaggedError<FileSystemError>()('FileSystemError', {
  message: Schema.String,
  path: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

export class ExecuteError extends new Schema.TaggedError<ExecuteError>()('ExecuteError', {
  message: Schema.String,
  operation: Schema.optional(Schema.String),
  number: Schema.optional(Schema.Int),
  cause: Schema.optional(Schema.Unknown),
}) {}

export class ValidationError extends new Schema.TaggedError<ValidationError>()('ValidationError', {
  message: Schema.String,
  field: Schema.optional(Schema.String),
  value: Schema.optional(Schema.Unknown),
}) {}
