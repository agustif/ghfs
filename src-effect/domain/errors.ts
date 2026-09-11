/* eslint-disable unicorn/throw-new-error -- Schema.TaggedError() returns a Class; `extends new` breaks Effect 4 constructors */
import { Schema } from 'effect'

export class GitHubError extends Schema.TaggedError<GitHubError>()('GitHubError', {
  status: Schema.Int,
  message: Schema.String,
  details: Schema.optional(Schema.Unknown),
}) {}

export class SyncError extends Schema.TaggedError<SyncError>()('SyncError', {
  message: Schema.String,
  number: Schema.optional(Schema.Int),
  cause: Schema.optional(Schema.Unknown),
}) {}

export class ConfigError extends Schema.TaggedError<ConfigError>()('ConfigError', {
  message: Schema.String,
  field: Schema.optional(Schema.String),
}) {}

export class FileSystemError extends Schema.TaggedError<FileSystemError>()('FileSystemError', {
  message: Schema.String,
  path: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

export class ExecuteError extends Schema.TaggedError<ExecuteError>()('ExecuteError', {
  message: Schema.String,
  operation: Schema.optional(Schema.String),
  number: Schema.optional(Schema.Int),
  cause: Schema.optional(Schema.Unknown),
}) {}

export class ValidationError extends Schema.TaggedError<ValidationError>()('ValidationError', {
  message: Schema.String,
  field: Schema.optional(Schema.String),
  value: Schema.optional(Schema.Unknown),
}) {}
